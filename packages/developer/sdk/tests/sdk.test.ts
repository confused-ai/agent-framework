/**
 * @confused-ai/sdk — package-level conformance tests.
 *
 * Covers: defineAgent (fluent builder → TypedAgent), defineAgentFromConfig,
 *         createWorkflow, WorkflowBuilder, Workflow.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    defineAgent,
    defineAgentFromConfig,
    AgentBuilder,
    createWorkflow,
    WorkflowBuilder,
    Workflow,
} from '@confused-ai/sdk';

// ── defineAgent (fluent builder) ──────────────────────────────────────────────

describe('defineAgent', () => {
    it('returns an AgentBuilder', () => {
        const builder = defineAgent('my-agent');
        expect(builder).toBeInstanceOf(AgentBuilder);
    });

    it('build() produces a TypedAgent with getConfig()', () => {
        const agent = defineAgent('echo')
            .input(z.string())
            .output(z.string())
            .build();
        const cfg = agent.getConfig();
        expect(cfg.name).toBe('echo');
    });

    it('run() passes string through when no handler', async () => {
        const agent = defineAgent('passthrough')
            .input(z.string())
            .output(z.string())
            .build();
        const result = await agent.run('hello') as Record<string, unknown>;
        // Primitive output wrapped as { __value, sessionId, runId }
        expect(result['__value'] ?? result).toBe('hello');
    });

    it('run() calls handler and returns validated output', async () => {
        const agent = defineAgent('upper')
            .input(z.string())
            .output(z.string())
            .handler(async (input) => input.toUpperCase())
            .build();
        const result = await agent.run('hello') as Record<string, unknown>;
        expect(result['__value']).toBe('HELLO');
    });

    it('run() validates input with inputSchema', async () => {
        const agent = defineAgent('typed')
            .input(z.object({ n: z.number() }))
            .output(z.object({ n: z.number() }))
            .build();
        await expect(
            agent.run({ n: 'not-a-number' as unknown as number }),
        ).rejects.toThrow();
    });

    it('run() result includes sessionId and runId', async () => {
        const agent = defineAgent('ids')
            .input(z.string())
            .output(z.string())
            .handler(async () => 'ok')
            .build();
        const result = await agent.run('x') as Record<string, unknown>;
        expect(typeof result['sessionId']).toBe('string');
        expect(typeof result['runId']).toBe('string');
    });

    it('run() passes context to handler', async () => {
        let capturedCtx: Record<string, unknown> | undefined;
        const agent = defineAgent('ctx-agent')
            .input(z.string())
            .output(z.string())
            .handler(async (input, ctx) => {
                capturedCtx = ctx;
                return input;
            })
            .build();
        await agent.run('x', { context: { userId: '42' } });
        expect(capturedCtx?.['userId']).toBe('42');
        expect(capturedCtx?.['__memoryStore']).toBeDefined();
        expect(capturedCtx?.['__toolRegistry']).toBeDefined();
        expect(capturedCtx?.['__planner']).toBeDefined();
    });

    it('instructions() is stored in config', () => {
        const agent = defineAgent('instruct')
            .instructions('You are helpful.')
            .build();
        expect(agent.getConfig().instructions).toBe('You are helpful.');
    });

    it('maxIterations() is stored in config', () => {
        const agent = defineAgent('limited').maxIterations(3).build();
        expect(agent.getConfig().maxIterations).toBe(3);
    });

    it('plan() returns a Plan with tasks array', async () => {
        const agent = defineAgent('planner-agent')
            .input(z.string())
            .output(z.string())
            .build();
        const plan = await agent.plan('Do something useful');
        expect(plan).toBeDefined();
        expect(Array.isArray(plan.tasks)).toBe(true);
    });
});

// ── defineAgentFromConfig (DefinedAgent) ──────────────────────────────────────

describe('defineAgentFromConfig', () => {
    it('creates a DefinedAgent with getConfig()', () => {
        const agent = defineAgentFromConfig({
            name: 'compat',
            inputSchema: z.string(),
            outputSchema: z.string(),
        });
        expect(agent.getConfig().name).toBe('compat');
    });

    it('run({input}) calls handler and returns output', async () => {
        const agent = defineAgentFromConfig({
            name: 'handler-test',
            inputSchema: z.string(),
            outputSchema: z.string(),
            handler: async () => 'done',
        });
        const result = await agent.run({ input: 'anything' });
        expect(result).toBe('done');
    });

    it('withTool() registers a tool and returns the same instance', () => {
        const agent = defineAgentFromConfig({
            name: 'tooled',
            inputSchema: z.string(),
            outputSchema: z.string(),
        });
        const tool = {
            id: 'greet-tool' as import('@confused-ai/sdk').EntityId,
            name: 'greet',
            description: 'says hi',
            parameters: z.object({ name: z.string() }),
            execute: async ({ name }: { name: string }) => `Hi ${name}`,
        };
        const returned = agent.withTool(tool);
        expect(returned).toBe(agent);
    });

    it('withTools() registers multiple tools without throwing', () => {
        const agent = defineAgentFromConfig({
            name: 'multi-tool',
            inputSchema: z.string(),
            outputSchema: z.string(),
        });
        const tools = [
            { id: 't1' as import('@confused-ai/sdk').EntityId, name: 't1', description: '', parameters: z.object({}), execute: async () => '' },
            { id: 't2' as import('@confused-ai/sdk').EntityId, name: 't2', description: '', parameters: z.object({}), execute: async () => '' },
        ];
        expect(() => agent.withTools(tools)).not.toThrow();
    });
});

// ── createWorkflow / WorkflowBuilder ─────────────────────────────────────────

describe('createWorkflow', () => {
    it('returns a WorkflowBuilder instance', () => {
        expect(createWorkflow()).toBeInstanceOf(WorkflowBuilder);
    });

    it('build() returns a Workflow instance', () => {
        const wf = createWorkflow().build();
        expect(wf).toBeInstanceOf(Workflow);
    });

    it('executes an empty workflow without error', async () => {
        const result = await createWorkflow().execute();
        expect(result.results).toEqual({});
    });

    it('executes a sequential task and captures the result', async () => {
        const echo = defineAgentFromConfig({
            name: 'echo',
            inputSchema: z.unknown(),
            outputSchema: z.string(),
            handler: async () => 'done',
        });

        const result = await createWorkflow()
            .task('step1', echo as import('@confused-ai/sdk').DefinedAgent<unknown, unknown>)
            .execute({ userId: '99' });

        expect(result.results['step1']).toBe('done');
    });

    it('executes two sequential tasks in order', async () => {
        const order: string[] = [];

        const step1 = defineAgentFromConfig({
            name: 's1',
            inputSchema: z.unknown(),
            outputSchema: z.string(),
            handler: async () => { order.push('s1'); return 's1-out'; },
        });
        const step2 = defineAgentFromConfig({
            name: 's2',
            inputSchema: z.unknown(),
            outputSchema: z.string(),
            handler: async () => { order.push('s2'); return 's2-out'; },
        });

        const result = await createWorkflow()
            .task('a', step1 as import('@confused-ai/sdk').DefinedAgent<unknown, unknown>)
            .task('b', step2 as import('@confused-ai/sdk').DefinedAgent<unknown, unknown>)
            .execute();

        expect(order).toEqual(['s1', 's2']);
        expect(result.results['a']).toBe('s1-out');
        expect(result.results['b']).toBe('s2-out');
    });

    it('executes parallel tasks and captures results', async () => {
        const started: string[] = [];

        const makeAgent = (name: string) => defineAgentFromConfig({
            name,
            inputSchema: z.unknown(),
            outputSchema: z.string(),
            handler: async () => { started.push(name); return `${name}-out`; },
        }) as import('@confused-ai/sdk').DefinedAgent<unknown, unknown>;

        const result = await createWorkflow()
            .parallel()
            .task('p1', makeAgent('p1'))
            .task('p2', makeAgent('p2'))
            .sequential()
            .execute();

        expect(result.results['p1']).toBe('p1-out');
        expect(result.results['p2']).toBe('p2-out');
        expect(started.sort()).toEqual(['p1', 'p2']);
    });

    it('dependsOn attaches dependency and build() returns Workflow', () => {
        const agent = defineAgentFromConfig({
            name: 'dep',
            inputSchema: z.unknown(),
            outputSchema: z.string(),
        }) as import('@confused-ai/sdk').DefinedAgent<unknown, unknown>;

        const wf = createWorkflow()
            .task('first', agent)
            .task('second', agent)
            .dependsOn('first')
            .build();
        expect(wf).toBeInstanceOf(Workflow);
    });
});
