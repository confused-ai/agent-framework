import { describe, expect, it } from 'vitest';

import {
    DurableRuntime,
    InMemoryEventStore,
    WorkflowStateError,
} from '../src/index.js';
import { EventBus } from '../src/orchestration/core/cqrs.js';

describe('DurableRuntime', () => {
    it('reuses completed workflow result instead of re-running side effects', async () => {
        const runtime = new DurableRuntime(new InMemoryEventStore());
        let runs = 0;

        const workflow = async () => {
            runs++;
            return 'done';
        };

        const first = await runtime.execute('workflow-complete', workflow, {});
        const second = await runtime.execute('workflow-complete', workflow, {});

        expect(first).toBe('done');
        expect(second).toBe('done');
        expect(runs).toBe(1);
    });

    it('resumes only paused workflows and replays completed steps', async () => {
        const runtime = new DurableRuntime(new InMemoryEventStore());
        let stepRuns = 0;

        const workflow = async (ctx: any, input: { pause: boolean }) => {
            const value = await ctx.step('only-once', async () => {
                stepRuns++;
                return 'checkpointed';
            });

            if (input.pause) {
                await ctx.waitForHuman('approval needed');
            }

            return `${value}:done`;
        };

        const paused = await runtime.execute('workflow-paused', workflow, { pause: true });
        const resumed = await runtime.resume('workflow-paused', workflow, { pause: false });

        expect(paused).toEqual({ status: 'paused', reason: 'approval needed' });
        expect(resumed).toBe('checkpointed:done');
        expect(stepRuns).toBe(1);
    });

    it('rejects resume for terminal workflows', async () => {
        const runtime = new DurableRuntime(new InMemoryEventStore());

        await runtime.execute('workflow-terminal', async () => 'done', {});

        await expect(
            runtime.resume('workflow-terminal', async () => 'other', {}),
        ).rejects.toBeInstanceOf(WorkflowStateError);
    });
});

describe('CQRS EventBus', () => {
    it('surfaces handler failures after all handlers run', async () => {
        const bus = new EventBus();
        const calls: string[] = [];

        bus.subscribe({
            eventName: 'demo',
            handle: async () => {
                calls.push('ok');
            },
        });

        bus.subscribe({
            eventName: 'demo',
            handle: async () => {
                calls.push('boom');
                throw new Error('handler failed');
            },
        });

        await expect(bus.publish('demo', { value: 1 })).rejects.toBeInstanceOf(AggregateError);
        expect(calls.sort()).toEqual(['boom', 'ok']);
    });

    it('returns an event id when no handlers are registered', async () => {
        const bus = new EventBus();
        const eventId = await bus.publish('unhandled', { value: 1 });

        expect(typeof eventId).toBe('string');
        expect(eventId.length).toBeGreaterThan(0);
    });
});