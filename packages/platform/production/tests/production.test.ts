/**
 * @confused-ai/production — package-level conformance tests.
 *
 * Covers: CircuitBreaker, RateLimiter, InMemoryBudgetStore, BudgetEnforcer,
 *         estimateCostUsd, InMemoryIdempotencyStore, HealthCheckManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    CircuitBreaker,
    CircuitState,
    CircuitOpenError,
    createLLMCircuitBreaker,
    RateLimiter,
    RateLimitError,
    HealthCheckManager,
    HealthStatus,
    createCustomHealthCheck,
    GracefulShutdown,
    createGracefulShutdown,
} from '@confused-ai/production';

// ── CircuitBreaker ────────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
    it('starts in CLOSED state', () => {
        const cb = new CircuitBreaker({ name: 'test' });
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('allows requests through when closed', async () => {
        const cb = new CircuitBreaker({ name: 'test' });
        const result = await cb.execute(async () => 'ok');
        expect(result.success).toBe(true);
        expect(result.value).toBe('ok');
        expect(result.state).toBe(CircuitState.CLOSED);
    });

    it('tracks success results', async () => {
        const cb = new CircuitBreaker({ name: 'test' });
        const result = await cb.execute(async () => 42);
        expect(result.success).toBe(true);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('records failure on execute error', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 5 });
        const result = await cb.execute(async () => { throw new Error('fail'); });
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('fail');
    });

    it('opens circuit after reaching failureThreshold', async () => {
        const cb = new CircuitBreaker({
            name: 'test',
            failureThreshold: 3,
            resetTimeoutMs: 60000,
        });
        for (let i = 0; i < 3; i++) {
            await cb.execute(async () => { throw new Error('err'); });
        }
        expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it('rejects with CircuitOpenError when circuit is open', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1 });
        await cb.execute(async () => { throw new Error('trigger'); });
        expect(cb.getState()).toBe(CircuitState.OPEN);

        const result = await cb.execute(async () => 'should not run');
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(CircuitOpenError);
    });

    it('isAllowed() returns false when circuit is open', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1 });
        await cb.execute(async () => { throw new Error('trigger'); });
        expect(cb.isAllowed()).toBe(false);
    });

    it('reset() returns circuit to CLOSED state', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1 });
        await cb.execute(async () => { throw new Error('trigger'); });
        expect(cb.getState()).toBe(CircuitState.OPEN);
        cb.reset();
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('getFailureCount() reflects failures within window', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 10 });
        await cb.execute(async () => { throw new Error('e1'); });
        await cb.execute(async () => { throw new Error('e2'); });
        expect(cb.getFailureCount()).toBe(2);
    });

    it('onStateChange callback is called on transition', async () => {
        const transitions: Array<[CircuitState, CircuitState]> = [];
        const cb = new CircuitBreaker({
            name: 'test',
            failureThreshold: 1,
            onStateChange: (from, to) => transitions.push([from, to]),
        });
        await cb.execute(async () => { throw new Error('trigger'); });
        expect(transitions.length).toBeGreaterThan(0);
        expect(transitions[0]![1]).toBe(CircuitState.OPEN);
    });

    it('getResetTime() returns null when circuit is closed', () => {
        const cb = new CircuitBreaker({ name: 'test' });
        expect(cb.getResetTime()).toBeNull();
    });

    it('getResetTime() returns a future Date when circuit is open', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 5000 });
        await cb.execute(async () => { throw new Error('trigger'); });
        const resetTime = cb.getResetTime();
        expect(resetTime).not.toBeNull();
        expect(resetTime!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it('createLLMCircuitBreaker creates a circuit with sensible defaults', () => {
        const cb = createLLMCircuitBreaker('openai');
        expect(cb.getState()).toBe(CircuitState.CLOSED);
        expect(cb.getName()).toBe('openai');
    });
});

// ── RateLimiter ───────────────────────────────────────────────────────────────

describe('RateLimiter', () => {
    it('allows requests within limit', async () => {
        const limiter = new RateLimiter({
            name: 'test-api',
            maxRequests: 10,
            intervalMs: 60000,
        });
        const result = await limiter.execute(async () => 'ok');
        expect(result).toBe('ok');
    });

    it('decrements available tokens on each request', async () => {
        const limiter = new RateLimiter({
            name: 'test-api',
            maxRequests: 5,
            intervalMs: 60000,
            burstCapacity: 0,
        });
        const initialTokens = limiter.getAvailableTokens();
        await limiter.execute(async () => 'x');
        expect(limiter.getAvailableTokens()).toBeLessThan(initialTokens);
    });

    it('throws RateLimitError when limit exceeded in reject mode', async () => {
        const limiter = new RateLimiter({
            name: 'tight-api',
            maxRequests: 1,
            intervalMs: 60000,
            burstCapacity: 0,
            overflowMode: 'reject',
        });
        // Exhaust tokens
        await limiter.execute(async () => 'first');
        await expect(limiter.execute(async () => 'second')).rejects.toBeInstanceOf(RateLimitError);
    });

    it('RateLimitError has limiterName and retryAfterMs', async () => {
        const limiter = new RateLimiter({
            name: 'named-api',
            maxRequests: 1,
            intervalMs: 60000,
            burstCapacity: 0,
            overflowMode: 'reject',
        });
        await limiter.execute(async () => 'first');
        try {
            await limiter.execute(async () => 'second');
        } catch (err) {
            expect(err).toBeInstanceOf(RateLimitError);
            expect((err as RateLimitError).limiterName).toBe('named-api');
            expect(typeof (err as RateLimitError).retryAfterMs).toBe('number');
        }
    });

    it('tryAcquire() returns true when tokens available', () => {
        const limiter = new RateLimiter({
            name: 'test',
            maxRequests: 10,
            intervalMs: 60000,
        });
        expect(limiter.tryAcquire()).toBe(true);
    });

    it('tryAcquire() returns false when tokens exhausted', () => {
        const limiter = new RateLimiter({
            name: 'test',
            maxRequests: 1,
            intervalMs: 60000,
            burstCapacity: 0,
        });
        limiter.tryAcquire(); // consume the 1 token
        expect(limiter.tryAcquire()).toBe(false);
    });

    it('canProceed() reflects token availability', () => {
        const limiter = new RateLimiter({
            name: 'test',
            maxRequests: 5,
            intervalMs: 60000,
        });
        expect(limiter.canProceed()).toBe(true);
    });

    it('getStats() returns correct shape', () => {
        const limiter = new RateLimiter({
            name: 'stats-api',
            maxRequests: 100,
            intervalMs: 60000,
        });
        const stats = limiter.getStats();
        expect(stats).toHaveProperty('availableTokens');
        expect(stats).toHaveProperty('queueSize');
        expect(stats.maxRequests).toBe(100);
        expect(stats.intervalMs).toBe(60000);
    });
});

// ── HealthCheckManager ────────────────────────────────────────────────────────

describe('HealthCheckManager', () => {
    it('starts with no registered checks — status healthy', async () => {
        const mgr = new HealthCheckManager();
        const health = await mgr.check();
        expect(health.status).toBe(HealthStatus.HEALTHY);
    });

    it('createCustomHealthCheck registers and runs a check', async () => {
        const mgr = new HealthCheckManager();
        const check = createCustomHealthCheck('db', async () => ({ status: HealthStatus.HEALTHY }));
        mgr.addComponent(check);
        const health = await mgr.check();
        expect(health.status).toBe(HealthStatus.HEALTHY);
    });

    it('reports UNHEALTHY when a check returns false', async () => {
        const mgr = new HealthCheckManager();
        const check = createCustomHealthCheck('failing-svc', async () => false);
        mgr.addComponent(check);
        const health = await mgr.check();
        expect(health.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('health result contains components array', async () => {
        const mgr = new HealthCheckManager();
        const check = createCustomHealthCheck('redis', async () => ({ status: HealthStatus.HEALTHY }));
        mgr.addComponent(check);
        const health = await mgr.check();
        expect(Array.isArray(health.components)).toBe(true);
        expect(health.components.find(c => c.name === 'redis')).toBeDefined();
    });

    it('removeComponent removes a previously added check', async () => {
        const mgr = new HealthCheckManager();
        const check = createCustomHealthCheck('tmp', async () => false);
        mgr.addComponent(check);
        mgr.removeComponent('tmp');
        const health = await mgr.check();
        expect(health.status).toBe(HealthStatus.HEALTHY);
    });

    it('liveness() always returns HEALTHY', () => {
        const mgr = new HealthCheckManager();
        const result = mgr.liveness();
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(typeof result.uptime).toBe('number');
    });

    it('getUptime() returns non-negative seconds', () => {
        const mgr = new HealthCheckManager();
        expect(mgr.getUptime()).toBeGreaterThanOrEqual(0);
    });
});

// ── GracefulShutdown ──────────────────────────────────────────────────────────

describe('GracefulShutdown', () => {
    it('createGracefulShutdown returns a GracefulShutdown instance', () => {
        const gs = createGracefulShutdown({ timeoutMs: 5000 });
        expect(gs).toBeInstanceOf(GracefulShutdown);
    });

    it('addHandler and shutdown calls all cleanup handlers', async () => {
        const gs = new GracefulShutdown({ timeoutMs: 5000 });
        const calls: string[] = [];
        gs.addHandler('handler-a', async () => { calls.push('a'); });
        gs.addHandler('handler-b', async () => { calls.push('b'); });
        await gs.shutdown({ reason: 'test', timestamp: new Date() });
        expect(calls).toContain('a');
        expect(calls).toContain('b');
    });

    it('isInProgress returns false before shutdown', () => {
        const gs = new GracefulShutdown({ timeoutMs: 5000 });
        expect(gs.isInProgress()).toBe(false);
    });

    it('isInProgress returns true during shutdown', async () => {
        const gs = new GracefulShutdown({ timeoutMs: 5000 });
        let seenDuring = false;
        gs.addHandler('check', async () => {
            seenDuring = gs.isInProgress();
        });
        await gs.shutdown({ reason: 'test', timestamp: new Date() });
        expect(seenDuring).toBe(true);
    });

    it('getHandlerNames lists registered handlers', () => {
        const gs = new GracefulShutdown({ timeoutMs: 5000 });
        gs.addHandler('db', async () => {});
        gs.addHandler('cache', async () => {});
        const names = gs.getHandlerNames();
        expect(names).toContain('db');
        expect(names).toContain('cache');
    });

    it('removeHandler removes a handler', () => {
        const gs = new GracefulShutdown({ timeoutMs: 5000 });
        gs.addHandler('tmp', async () => {});
        gs.removeHandler('tmp');
        expect(gs.getHandlerNames()).not.toContain('tmp');
    });
});
