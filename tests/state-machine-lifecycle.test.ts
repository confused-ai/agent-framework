import { describe, expect, it } from 'vitest';

import { AgentStateMachine } from '../src/execution/state-machine.js';

type TestEvent = { type: 'START' | 'DONE' };

describe('AgentStateMachine lifecycle hardening', () => {
    it('start() is idempotent and runs initial onEntry once', async () => {
        const calls: string[] = [];

        const sm = new AgentStateMachine<{ count: number }, TestEvent>(
            {
                idle: {
                    onEntry: (ctx) => {
                        ctx.count += 1;
                        calls.push('idle:entry');
                    },
                    transitions: { START: 'planning' },
                },
                planning: {},
            },
            { initial: 'idle', context: { count: 0 } },
        );

        await sm.start();
        await sm.start();

        expect(sm.context.count).toBe(1);
        expect(calls).toEqual(['idle:entry']);
    });

    it('keeps source state when next onEntry throws during send()', async () => {
        const sm = new AgentStateMachine<{ trace: string[] }, TestEvent>(
            {
                idle: {
                    onExit: (ctx) => ctx.trace.push('idle:exit'),
                    transitions: { START: 'planning' },
                },
                planning: {
                    onEntry: () => {
                        throw new Error('planning entry failed');
                    },
                },
            },
            { initial: 'idle', context: { trace: [] } },
        );

        await expect(sm.send({ type: 'START' })).rejects.toThrow('planning entry failed');
        expect(sm.currentState).toBe('idle');
        expect(sm.context.trace).toEqual(['idle:exit']);
    });

    it('keeps source state when next onEntry throws during jumpTo()', async () => {
        const sm = new AgentStateMachine<{ trace: string[] }, TestEvent>(
            {
                idle: {
                    onExit: (ctx) => ctx.trace.push('idle:exit'),
                },
                planning: {
                    onEntry: () => {
                        throw new Error('jump entry failed');
                    },
                },
            },
            { initial: 'idle', context: { trace: [] } },
        );

        await expect(sm.jumpTo('planning')).rejects.toThrow('jump entry failed');
        expect(sm.currentState).toBe('idle');
        expect(sm.context.trace).toEqual(['idle:exit']);
    });

    it('returns false and keeps state when event has no transition', async () => {
        const sm = new AgentStateMachine<{ value: number }, TestEvent>(
            {
                idle: {
                    transitions: { START: 'planning' },
                },
                planning: {},
            },
            { initial: 'idle', context: { value: 1 } },
        );

        const transitioned = await sm.send({ type: 'DONE' });

        expect(transitioned).toBe(false);
        expect(sm.currentState).toBe('idle');
        expect(sm.context.value).toBe(1);
    });

    it('restores started machine without re-running initial onEntry', async () => {
        const calls: string[] = [];

        const states = {
            idle: {
                onEntry: (ctx: { count: number }) => {
                    ctx.count += 1;
                    calls.push('idle:entry');
                },
            },
        };

        const sm = new AgentStateMachine<{ count: number }, TestEvent>(states, {
            initial: 'idle',
            context: { count: 0 },
        });

        await sm.start();
        const snapshot = sm.getSnapshot();

        const restored = AgentStateMachine.fromSnapshot(states, snapshot);
        await restored.start();

        expect(restored.context.count).toBe(1);
        expect(calls).toEqual(['idle:entry']);
    });

    it('treats legacy snapshots without started flag as already started', async () => {
        const calls: string[] = [];

        const states = {
            idle: {
                onEntry: (ctx: { count: number }) => {
                    ctx.count += 1;
                    calls.push('idle:entry');
                },
            },
        };

        const restored = AgentStateMachine.fromSnapshot(states, {
            state: 'idle',
            context: { count: 5 },
            timestamp: Date.now(),
        });

        await restored.start();

        expect(restored.context.count).toBe(5);
        expect(calls).toEqual([]);
    });
});
