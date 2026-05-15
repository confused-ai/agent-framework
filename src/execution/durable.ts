import { generateEntityId } from '../core/index.js';

// ── Event Sourcing ──────────────────────────────────────────────────────────

export type WorkflowEventType =
    | 'WorkflowStarted'
    | 'StepStarted'
    | 'StepCompleted'
    | 'StepFailed'
    | 'WorkflowPaused'
    | 'WorkflowResumed'
    | 'WorkflowCompleted'
    | 'WorkflowFailed'
    | 'CheckpointCreated';

export interface WorkflowEvent {
    id: string;
    type: WorkflowEventType;
    workflowId: string;
    timestamp: number;
    payload?: any;
}

export interface EventStore {
    append(workflowId: string, event: Omit<WorkflowEvent, 'id' | 'timestamp'>): Promise<WorkflowEvent>;
    getEvents(workflowId: string): Promise<WorkflowEvent[]>;
    /** Optional: delete all events for a workflow (e.g. on completion to free storage). */
    deleteEvents?(workflowId: string): Promise<void>;
}

export class InMemoryEventStore implements EventStore {
    private streams: Map<string, WorkflowEvent[]> = new Map();

    async append(workflowId: string, event: Omit<WorkflowEvent, 'id' | 'timestamp'>): Promise<WorkflowEvent> {
        const fullEvent: WorkflowEvent = {
            ...event,
            id: generateEntityId(),
            timestamp: Date.now()
        };
        const stream = this.streams.get(workflowId) ?? [];
        stream.push(fullEvent);
        this.streams.set(workflowId, stream);
        return fullEvent;
    }

    async getEvents(workflowId: string): Promise<WorkflowEvent[]> {
        return this.streams.get(workflowId) ?? [];
    }

    async deleteEvents(workflowId: string): Promise<void> {
        this.streams.delete(workflowId);
    }
}

// ── Retry Policies ─────────────────────────────────────────────────────────

export interface DurableRetryPolicy {
    attempts: number;
    strategy: 'exponential' | 'linear' | 'fixed';
    backoffMs?: number;
    deadLetterQueue?: boolean;
}

// ── Durable Context ────────────────────────────────────────────────────────

export class DurableWorkflowContext {
    private stepResults: Map<string, any> = new Map();
    private currentEvents: WorkflowEvent[] = [];

    constructor(
        public readonly workflowId: string,
        private readonly eventStore: EventStore,
    ) {}

    /** Internal: hydrate context from event history for replay. */
    async loadHistory(): Promise<void> {
        this.currentEvents = await this.eventStore.getEvents(this.workflowId);
        for (const event of this.currentEvents) {
            if (event.type === 'StepCompleted') {
                this.stepResults.set(event.payload.stepId, event.payload.result);
            }
        }
    }

    /** Returns the number of events recorded for this workflow (useful for testing and observability). */
    async getEventCount(): Promise<number> {
        return (await this.eventStore.getEvents(this.workflowId)).length;
    }

    /** 
     * Durable Step Execution.
     * If the step was already completed in history, returns the cached result without re-executing.
     */
    async step<T>(stepId: string, fn: () => Promise<T>, retryPolicy?: DurableRetryPolicy): Promise<T> {
        // Check if we already have the result from a previous run
        if (this.stepResults.has(stepId)) {
            return this.stepResults.get(stepId) as T;
        }

        await this.eventStore.append(this.workflowId, {
            type: 'StepStarted',
            workflowId: this.workflowId,
            payload: { stepId }
        });

        let attempts = 0;
        const maxAttempts = retryPolicy?.attempts ?? 1;

        while (attempts < maxAttempts) {
            try {
                const result = await fn();
                await this.eventStore.append(this.workflowId, {
                    type: 'StepCompleted',
                    workflowId: this.workflowId,
                    payload: { stepId, result }
                });
                this.stepResults.set(stepId, result);
                return result;
            } catch (error) {
                attempts++;
                const errMessage = error instanceof Error ? error.message : String(error);
                await this.eventStore.append(this.workflowId, {
                    type: 'StepFailed',
                    workflowId: this.workflowId,
                    payload: { stepId, error: errMessage, attempt: attempts }
                });
                if (attempts >= maxAttempts) {
                    if (retryPolicy?.deadLetterQueue) {
                        // In a real system, we would publish to a DLQ here
                        console.warn(`[DLQ] Step ${stepId} failed permanently: ${errMessage}`);
                    }
                    throw error;
                }
                // Apply backoff strategy
                const delay = this.calculateBackoff(attempts, retryPolicy);
                if (delay > 0) {
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        // Unreachable: loop always returns or throws
        throw new Error('DurableWorkflowContext.step: unreachable');
    }

    private calculateBackoff(attempt: number, policy?: DurableRetryPolicy): number {
        if (!policy || !policy.backoffMs) return 0;
        if (policy.strategy === 'fixed') return policy.backoffMs;
        if (policy.strategy === 'linear') return policy.backoffMs * attempt;
        if (policy.strategy === 'exponential') return policy.backoffMs * Math.pow(2, attempt - 1);
        return 0;
    }

    /** Pause the workflow and wait for external input (e.g. human intervention). */
    async waitForHuman(reason: string = 'Waiting for human input'): Promise<never> {
        await this.eventStore.append(this.workflowId, {
            type: 'WorkflowPaused',
            workflowId: this.workflowId,
            payload: { reason }
        });
        throw new WorkflowPausedError(reason);
    }

    /** Explicitly create a savepoint. */
    async checkpoint(): Promise<void> {
        await this.eventStore.append(this.workflowId, {
            type: 'CheckpointCreated',
            workflowId: this.workflowId
        });
    }
}

// ── Errors ─────────────────────────────────────────────────────────────────

export class WorkflowPausedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WorkflowPausedError';
    }
}

export class WorkflowStateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WorkflowStateError';
    }
}

function getTerminalEvent(events: WorkflowEvent[]):
    | { status: 'completed'; event: WorkflowEvent }
    | { status: 'failed'; event: WorkflowEvent }
    | undefined {
    for (let index = events.length - 1; index >= 0; index--) {
        const event = events[index];
        if (!event) continue;
        if (event.type === 'WorkflowCompleted') return { status: 'completed', event };
        if (event.type === 'WorkflowFailed') return { status: 'failed', event };
    }
    return undefined;
}

function getLastLifecycleEvent(events: WorkflowEvent[]): WorkflowEvent | undefined {
    for (let index = events.length - 1; index >= 0; index--) {
        const event = events[index];
        if (!event) continue;
        if (
            event.type === 'WorkflowStarted'
            || event.type === 'WorkflowPaused'
            || event.type === 'WorkflowResumed'
            || event.type === 'WorkflowCompleted'
            || event.type === 'WorkflowFailed'
        ) {
            return event;
        }
    }
    return undefined;
}

// ── Durable Runtime ────────────────────────────────────────────────────────

export type WorkflowFunction<TInput, TOutput> = (ctx: DurableWorkflowContext, input: TInput) => Promise<TOutput>;

export class DurableRuntime {
    constructor(private readonly eventStore: EventStore = new InMemoryEventStore()) {}

    /**
     * Start or resume a workflow execution.
     */
    async execute<TInput, TOutput>(
        workflowId: string,
        workflowFn: WorkflowFunction<TInput, TOutput>,
        input: TInput
    ): Promise<TOutput | { status: 'paused'; reason: string }> {
        const events = await this.eventStore.getEvents(workflowId);
        const terminal = getTerminalEvent(events);
        if (terminal?.status === 'completed') {
            return terminal.event.payload?.result as TOutput;
        }
        if (terminal?.status === 'failed') {
            throw new WorkflowStateError(
                terminal.event.payload?.error
                    ? `Workflow '${workflowId}' has already failed: ${terminal.event.payload.error}`
                    : `Workflow '${workflowId}' has already failed.`,
            );
        }

        const ctx = new DurableWorkflowContext(workflowId, this.eventStore);
        
        // 1. Rehydrate state from Event Store
        await ctx.loadHistory();

        // 2. Start or Resume
        if (events.length === 0) {
            await this.eventStore.append(workflowId, {
                type: 'WorkflowStarted',
                workflowId,
                payload: { input }
            });
        } else {
            await this.eventStore.append(workflowId, {
                type: 'WorkflowResumed',
                workflowId
            });
        }

        try {
            // 3. Execute workflow function
            // Steps that are already in the event store will be skipped by the context
            const result = await workflowFn(ctx, input);

            await this.eventStore.append(workflowId, {
                type: 'WorkflowCompleted',
                workflowId,
                payload: { result }
            });

            return result;

        } catch (error) {
            if (error instanceof WorkflowPausedError) {
                return { status: 'paused', reason: error.message };
            }

            const errMessage = error instanceof Error ? error.message : String(error);
            await this.eventStore.append(workflowId, {
                type: 'WorkflowFailed',
                workflowId,
                payload: { error: errMessage }
            });
            throw error;
        }
    }

    /**
     * Resume a paused workflow by re-running it.
     */
    async resume<TInput, TOutput>(
        workflowId: string,
        workflowFn: WorkflowFunction<TInput, TOutput>,
        input: TInput
    ): Promise<TOutput | { status: 'paused'; reason: string }> {
        const events = await this.eventStore.getEvents(workflowId);
        if (events.length === 0) {
            throw new WorkflowStateError(`Workflow '${workflowId}' has not been started.`);
        }

        const terminal = getTerminalEvent(events);
        if (terminal?.status === 'completed') {
            throw new WorkflowStateError(`Workflow '${workflowId}' has already completed.`);
        }
        if (terminal?.status === 'failed') {
            throw new WorkflowStateError(`Workflow '${workflowId}' has already failed.`);
        }

        const lastLifecycleEvent = getLastLifecycleEvent(events);
        if (lastLifecycleEvent?.type !== 'WorkflowPaused') {
            throw new WorkflowStateError(
                `Workflow '${workflowId}' is not paused and cannot be resumed.`,
            );
        }

        return this.execute(workflowId, workflowFn, input);
    }

    /**
     * Full replay of a workflow (useful for auditing/debugging).
     * This simply returns the chronological events.
     */
    async replay(workflowId: string): Promise<WorkflowEvent[]> {
        return this.eventStore.getEvents(workflowId);
    }
}
