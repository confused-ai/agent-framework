import { generateEntityId } from '../../core/index.js';

// ── CQRS Definitions ───────────────────────────────────────────────────────

export interface Command<T = unknown> {
    id: string;
    name: string;
    payload: T;
    timestamp: number;
}

export interface DomainEvent<T = unknown> {
    id: string;
    name: string;
    payload: T;
    timestamp: number;
}

// ── Command Handlers ───────────────────────────────────────────────────────

export interface CommandHandler<TCommand extends Command = Command> {
    readonly commandName: string;
    execute(command: TCommand): Promise<void> | void;
}

export class CommandBus {
    private handlers: Map<string, CommandHandler> = new Map();

    register(handler: CommandHandler): void {
        if (this.handlers.has(handler.commandName)) {
            throw new Error(`Command handler for '${handler.commandName}' is already registered.`);
        }
        this.handlers.set(handler.commandName, handler);
    }

    async dispatch<T>(commandName: string, payload: T): Promise<string> {
        const handler = this.handlers.get(commandName);
        if (!handler) {
            throw new Error(`No handler registered for command '${commandName}'.`);
        }

        const command: Command<T> = {
            id: generateEntityId(),
            name: commandName,
            payload,
            timestamp: Date.now()
        };

        await handler.execute(command);
        return command.id;
    }
}

// ── Event Handlers ─────────────────────────────────────────────────────────

export interface EventHandler<TEvent extends DomainEvent = DomainEvent> {
    readonly eventName: string;
    handle(event: TEvent): Promise<void> | void;
}

export class EventBus {
    private handlers: Map<string, Set<EventHandler>> = new Map();

    subscribe(handler: EventHandler): void {
        if (!this.handlers.has(handler.eventName)) {
            this.handlers.set(handler.eventName, new Set());
        }
        this.handlers.get(handler.eventName)!.add(handler);
    }

    async publish<T>(eventName: string, payload: T): Promise<string> {
        const event: DomainEvent<T> = {
            id: generateEntityId(),
            name: eventName,
            payload,
            timestamp: Date.now()
        };

        const eventHandlers = this.handlers.get(eventName) ?? new Set();
        if (eventHandlers.size === 0) {
            return event.id;
        }
        
        // Execute all handlers concurrently, but do not hide failures from callers.
        const results = await Promise.allSettled(
            Array.from(eventHandlers).map(handler => handler.handle(event))
        );

        const errors = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason);
        if (errors.length > 0) {
            throw new AggregateError(errors, `One or more handlers failed for event '${eventName}'.`);
        }

        return event.id;
    }
}

// ── Standard CQRS Commands & Events (Roadmap) ─────────────────────────────

export type StartWorkflowPayload = { workflowId: string; input: any };
export type ExecuteToolPayload = { toolName: string; input: any };
export type PauseWorkflowPayload = { workflowId: string; reason: string };

export type WorkflowStartedPayload = { workflowId: string; timestamp: number };
export type ToolExecutedPayload = { toolName: string; result: any };
export type WorkflowRecoveredPayload = { workflowId: string };
