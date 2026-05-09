/**
 * InMemoryBackgroundQueue — conformance tests.
 *
 * Covers: enqueue+consume, delay, retries, concurrency limiting,
 * pre-registration parking, close() drain, and queueHook() wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryBackgroundQueue } from '../src/queues/memory.js';
import { queueHook } from '../src/queue-hook.js';
import type { BackgroundTask } from '../src/types.js';

// ── helpers ───────────────────────────────────────────────────────────────

/** Waits until `predicate()` returns true or we time out. */
function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;
        const tick = () => {
            if (predicate()) { resolve(); return; }
            if (Date.now() > deadline) { reject(new Error('waitFor timed out')); return; }
            setTimeout(tick, 10);
        };
        tick();
    });
}

// ── basic enqueue + consume ────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — basic enqueue/consume', () => {
    it('delivers a task to a registered handler', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: BackgroundTask[] = [];

        await q.consume('greet', async (task) => { received.push(task); });
        await q.enqueue({ type: 'greet', payload: { name: 'world' } });

        await waitFor(() => received.length === 1);

        expect(received[0]?.type).toBe('greet');
        expect((received[0]?.payload as { name: string }).name).toBe('world');
        expect(received[0]?.id).toBeDefined();
        expect(typeof received[0]?.enqueuedAt).toBe('number');
        await q.close();
    });

    it('auto-generates a unique id for each task', async () => {
        const q = new InMemoryBackgroundQueue();
        const ids: string[] = [];

        await q.consume('ping', async (task) => { ids.push(task.id); });
        await q.enqueue({ type: 'ping', payload: null });
        await q.enqueue({ type: 'ping', payload: null });

        await waitFor(() => ids.length === 2);
        expect(ids[0]).not.toBe(ids[1]);
        await q.close();
    });

    it('attaches meta to the task envelope', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: BackgroundTask[] = [];

        await q.consume('evt', async (t) => { received.push(t); });
        await q.enqueue({
            type: 'evt',
            payload: 'x',
            meta: { agentId: 'agent-1', runId: 'run-42' },
        });

        await waitFor(() => received.length === 1);
        expect(received[0]?.meta?.agentId).toBe('agent-1');
        expect(received[0]?.meta?.runId).toBe('run-42');
        await q.close();
    });
});

// ── parking — tasks before handler ────────────────────────────────────────

describe('InMemoryBackgroundQueue — task parking', () => {
    it('delivers tasks enqueued before consume() is registered', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: string[] = [];

        // Enqueue first — no handler yet
        await q.enqueue({ type: 'late', payload: 'a' });
        await q.enqueue({ type: 'late', payload: 'b' });

        // Register handler afterwards → parked tasks should drain
        await q.consume('late', async (task) => {
            received.push(task.payload as string);
        });

        await waitFor(() => received.length === 2);
        expect(received.sort()).toEqual(['a', 'b']);
        await q.close();
    });
});

// ── delay ─────────────────────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — delay', () => {
    it('waits at least the requested delay before delivering', async () => {
        const q = new InMemoryBackgroundQueue();
        const timestamps: number[] = [];
        const enqueuedAt = Date.now();

        await q.consume('delayed', async () => { timestamps.push(Date.now()); });
        await q.enqueue({ type: 'delayed', payload: null }, { delay: 80 });

        await waitFor(() => timestamps.length === 1, 1000);
        expect(timestamps[0]! - enqueuedAt).toBeGreaterThanOrEqual(70);
        await q.close();
    });
});

// ── retry ─────────────────────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — retries', () => {
    it('retries a failing handler the specified number of times', async () => {
        const q = new InMemoryBackgroundQueue({ concurrency: 1 });
        let callCount = 0;

        await q.consume('flaky', async () => {
            callCount++;
            if (callCount < 3) throw new Error('transient');
        });

        await q.enqueue({ type: 'flaky', payload: null }, { retries: 2 });

        // 1 initial + 2 retries × ~1 s each → allow 4 s
        await waitFor(() => callCount >= 3, 4000);
        expect(callCount).toBe(3);
        await q.close();
    });
});

// ── concurrency ────────────────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — concurrency limiting', () => {
    it('never exceeds configured concurrency', async () => {
        const concurrency = 2;
        const q = new InMemoryBackgroundQueue({ concurrency });
        let active = 0;
        let maxObserved = 0;
        const completed: number[] = [];

        await q.consume('work', async () => {
            active++;
            maxObserved = Math.max(maxObserved, active);
            await new Promise<void>((r) => setTimeout(r, 40));
            completed.push(active);
            active--;
        });

        const tasks = 6;
        for (let i = 0; i < tasks; i++) {
            await q.enqueue({ type: 'work', payload: i });
        }

        await waitFor(() => completed.length === tasks, 3000);
        expect(maxObserved).toBeLessThanOrEqual(concurrency);
        await q.close();
    });
});

// ── close() ────────────────────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — close()', () => {
    it('ignores enqueues after close', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: unknown[] = [];
        await q.consume('msg', async (t) => { received.push(t); });

        await q.close();
        await q.enqueue({ type: 'msg', payload: 'after-close' });

        // Give a tick for any stray dispatch
        await new Promise<void>((r) => setTimeout(r, 100));
        expect(received).toHaveLength(0);
    });

    it('resolves without throwing', async () => {
        const q = new InMemoryBackgroundQueue();
        await expect(q.close()).resolves.toBeUndefined();
    });
});

// ── stop consumer ──────────────────────────────────────────────────────────

describe('InMemoryBackgroundQueue — stop consumer', () => {
    it('stop() returned by consume() de-registers the handler', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: unknown[] = [];

        const stop = await q.consume('stoppable', async (t) => { received.push(t); });
        await q.enqueue({ type: 'stoppable', payload: 1 });
        await waitFor(() => received.length === 1);

        await stop();

        // Enqueue after stop — should park (no handler), never dispatch
        await q.enqueue({ type: 'stoppable', payload: 2 });
        await new Promise<void>((r) => setTimeout(r, 100));
        expect(received).toHaveLength(1);
        await q.close();
    });
});

// ── queueHook ──────────────────────────────────────────────────────────────

describe('queueHook()', () => {
    it('enqueues a task with the extracted payload and returns void synchronously', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: { steps: number }[] = [];

        await q.consume('after-run', async (task) => {
            received.push(task.payload as { steps: number });
        });

        const hook = queueHook(
            q,
            'after-run',
            (steps: number) => ({ steps }),
        );

        const result = hook(5);
        expect(result).toBeUndefined(); // synchronous void

        await waitFor(() => received.length === 1);
        expect(received[0]?.steps).toBe(5);
        await q.close();
    });

    it('does not throw when the payload extractor throws', () => {
        const q = new InMemoryBackgroundQueue();
        const hook = queueHook(q, 'boom', () => { throw new Error('kaboom'); });
        expect(() => hook()).not.toThrow();
    });

    it('passes meta to the task envelope', async () => {
        const q = new InMemoryBackgroundQueue();
        const received: BackgroundTask[] = [];

        await q.consume('traced', async (t) => { received.push(t); });

        const hook = queueHook(
            q,
            'traced',
            () => 'payload',
            undefined,
            { agentId: 'a1', traceId: 't42' },
        );
        hook();

        await waitFor(() => received.length === 1);
        expect(received[0]?.meta?.agentId).toBe('a1');
        expect(received[0]?.meta?.traceId).toBe('t42');
        await q.close();
    });

    it('queue name is "in-memory"', () => {
        const q = new InMemoryBackgroundQueue();
        expect(q.name).toBe('in-memory');
    });
});
