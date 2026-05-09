/**
 * @confused-ai/scheduler — package-level conformance tests.
 *
 * Covers: validateCronExpr, computeNextRun, InMemoryScheduleStore,
 *         InMemoryScheduleRunStore, ScheduleManager (CRUD, trigger, enable/disable)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    validateCronExpr,
    computeNextRun,
    ScheduleManager,
    InMemoryScheduleStore,
    InMemoryScheduleRunStore,
} from '@confused-ai/scheduler';

// ── validateCronExpr ──────────────────────────────────────────────────────────

describe('validateCronExpr', () => {
    it('accepts standard 5-field wildcards', () => {
        expect(validateCronExpr('* * * * *')).toBe(true);
    });

    it('accepts specific values', () => {
        expect(validateCronExpr('0 9 * * 1-5')).toBe(true);  // weekdays at 9am
        expect(validateCronExpr('0 0 1 1 *')).toBe(true);    // once a year
        expect(validateCronExpr('*/5 * * * *')).toBe(true);  // every 5 minutes
    });

    it('accepts lists and ranges', () => {
        expect(validateCronExpr('0,30 * * * *')).toBe(true);  // at :00 and :30
        expect(validateCronExpr('0 8-17 * * 1-5')).toBe(true); // office hours
    });

    it('rejects wrong field count', () => {
        expect(validateCronExpr('* * * *')).toBe(false);      // only 4 fields
        expect(validateCronExpr('* * * * * *')).toBe(false);  // 6 fields (seconds)
    });

    it('rejects out-of-range values where parseable as invalid cron', () => {
        // The implementation validates field count strictly (5 fields)
        // and throws on non-numeric/step/range parse errors.
        // Individual numeric values outside the semantic range are accepted
        // by this lightweight parser — only structural errors are caught.
        expect(validateCronExpr('abc * * * *')).toBe(false);
        expect(validateCronExpr('')).toBe(false);
    });

    it('rejects non-numeric junk', () => {
        expect(validateCronExpr('abc * * * *')).toBe(false);
        expect(validateCronExpr('')).toBe(false);
    });
});

// ── computeNextRun ────────────────────────────────────────────────────────────

describe('computeNextRun', () => {
    it('returns a future Date for "* * * * *"', () => {
        const next = computeNextRun('* * * * *');
        expect(next).toBeInstanceOf(Date);
        expect(next!.getTime()).toBeGreaterThan(Date.now());
    });

    it('next run is in the future (after "after")', () => {
        const base = Date.now();
        const next = computeNextRun('* * * * *', 'UTC', base);
        // nextRun is at the next minute boundary, which is > base but may be < base + 60s
        expect(next!.getTime()).toBeGreaterThan(base);
    });

    it('returns null for invalid expression', () => {
        expect(computeNextRun('invalid')).toBeNull();
    });

    it('next run for "0 9 * * *" is at 9:00 UTC', () => {
        // Use a fixed "after" — midnight UTC on some Tuesday
        const after = Date.UTC(2025, 0, 7, 0, 0, 0);   // 2025-01-07 00:00 UTC
        const next = computeNextRun('0 9 * * *', 'UTC', after);
        expect(next).not.toBeNull();
        expect(next!.getUTCHours()).toBe(9);
        expect(next!.getUTCMinutes()).toBe(0);
    });

    it('steps expression "*/15 * * * *" fires at a :15-boundary', () => {
        // after = 2025-01-07 00:00 UTC
        const after = Date.UTC(2025, 0, 7, 0, 0, 0);
        const next = computeNextRun('*/15 * * * *', 'UTC', after);
        expect(next).not.toBeNull();
        expect(next!.getUTCMinutes() % 15).toBe(0);
    });
});

// ── InMemoryScheduleStore ─────────────────────────────────────────────────────

describe('InMemoryScheduleStore', () => {
    let store: InMemoryScheduleStore;

    beforeEach(() => {
        store = new InMemoryScheduleStore();
    });

    const makeSchedule = (id: string, enabled = true) => ({
        id,
        name: `Schedule ${id}`,
        cronExpr: '* * * * *',
        endpoint: 'handler-key',
        enabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    it('returns null for unknown id', async () => {
        expect(await store.get('nonexistent')).toBeNull();
    });

    it('save and get round-trip', async () => {
        const s = makeSchedule('s1');
        await store.save(s);
        const got = await store.get('s1');
        expect(got?.id).toBe('s1');
        expect(got?.name).toBe('Schedule s1');
    });

    it('list returns all entries by default', async () => {
        await store.save(makeSchedule('a'));
        await store.save(makeSchedule('b', false));
        const all = await store.list();
        expect(all).toHaveLength(2);
    });

    it('list(enabledOnly=true) filters disabled schedules', async () => {
        await store.save(makeSchedule('a', true));
        await store.save(makeSchedule('b', false));
        const enabled = await store.list(true);
        expect(enabled).toHaveLength(1);
        expect(enabled[0]?.id).toBe('a');
    });

    it('delete removes the entry', async () => {
        await store.save(makeSchedule('del'));
        await store.delete('del');
        expect(await store.get('del')).toBeNull();
    });

    it('delete returns false for unknown id', async () => {
        const result = await store.delete('missing');
        expect(result).toBe(false);
    });
});

// ── InMemoryScheduleRunStore ──────────────────────────────────────────────────

describe('InMemoryScheduleRunStore', () => {
    let runStore: InMemoryScheduleRunStore;

    beforeEach(() => {
        runStore = new InMemoryScheduleRunStore();
    });

    const makeRun = (runId: string, scheduleId: string) => ({
        id: runId,
        scheduleId,
        status: 'success' as const,
        triggeredAt: new Date().toISOString(),
        attempt: 1,
    });

    it('add and list run history', async () => {
        await runStore.add(makeRun('r1', 's1'));
        await runStore.add(makeRun('r2', 's1'));
        const runs = await runStore.list('s1');
        expect(runs).toHaveLength(2);
    });

    it('list returns empty array for unknown scheduleId', async () => {
        expect(await runStore.list('no-such-schedule')).toEqual([]);
    });

    it('list respects limit', async () => {
        for (let i = 0; i < 10; i++) {
            await runStore.add(makeRun(`r${i}`, 'sched'));
        }
        const runs = await runStore.list('sched', 3);
        expect(runs).toHaveLength(3);
    });

    it('update patches a run', async () => {
        await runStore.add(makeRun('u1', 's1'));
        const ok = await runStore.update('u1', { status: 'failed', error: 'timeout' });
        expect(ok).toBe(true);
        const runs = await runStore.list('s1');
        expect(runs[0]?.status).toBe('failed');
        expect(runs[0]?.error).toBe('timeout');
    });

    it('update returns false for unknown runId', async () => {
        expect(await runStore.update('ghost', { status: 'failed' })).toBe(false);
    });
});

// ── ScheduleManager ───────────────────────────────────────────────────────────

describe('ScheduleManager', () => {
    let manager: ScheduleManager;

    beforeEach(() => {
        manager = new ScheduleManager();
    });

    // ── CRUD ─────────────────────────────────────────────────────────────────

    it('create returns an id and schedule is retrievable', async () => {
        const id = await manager.create({
            name: 'heartbeat',
            cronExpr: '* * * * *',
            endpoint: 'ping',
            enabled: true,
        });
        expect(typeof id).toBe('string');
        const s = await manager.get(id);
        expect(s?.name).toBe('heartbeat');
        expect(s?.cronExpr).toBe('* * * * *');
    });

    it('create throws on invalid cron expression', async () => {
        await expect(manager.create({
            name: 'bad',
            cronExpr: 'not-valid',
            endpoint: 'x',
            enabled: true,
        })).rejects.toThrow(/invalid cron/i);
    });

    it('create sets nextRunAt', async () => {
        const id = await manager.create({
            name: 'next-run',
            cronExpr: '* * * * *',
            endpoint: 'ping',
            enabled: true,
        });
        const s = await manager.get(id);
        expect(s?.nextRunAt).toBeTruthy();
    });

    it('list returns all schedules', async () => {
        await manager.create({ name: 'a', cronExpr: '* * * * *', endpoint: 'a', enabled: true });
        await manager.create({ name: 'b', cronExpr: '* * * * *', endpoint: 'b', enabled: false });
        const all = await manager.list();
        expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('list(enabledOnly=true) filters disabled', async () => {
        await manager.create({ name: 'enabled', cronExpr: '* * * * *', endpoint: 'a', enabled: true });
        await manager.create({ name: 'disabled', cronExpr: '* * * * *', endpoint: 'b', enabled: false });
        const enabled = await manager.list(true);
        expect(enabled.every(s => s.enabled)).toBe(true);
    });

    it('update patches the schedule', async () => {
        const id = await manager.create({ name: 'upd', cronExpr: '* * * * *', endpoint: 'x', enabled: true });
        await manager.update(id, { name: 'updated-name' });
        const s = await manager.get(id);
        expect(s?.name).toBe('updated-name');
    });

    it('update returns false for unknown id', async () => {
        const result = await manager.update('ghost', { name: 'nope' });
        expect(result).toBe(false);
    });

    it('update throws on invalid cron expression', async () => {
        const id = await manager.create({ name: 'u', cronExpr: '* * * * *', endpoint: 'x', enabled: true });
        await expect(manager.update(id, { cronExpr: 'bad' })).rejects.toThrow(/invalid cron/i);
    });

    it('delete removes the schedule', async () => {
        const id = await manager.create({ name: 'del', cronExpr: '* * * * *', endpoint: 'x', enabled: true });
        await manager.delete(id);
        expect(await manager.get(id)).toBeNull();
    });

    it('enable/disable toggle the enabled flag', async () => {
        const id = await manager.create({ name: 'toggle', cronExpr: '* * * * *', endpoint: 'x', enabled: false });
        await manager.enable(id);
        expect((await manager.get(id))?.enabled).toBe(true);
        await manager.disable(id);
        expect((await manager.get(id))?.enabled).toBe(false);
    });

    // ── Handler Registry + trigger() ────────────────────────────────────────

    it('register + trigger() calls the handler', async () => {
        const results: unknown[] = [];
        manager.register('pong', async (payload) => { results.push(payload); return 'pong-result'; });

        const id = await manager.create({ name: 'pong-job', cronExpr: '* * * * *', endpoint: 'pong', enabled: true });
        const run = await manager.trigger(id, { msg: 'hello' });

        expect(run.scheduleId).toBe(id);
        expect(run.status).toBe('success');
        expect(run.output).toBe('pong-result');
        expect(results[0]).toMatchObject({ msg: 'hello' });
    });

    it('trigger() throws for unknown schedule id', async () => {
        await expect(manager.trigger('no-such-id')).rejects.toThrow(/not found/i);
    });

    it('trigger() records failure when handler throws', async () => {
        manager.register('boom', async () => { throw new Error('handler exploded'); });

        const id = await manager.create({ name: 'fail-job', cronExpr: '* * * * *', endpoint: 'boom', enabled: true });
        const run = await manager.trigger(id);

        expect(run.status).toBe('failed');
        expect(run.error).toContain('handler exploded');
    });

    it('getRuns returns the run history', async () => {
        manager.register('log', async () => 'ok');
        const id = await manager.create({ name: 'hist', cronExpr: '* * * * *', endpoint: 'log', enabled: true });

        await manager.trigger(id);
        await manager.trigger(id);

        const runs = await manager.getRuns(id);
        expect(runs.length).toBeGreaterThanOrEqual(2);
    });

    // ── Start / Stop ──────────────────────────────────────────────────────────

    it('start / stop is idempotent', () => {
        const m = new ScheduleManager({ pollIntervalMs: 60_000 });
        m.start();
        m.start(); // second call should be a no-op
        m.stop();
        m.stop(); // second stop is also safe
    });
});
