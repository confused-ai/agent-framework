/**
 * @confused-ai/orchestration — package-level conformance tests.
 *
 * Covers: AgentEventBus, generateTraceparent, extractTraceContext,
 *         injectTraceHeaders, defineRole (system prompt generation),
 *         MessageBusImpl, OrchestratorImpl (register + delegate)
 */

import { describe, it, expect, vi } from 'vitest';
import {
    createAgentEventBus,
    AgentEventBusTimeoutError,
    generateTraceparent,
    extractTraceContext,
    injectTraceHeaders,
    defineRole,
    buildSystemPrompt,
    MessageBusImpl,
    OrchestratorImpl,
} from '@confused-ai/orchestration';
import type { EventMap } from '@confused-ai/orchestration';

// ── AgentEventBus ─────────────────────────────────────────────────────────────

type TestEvents = {
    'task:assigned': { taskId: string; agentId: string };
    'task:done': { taskId: string; result: string };
    'error': { agentId: string; message: string };
};

describe('AgentEventBus', () => {
    it('emits and receives a typed event', async () => {
        const bus = createAgentEventBus<TestEvents>();
        const received: TestEvents['task:done'][] = [];

        bus.on('task:done', (payload) => { received.push(payload); });
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });

        expect(received).toHaveLength(1);
        expect(received[0]?.taskId).toBe('t1');
        expect(received[0]?.result).toBe('ok');
    });

    it('wildcard handler receives all events', async () => {
        const bus = createAgentEventBus<TestEvents>();
        const seen: string[] = [];

        bus.on('*', (event) => { seen.push(event); });
        await bus.emit('task:assigned', { taskId: 't1', agentId: 'a1' });
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });

        expect(seen).toEqual(['task:assigned', 'task:done']);
    });

    it('once() handler fires only on first emission', async () => {
        const bus = createAgentEventBus<TestEvents>();
        let count = 0;

        bus.once('task:done', () => { count++; });
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });
        await bus.emit('task:done', { taskId: 't2', result: 'ok' });

        expect(count).toBe(1);
    });

    it('unsubscribe removes the handler', async () => {
        const bus = createAgentEventBus<TestEvents>();
        let count = 0;

        const sub = bus.on('task:done', () => { count++; });
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });
        sub.unsubscribe();
        await bus.emit('task:done', { taskId: 't2', result: 'ok' });

        expect(count).toBe(1);
    });

    it('off() removes all handlers for an event', async () => {
        const bus = createAgentEventBus<TestEvents>();
        let count = 0;

        bus.on('task:done', () => { count++; });
        bus.off('task:done');
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });

        expect(count).toBe(0);
    });

    it('waitFor resolves when the event fires', async () => {
        const bus = createAgentEventBus<TestEvents>();

        const promise = bus.waitFor('task:done', 1000);
        await bus.emit('task:done', { taskId: 'w1', result: 'resolved' });

        const result = await promise;
        expect(result.taskId).toBe('w1');
    });

    it('waitFor rejects with AgentEventBusTimeoutError on timeout', async () => {
        const bus = createAgentEventBus<TestEvents>();

        await expect(bus.waitFor('task:done', 20)).rejects.toBeInstanceOf(AgentEventBusTimeoutError);
    });

    it('metrics track emitted counts', async () => {
        const bus = createAgentEventBus<TestEvents>();

        await bus.emit('task:done', { taskId: 't1', result: 'ok' });
        await bus.emit('task:done', { taskId: 't2', result: 'ok' });
        await bus.emit('error', { agentId: 'a1', message: 'oops' });

        const m = bus.metrics();
        expect(m.emitted['task:done']).toBe(2);
        expect(m.emitted['error']).toBe(1);
    });

    it('replay buffer delivers past events to late subscribers', async () => {
        const bus = createAgentEventBus<TestEvents>({ replayBufferSize: 10 });

        await bus.emit('task:done', { taskId: 'old', result: 'buffered' });

        const received: TestEvents['task:done'][] = [];
        bus.on('task:done', (p) => { received.push(p); });

        expect(received).toHaveLength(1);
        expect(received[0]?.taskId).toBe('old');
    });

    it('clearBuffer empties the replay buffer', async () => {
        const bus = createAgentEventBus<TestEvents>({ replayBufferSize: 10 });

        await bus.emit('task:done', { taskId: 'old', result: 'buffered' });
        bus.clearBuffer();

        const received: TestEvents['task:done'][] = [];
        bus.on('task:done', (p) => { received.push(p); });

        expect(received).toHaveLength(0);
    });

    it('error in handler calls onHandlerError and continues', async () => {
        const errors: string[] = [];
        const bus = createAgentEventBus<TestEvents>({
            onHandlerError: (event) => { errors.push(event); },
        });

        bus.on('task:done', () => { throw new Error('boom'); });
        await bus.emit('task:done', { taskId: 't1', result: 'ok' });

        expect(errors).toContain('task:done');
    });
});

// ── W3C Trace Context ─────────────────────────────────────────────────────────

describe('generateTraceparent', () => {
    it('returns a TraceContext with a valid traceparent string', () => {
        const ctx = generateTraceparent();
        expect(ctx.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
        expect(ctx.traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(ctx.spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('returns unique contexts on each call', () => {
        const a = generateTraceparent();
        const b = generateTraceparent();
        expect(a.traceparent).not.toBe(b.traceparent);
    });
});

describe('extractTraceContext', () => {
    it('parses valid traceparent from headers object', () => {
        const traceId = 'a'.repeat(32);
        const spanId = 'b'.repeat(16);
        const headers = { traceparent: `00-${traceId}-${spanId}-01` };

        const ctx = extractTraceContext(headers);
        expect(ctx.traceId).toBe(traceId);
        expect(ctx.spanId).toBe(spanId);
        expect(ctx.traceFlags).toBe('01');
    });

    it('generates a fresh context for missing traceparent', () => {
        const ctx = extractTraceContext({});
        // Always returns a valid context (never null)
        expect(ctx.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    it('generates a fresh context for malformed traceparent', () => {
        const ctx = extractTraceContext({ traceparent: 'invalid' });
        expect(ctx.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });
});

describe('injectTraceHeaders', () => {
    it('adds traceparent to a headers object', () => {
        const ctx = generateTraceparent();
        const headers = injectTraceHeaders({}, ctx);
        expect(typeof headers['traceparent']).toBe('string');
    });

    it('adds tracestate when present', () => {
        const ctx = { ...generateTraceparent(), tracestate: 'vendor=val' };
        const headers = injectTraceHeaders({}, ctx);
        expect(headers['tracestate']).toBe('vendor=val');
    });
});

// ── defineRole / buildSystemPrompt ────────────────────────────────────────────

describe('buildSystemPrompt', () => {
    it('contains role, backstory, and goal', () => {
        const prompt = buildSystemPrompt({
            role: 'Senior Analyst',
            backstory: 'Expert in data analysis.',
            goal: 'Find insights in Q3 data.',
        });
        expect(prompt).toContain('Senior Analyst');
        expect(prompt).toContain('Expert in data analysis.');
        expect(prompt).toContain('Find insights in Q3 data.');
    });
});

describe('defineRole', () => {
    it('returns an agent with name and systemPrompt properties', () => {
        const agent = defineRole({
            role: 'Researcher',
            backstory: 'Expert researcher with 10 years experience.',
            goal: 'Research AI trends.',
        });
        expect(agent.name).toBe('Researcher');
        expect(agent.systemPrompt).toContain('Researcher');
        expect(agent.systemPrompt).toContain('Expert researcher');
    });

    it('run() throws if no llm is provided', () => {
        const agent = defineRole({
            role: 'No-LLM',
            backstory: 'Has no LLM.',
            goal: 'Nothing.',
        });
        expect(() => agent.run({ prompt: 'hello' })).toThrow();
    });
});

// ── MessageBusImpl ────────────────────────────────────────────────────────────

describe('MessageBusImpl', () => {
    it('delivers a message to a subscribed agent', async () => {
        const { MessageType, MessagePriority } = await import('@confused-ai/orchestration');
        const bus = new MessageBusImpl();

        const received: unknown[] = [];
        bus.subscribe(
            'agent-1' as import('@confused-ai/core').EntityId,
            { types: [MessageType.QUERY] },
            async (msg) => { received.push(msg.payload); },
        );

        await bus.send({
            from: 'agent-2' as import('@confused-ai/core').EntityId,
            to: 'agent-1' as import('@confused-ai/core').EntityId,
            type: MessageType.QUERY,
            payload: { question: 'hello?' },
            priority: MessagePriority.NORMAL,
        });

        expect(received).toHaveLength(1);
        expect((received[0] as Record<string, unknown>)['question']).toBe('hello?');
    });

    it('does not deliver message to wrong agent', async () => {
        const { MessageType, MessagePriority } = await import('@confused-ai/orchestration');
        const bus = new MessageBusImpl();
        const received: unknown[] = [];

        bus.subscribe(
            'agent-x' as import('@confused-ai/core').EntityId,
            { types: [MessageType.QUERY] },
            async () => { received.push('should-not-arrive'); },
        );

        await bus.send({
            from: 'agent-2' as import('@confused-ai/core').EntityId,
            to: 'agent-1' as import('@confused-ai/core').EntityId,
            type: MessageType.QUERY,
            payload: {},
            priority: MessagePriority.NORMAL,
        });

        expect(received).toHaveLength(0);
    });

    it('unsubscribe stops future deliveries', async () => {
        const { MessageType, MessagePriority } = await import('@confused-ai/orchestration');
        const bus = new MessageBusImpl();
        const received: unknown[] = [];

        const sub = bus.subscribe(
            'agent-1' as import('@confused-ai/core').EntityId,
            { types: [MessageType.QUERY] },
            async (msg) => { received.push(msg.payload); },
        );
        sub.unsubscribe();

        await bus.send({
            from: 'agent-2' as import('@confused-ai/core').EntityId,
            to: 'agent-1' as import('@confused-ai/core').EntityId,
            type: MessageType.QUERY,
            payload: { q: 1 },
            priority: MessagePriority.NORMAL,
        });

        expect(received).toHaveLength(0);
    });
});
