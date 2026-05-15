import type { EventStore, WorkflowEvent } from '../execution/index.js';
import { generateEntityId } from '../core/index.js';
import type { RedisClientLike } from './session-store.js';

export interface RedisEventStoreConfig {
    /** Pre-connected redis v4 client. */
    readonly client: RedisClientLike;
    /** Key prefix. Default: `ca:wf:events:` */
    readonly keyPrefix?: string;
    /** Event TTL in seconds. Default: 604800 (7 days). */
    readonly ttlSeconds?: number;
}

const DEFAULT_PREFIX = 'ca:wf:events:';
const DEFAULT_TTL = 604_800; // 7 days

export class RedisEventStore implements EventStore {
    private readonly client: RedisClientLike;
    private readonly prefix: string;
    private readonly ttl: number;

    constructor(config: RedisEventStoreConfig) {
        this.client = config.client;
        this.prefix = config.keyPrefix ?? DEFAULT_PREFIX;
        this.ttl = config.ttlSeconds ?? DEFAULT_TTL;
    }

    private streamKey(workflowId: string): string {
        return `${this.prefix}${workflowId}`;
    }

    async append(workflowId: string, event: Omit<WorkflowEvent, 'id' | 'timestamp'>): Promise<WorkflowEvent> {
        const fullEvent: WorkflowEvent = {
            ...event,
            id: generateEntityId(),
            timestamp: Date.now(),
        };

        const key = this.streamKey(workflowId);
        await this.client.rPush(key, JSON.stringify(fullEvent));
        
        // Refresh TTL so it stays alive as long as it's active
        await this.client.expire(key, this.ttl);

        return fullEvent;
    }

    async getEvents(workflowId: string): Promise<WorkflowEvent[]> {
        const key = this.streamKey(workflowId);
        const rawEvents = await this.client.lRange(key, 0, -1);
        
        return rawEvents.flatMap((raw) => {
            try {
                return [JSON.parse(raw) as WorkflowEvent];
            } catch {
                return [];
            }
        });
    }

    /** Delete all events for a workflow (e.g. after completion to free Redis memory). */
    async deleteEvents(workflowId: string): Promise<void> {
        await this.client.del(this.streamKey(workflowId));
    }
}
