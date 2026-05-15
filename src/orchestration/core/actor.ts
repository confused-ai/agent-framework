import { generateEntityId } from '../../core/index.js';

// ── Actor Messages ─────────────────────────────────────────────────────────

export type ActorMessageType = 'task' | 'event' | 'response' | 'error';

export interface ActorMessage<T = unknown> {
    id: string;
    from: string;
    to: string;
    type: ActorMessageType;
    payload: T;
    replyToId?: string;
    timestamp: number;
}

// ── Actor System (Directory & Router) ──────────────────────────────────────

export class ActorSystem {
    private actors: Map<string, Actor> = new Map();

    /** Register an actor in the system. */
    register(actor: Actor): void {
        this.actors.set(actor.name, actor);
        actor.setSystem(this);
    }

    /** Remove an actor from the system. */
    deregister(name: string): void {
        this.actors.delete(name);
    }

    /** Retrieve an actor by name. */
    get(name: string): Actor | undefined {
        return this.actors.get(name);
    }

    /** Send a message to a specific actor. */
    send(to: string, message: Omit<ActorMessage, 'id' | 'timestamp' | 'to'>): void {
        const target = this.actors.get(to);
        if (!target) {
            console.warn(`[ActorSystem] Actor '${to}' not found. Message dropped.`);
            return;
        }

        const fullMessage: ActorMessage = {
            ...message,
            to,
            id: generateEntityId(),
            timestamp: Date.now()
        };

        target.receive(fullMessage);
    }

    /** Broadcast an event to all actors in the system. */
    broadcast(from: string, eventName: string, payload: any): void {
        const fullMessage: ActorMessage = {
            id: generateEntityId(),
            from,
            to: '*',
            type: 'event',
            payload: { eventName, data: payload },
            timestamp: Date.now()
        };

        for (const [name, actor] of this.actors.entries()) {
            if (name !== from) {
                actor.receive(fullMessage);
            }
        }
    }
}

// ── Actor Base Class ───────────────────────────────────────────────────────

export interface ActorConfig {
    name: string;
    tools?: any[]; // ToolRegistry
    memory?: any;  // MemoryProvider
}

export abstract class Actor {
    public readonly id: string;
    public readonly name: string;
    
    // Core Actor Components
    protected system?: ActorSystem;
    protected mailbox: ActorMessage[] = [];
    protected state: Record<string, any> = {};
    protected tools: any[];
    protected memory: any;

    private isProcessing = false;

    constructor(config: ActorConfig) {
        this.id = generateEntityId();
        this.name = config.name;
        this.tools = config.tools ?? [];
        this.memory = config.memory;
    }

    /** Bind to an ActorSystem. Called automatically by system.register(). */
    setSystem(system: ActorSystem): void {
        this.system = system;
    }

    /** Enqueue a message into the Mailbox. */
    receive(message: ActorMessage): void {
        this.mailbox.push(message);
        this.processMailbox().catch(err => {
            console.error(`[Actor ${this.name}] Mailbox processing error:`, err);
        });
    }

    /** Process messages one by one (Ensures sequential state updates). */
    private async processMailbox(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.mailbox.length > 0) {
            const message = this.mailbox.shift()!;
            try {
                await this.onReceive(message);
            } catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                if (message.type === 'task' && this.system) {
                    this.system.send(message.from, {
                        from: this.name,
                        type: 'error',
                        payload: { error: errMessage, originalMessage: message },
                        replyToId: message.id
                    });
                }
            }
        }

        this.isProcessing = false;
    }

    /** Abstract method to be implemented by concrete Actors (e.g., AI Agent). */
    protected abstract onReceive(message: ActorMessage): Promise<void>;

    // ── Communication Helpers ────────────────────────────────────────────────

    /** Send a message to another actor in the same system. */
    protected send(to: string, payload: any, type: ActorMessageType = 'task', replyToId?: string): void {
        if (!this.system) throw new Error(`Actor ${this.name} is not registered in an ActorSystem.`);
        this.system.send(to, {
            from: this.name,
            type,
            payload,
            replyToId
        });
    }

    /** Broadcast an event to all other actors in the system. */
    protected broadcast(eventName: string, payload: any): void {
        if (!this.system) throw new Error(`Actor ${this.name} is not registered in an ActorSystem.`);
        this.system.broadcast(this.name, eventName, payload);
    }
}
