/**
 * Lightweight Finite State Machine for Agent Workflows.
 * 
 * Provides a clean API for modeling agent lifecycle states
 * (idle -> planning -> executing -> completed)
 */

export type AgentLifecycleState =
    | 'idle'
    | 'planning'
    | 'executing'
    | 'waiting_human'
    | 'retrying'
    | 'completed'
    | 'failed'
    | 'paused';

/**
 * Serializable snapshot of an `AgentStateMachine` — use with `getSnapshot()` / `fromSnapshot()`.
 */
export interface StateMachineSnapshot<TContext> {
    /** The active lifecycle state at time of snapshot. */
    state: AgentLifecycleState;
    /** Deep-cloned context at time of snapshot. */
    context: TContext;
    /** Whether initial state entry has already run. */
    started?: boolean;
    /** Unix timestamp (ms) when the snapshot was taken. */
    timestamp: number;
}

export interface StateHandler<TContext, TEvent> {
    /** Logic to execute when entering this state */
    onEntry?: (ctx: TContext, event?: TEvent) => void | Promise<void>;
    /** Logic to execute when leaving this state */
    onExit?: (ctx: TContext, event?: TEvent) => void | Promise<void>;
    /** State transitions: maps event type strings to next lifecycle states. */
    transitions?: Partial<Record<string, AgentLifecycleState>>;
}

export type StateMachineConfig<TContext, TEvent> = {
    [K in AgentLifecycleState]?: StateHandler<TContext, TEvent>;
};

export interface StateMachineOptions<TContext> {
    initial: AgentLifecycleState;
    context: TContext;
}

export class AgentStateMachine<TContext, TEvent extends { type: string }> {
    public currentState: AgentLifecycleState;
    public context: TContext;
    private states: StateMachineConfig<TContext, TEvent>;
    private started = false;

    constructor(
        states: StateMachineConfig<TContext, TEvent>,
        options: StateMachineOptions<TContext>
    ) {
        this.states = states;
        this.currentState = options.initial;
        this.context = options.context;
    }

    /** Initialize the state machine by firing the initial state's onEntry */
    async start(): Promise<void> {
        if (this.started) return;
        const stateDef = this.states[this.currentState];
        if (stateDef?.onEntry) {
            await stateDef.onEntry(this.context);
        }
        this.started = true;
    }

    /**
     * Send an event to the state machine to trigger a transition.
     * Returns true if a transition occurred.
     */
    async send(event: TEvent): Promise<boolean> {
        const fromState = this.currentState;
        const stateDef = this.states[fromState];
        if (!stateDef?.transitions) return false;

        const nextState = stateDef.transitions[event.type];
        if (!nextState) return false;

        // 1. Exit current state
        if (stateDef.onExit) {
            await stateDef.onExit(this.context, event);
        }

        // 2. Enter new state
        const nextDef = this.states[nextState];
        if (nextDef?.onEntry) {
            await nextDef.onEntry(this.context, event);
        }

        this.currentState = nextState;

        return true;
    }

    /**
     * Forcefully jump to a state without an event, triggering exit/entry handlers.
     */
    async jumpTo(state: AgentLifecycleState): Promise<void> {
        const fromState = this.currentState;
        const stateDef = this.states[fromState];
        if (stateDef?.onExit) {
            await stateDef.onExit(this.context);
        }

        const nextDef = this.states[state];
        if (nextDef?.onEntry) {
            await nextDef.onEntry(this.context);
        }

        this.currentState = state;
    }

    /**
     * Capture a serializable snapshot of the current state and context.
     * Use with `AgentStateMachine.fromSnapshot()` to restore after a restart.
     */
    getSnapshot(): StateMachineSnapshot<TContext> {
        return {
            state: this.currentState,
            context: structuredClone(this.context),
            started: this.started,
            timestamp: Date.now(),
        };
    }

    /**
     * Restore an `AgentStateMachine` from a previously captured snapshot.
     *
     * @example
     * ```ts
     * const snap = sm.getSnapshot();
     * // ... persist snap to DB ...
     * const restored = AgentStateMachine.fromSnapshot(states, snap);
     * ```
     */
    static fromSnapshot<TCtx, TEvt extends { type: string }>(
        states: StateMachineConfig<TCtx, TEvt>,
        snapshot: StateMachineSnapshot<TCtx>
    ): AgentStateMachine<TCtx, TEvt> {
        const machine = new AgentStateMachine(states, {
            initial: snapshot.state,
            context: structuredClone(snapshot.context),
        });
        machine.started = snapshot.started ?? true;
        return machine;
    }
}

/**
 * Helper to create a new AgentStateMachine.
 * 
 * @example
 * ```ts
 * const sm = stateMachine({
 *   idle: {
 *     transitions: { START: 'planning' }
 *   },
 *   planning: {
 *     onEntry: async (ctx) => { ctx.plan = await makePlan(); },
 *     transitions: { DONE: 'executing' }
 *   },
 *   executing: {
 *     transitions: { SUCCESS: 'completed', ERROR: 'retrying' }
 *   },
 *   completed: {}
 * }, { initial: 'idle', context: {} });
 * ```
 */
export function stateMachine<TContext, TEvent extends { type: string }>(
    states: StateMachineConfig<TContext, TEvent>,
    options: StateMachineOptions<TContext>
): AgentStateMachine<TContext, TEvent> {
    return new AgentStateMachine(states, options);
}
