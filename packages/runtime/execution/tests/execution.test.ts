/**
 * @confused-ai/execution — package-level conformance tests.
 *
 * Covers: createStep, createStepWorkflow/WorkflowBuilder (sequential, parallel,
 *         conditional, suspend), WorkerPool, StateGraph + WorkflowExecutor,
 *         ExecutionGraphBuilder
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
    createStep,
    createStepWorkflow,
    WorkerPool,
    StateGraph,
    WorkflowExecutor,
    GraphCheckpointStore,
    NodeType,
    TransitionType,
    WorkflowStatus,
} from '@confused-ai/execution';
import { generateEntityId } from '@confused-ai/core';

// ── createStep ────────────────────────────────────────────────────────────────

describe('createStep', () => {
    it('creates a step with id/inputSchema/outputSchema', () => {
        const step = createStep({
            id: 'hello',
            inputSchema: z.object({ name: z.string() }),
            outputSchema: z.object({ greeting: z.string() }),
            execute: async ({ input }) => ({ greeting: `Hello, ${input.name}!` }),
        });
        expect(step.id).toBe('hello');
        expect(step.inputSchema).toBeDefined();
        expect(step.outputSchema).toBeDefined();
    });

    it('executes and validates output schema', async () => {
        const step = createStep({
            id: 'double',
            inputSchema: z.object({ n: z.number() }),
            outputSchema: z.object({ result: z.number() }),
            execute: async ({ input }) => ({ result: input.n * 2 }),
        });
        const result = await step.execute({
            input: { n: 5 },
            getStepResult: () => undefined,
            state: {},
            suspend: () => { throw new Error('suspended'); },
        });
        expect(result).toEqual({ result: 10 });
    });

    it('throws when output fails schema validation', async () => {
        const step = createStep({
            id: 'bad-output',
            inputSchema: z.object({ x: z.string() }),
            outputSchema: z.object({ count: z.number() }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            execute: async () => ({ count: 'not-a-number' }) as any,
        });
        await expect(step.execute({
            input: { x: 'hello' },
            getStepResult: () => undefined,
            state: {},
            suspend: () => { throw new Error('suspended'); },
        })).rejects.toThrow(/validation failed/i);
    });

    it('includes retry config when provided', () => {
        const step = createStep({
            id: 'retry-step',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            execute: async () => ({}),
            retry: { maxRetries: 3, backoffMs: 200 },
        });
        expect(step.retry).toBeDefined();
        expect(step.retry?.maxRetries).toBe(3);
    });
});

// ── createStepWorkflow + Workflow ─────────────────────────────────────────────

describe('createStepWorkflow / Workflow', () => {
    const upperStep = createStep({
        id: 'upper',
        inputSchema: z.object({ text: z.string() }),
        outputSchema: z.object({ upper: z.string() }),
        execute: async ({ input }) => ({ upper: input.text.toUpperCase() }),
    });

    const repeatStep = createStep({
        id: 'repeat',
        inputSchema: z.object({ upper: z.string() }),
        outputSchema: z.object({ repeated: z.string() }),
        execute: async ({ input }) => ({ repeated: `${input.upper} ${input.upper}` }),
    });

    it('sequential workflow returns success status', async () => {
        const wf = createStepWorkflow({
            id: 'seq-wf',
            inputSchema: z.object({ text: z.string() }),
        })
            .then(upperStep)
            .commit();

        const result = await wf.execute({ text: 'hello' });
        expect(result.status).toBe('success');
    });

    it('sequential workflow result contains step outputs in .steps', async () => {
        const wf = createStepWorkflow({
            id: 'seq-wf2',
            inputSchema: z.object({ text: z.string() }),
        })
            .then(upperStep)
            .commit();

        const result = await wf.execute({ text: 'world' });
        expect(result.steps['upper']?.status).toBe('success');
        expect(result.steps['upper']?.output).toEqual({ upper: 'WORLD' });
    });

    it('chained steps pass outputs via getStepResult', async () => {
        const wf = createStepWorkflow({
            id: 'chained-wf',
            inputSchema: z.object({ text: z.string() }),
        })
            .then(upperStep)
            .then(createStep({
                id: 'suffix',
                inputSchema: z.object({ upper: z.string() }),
                outputSchema: z.object({ final: z.string() }),
                execute: async ({ input }) => ({ final: `${input.upper}!` }),
            }))
            .commit();

        const result = await wf.execute({ text: 'hi' });
        expect(result.status).toBe('success');
        expect(result.steps['suffix']?.output).toEqual({ final: 'HI!' });
    });

    it('failed step sets workflow status to failed', async () => {
        const failStep = createStep({
            id: 'fail',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            execute: async () => { throw new Error('boom'); },
        });

        const wf = createStepWorkflow({
            id: 'fail-wf',
            inputSchema: z.object({}),
        })
            .then(failStep)
            .commit();

        const result = await wf.execute({});
        expect(result.status).toBe('failed');
        expect(result.error?.message).toContain('boom');
    });

    it('invalid workflow input returns failed status', async () => {
        const wf = createStepWorkflow({
            id: 'validate-wf',
            inputSchema: z.object({ count: z.number() }),
        })
            .then(createStep({
                id: 'noop',
                inputSchema: z.object({ count: z.number() }),
                outputSchema: z.object({}),
                execute: async () => ({}),
            }))
            .commit();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await wf.execute({ count: 'not-a-number' } as any);
        expect(result.status).toBe('failed');
    });

    it('parallel() executes steps concurrently — both step results present', async () => {
        const stepA = createStep({
            id: 'stepA',
            inputSchema: z.any(),
            outputSchema: z.object({ a: z.string() }),
            execute: async () => ({ a: 'result-A' }),
        });
        const stepB = createStep({
            id: 'stepB',
            inputSchema: z.any(),
            outputSchema: z.object({ b: z.string() }),
            execute: async () => ({ b: 'result-B' }),
        });

        const wf = createStepWorkflow({
            id: 'parallel-wf',
            inputSchema: z.object({ text: z.string() }),
        })
            .parallel([stepA, stepB])
            .commit();

        const result = await wf.execute({ text: 'test' });
        expect(result.status).toBe('success');
        expect(result.steps['stepA']?.status).toBe('success');
        expect(result.steps['stepB']?.status).toBe('success');
    });

    it('onStepComplete callback is called for each step', async () => {
        const completed: string[] = [];

        const wf = createStepWorkflow({
            id: 'hooks-wf',
            inputSchema: z.object({}),
            onStepComplete: (id) => { completed.push(id); },
        })
            .then(createStep({ id: 's1', inputSchema: z.object({}), outputSchema: z.object({}), execute: async () => ({}) }))
            .then(createStep({ id: 's2', inputSchema: z.object({}), outputSchema: z.object({}), execute: async () => ({}) }))
            .commit();

        await wf.execute({});
        expect(completed).toContain('s1');
        expect(completed).toContain('s2');
    });

    it('executionTimeMs is a non-negative number', async () => {
        const wf = createStepWorkflow({
            id: 'time-wf',
            inputSchema: z.object({}),
        })
            .then(createStep({ id: 'noop', inputSchema: z.object({}), outputSchema: z.object({}), execute: async () => ({}) }))
            .commit();

        const result = await wf.execute({});
        expect(typeof result.executionTimeMs).toBe('number');
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
});

// ── WorkerPool ────────────────────────────────────────────────────────────────

describe('WorkerPool', () => {
    it('creates a pool with min/max workers', async () => {
        const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 4 });
        const status = pool.getPoolStatus();
        expect(status.totalWorkers).toBeGreaterThanOrEqual(2);
        expect(status.totalWorkers).toBeLessThanOrEqual(4);
        await pool.shutdownPool(false);
    });

    it('executeParallel with empty task list returns empty array', async () => {
        const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 4, taskTimeoutMs: 5000 });
        const results = await pool.executeParallel([], {
            executionId: 'test-exec',
            planId: 'plan-1' as any,
            metadata: {},
            abortSignal: new AbortController().signal,
        });
        expect(results).toEqual([]);
        await pool.shutdownPool(false);
    });

    it('throws when pool is shut down', async () => {
        const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 2 });
        await pool.shutdownPool(false);
        await expect(pool.executeParallel(
            [{ id: 't1' as any, name: 'task1', description: '', dependencies: [], metadata: {} } as any],
            { executionId: 'x', planId: 'p1' as any, metadata: {}, abortSignal: new AbortController().signal }
        )).rejects.toThrow(/shutting down/i);
    });

    it('getPoolStatus returns correct shape', async () => {
        const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 4 });
        const status = pool.getPoolStatus();
        expect(status).toHaveProperty('totalWorkers');
        expect(status).toHaveProperty('activeWorkers');
        expect(status).toHaveProperty('idleWorkers');
        expect(status).toHaveProperty('pendingTasks');
        expect(status).toHaveProperty('completedTasks');
        await pool.shutdownPool(false);
    });
});

// ── StateGraph ────────────────────────────────────────────────────────────────

describe('StateGraph', () => {
    it('constructs a simple start→task→end graph using explicit node IDs', () => {
        const startId = generateEntityId();
        const taskId = generateEntityId();
        const endId = generateEntityId();

        const graph = new StateGraph({ name: 'test-graph' });
        graph.addNode({ id: startId, type: NodeType.START, name: 'start' });
        graph.addNode({ id: taskId, type: NodeType.TASK, name: 'step1', entry: async () => 'done' });
        graph.addNode({ id: endId, type: NodeType.END, name: 'end' });
        graph.addTransition({ from: startId, to: taskId, type: TransitionType.UNCONDITIONAL });
        graph.addTransition({ from: taskId, to: endId, type: TransitionType.SUCCESS });

        expect(graph.getNode(startId)).toBeDefined();
        expect(graph.getNode(taskId)?.name).toBe('step1');
        expect(graph.getOutgoing(startId)).toContain(taskId);
    });

    it('can retrieve nodes by id', () => {
        const nodeId = generateEntityId();
        const graph = new StateGraph({ name: 'g' });
        graph.addNode({ id: nodeId, type: NodeType.TASK, name: 'my-task' });
        expect(graph.getNode(nodeId)?.name).toBe('my-task');
    });

    it('returns undefined for unknown node id', () => {
        const graph = new StateGraph({ name: 'g' });
        expect(graph.getNode('nonexistent' as any)).toBeUndefined();
    });

    it('getNodes() returns all added nodes', () => {
        const id1 = generateEntityId();
        const id2 = generateEntityId();
        const graph = new StateGraph({ name: 'g' });
        graph.addNode({ id: id1, type: NodeType.START, name: 'a' });
        graph.addNode({ id: id2, type: NodeType.END, name: 'b' });
        expect(graph.getNodes().length).toBe(2);
    });

    it('validate() returns valid for a well-formed graph', () => {
        const startId = generateEntityId();
        const endId = generateEntityId();
        const graph = new StateGraph({ name: 'valid' });
        graph.addNode({ id: startId, type: NodeType.START, name: 'start' });
        graph.addNode({ id: endId, type: NodeType.END, name: 'end' });
        graph.addTransition({ from: startId, to: endId, type: TransitionType.UNCONDITIONAL });
        const { valid } = graph.validate();
        expect(valid).toBe(true);
    });

    it('validate() detects missing END node', () => {
        const graph = new StateGraph({ name: 'invalid' });
        graph.addNode({ type: NodeType.TASK, name: 'orphan' });
        const { valid, errors } = graph.validate();
        expect(valid).toBe(false);
        expect(errors.some(e => e.includes('END'))).toBe(true);
    });

    it('throws when adding transition with unknown source node', () => {
        const endId = generateEntityId();
        const graph = new StateGraph({ name: 'g' });
        graph.addNode({ id: endId, type: NodeType.END, name: 'end' });
        expect(() => graph.addTransition({
            from: 'nonexistent' as any,
            to: endId,
            type: TransitionType.UNCONDITIONAL,
        })).toThrow(/does not exist/i);
    });
});

describe('WorkflowExecutor', () => {
    function buildSimpleGraph() {
        const startId = generateEntityId();
        const taskId = generateEntityId();
        const endId = generateEntityId();

        const graph = new StateGraph({ name: 'simple' });
        graph.addNode({ id: startId, type: NodeType.START, name: 'start' });
        graph.addNode({
            id: taskId,
            type: NodeType.TASK,
            name: 'step',
            entry: async (ctx) => {
                ctx.variables.set('result', 42);
                return 42;
            },
        });
        graph.addNode({ id: endId, type: NodeType.END, name: 'end' });
        graph.addTransition({ from: startId, to: taskId, type: TransitionType.UNCONDITIONAL });
        graph.addTransition({ from: taskId, to: endId, type: TransitionType.SUCCESS });
        return graph;
    }

    it('executes a simple graph to completion', async () => {
        const graph = buildSimpleGraph();
        const executor = new WorkflowExecutor(graph, { defaultTimeoutMs: 5000 });
        const result = await executor.execute({});
        expect(result.status).toBe(WorkflowStatus.COMPLETED);
    });

    it('result contains executionId and outputVariables', async () => {
        const graph = buildSimpleGraph();
        const executor = new WorkflowExecutor(graph);
        const result = await executor.execute({});
        expect(result.executionId).toBeTruthy();
        expect(result.outputVariables).toBeDefined();
    });

    it('variables set during execution appear in outputVariables', async () => {
        const graph = buildSimpleGraph();
        const executor = new WorkflowExecutor(graph, { defaultTimeoutMs: 5000 });
        const result = await executor.execute({});
        expect(result.status).toBe(WorkflowStatus.COMPLETED);
        expect(result.outputVariables['result']).toBe(42);
    });

    it('input variables are passed into context', async () => {
        const startId = generateEntityId();
        const taskId = generateEntityId();
        const endId = generateEntityId();
        const graph = new StateGraph({ name: 'input-test' });
        graph.addNode({ id: startId, type: NodeType.START, name: 'start' });
        graph.addNode({
            id: taskId,
            type: NodeType.TASK,
            name: 'check',
            entry: async (ctx) => {
                return ctx.variables.get('greeting');
            },
        });
        graph.addNode({ id: endId, type: NodeType.END, name: 'end' });
        graph.addTransition({ from: startId, to: taskId, type: TransitionType.UNCONDITIONAL });
        graph.addTransition({ from: taskId, to: endId, type: TransitionType.SUCCESS });

        const executor = new WorkflowExecutor(graph);
        const result = await executor.execute({ greeting: 'hello' });
        expect(result.status).toBe(WorkflowStatus.COMPLETED);
        expect(result.outputVariables['greeting']).toBe('hello');
    });

    it('history contains records of executed nodes', async () => {
        const graph = buildSimpleGraph();
        const executor = new WorkflowExecutor(graph);
        const result = await executor.execute({});
        expect(Array.isArray(result.history)).toBe(true);
        expect(result.history.length).toBeGreaterThan(0);
    });

    it('totalDurationMs is a non-negative number', async () => {
        const graph = buildSimpleGraph();
        const executor = new WorkflowExecutor(graph);
        const result = await executor.execute({});
        expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
});

// ── GraphCheckpointStore ──────────────────────────────────────────────────────

describe('GraphCheckpointStore', () => {
    it('save and load roundtrip', async () => {
        const store = new GraphCheckpointStore();
        const executionId = generateEntityId();
        const snapshot = {
            workflowId: generateEntityId(),
            executionId,
            currentNodes: [generateEntityId()],
            activeBranches: [],
            variables: { key: 'value' },
            history: [],
            status: WorkflowStatus.PAUSED,
        };
        await store.save(snapshot);
        const loaded = await store.load(executionId);
        expect(loaded).not.toBeNull();
        expect(loaded?.executionId).toBe(executionId);
        expect(loaded?.variables['key']).toBe('value');
    });

    it('load returns null for unknown executionId', async () => {
        const store = new GraphCheckpointStore();
        const result = await store.load('unknown' as any);
        expect(result).toBeNull();
    });

    it('delete removes a saved snapshot', async () => {
        const store = new GraphCheckpointStore();
        const executionId = generateEntityId();
        const snapshot = {
            workflowId: generateEntityId(),
            executionId,
            currentNodes: [],
            activeBranches: [],
            variables: {},
            history: [],
            status: WorkflowStatus.PAUSED,
        };
        await store.save(snapshot);
        await store.delete(executionId);
        const loaded = await store.load(executionId);
        expect(loaded).toBeNull();
    });
});
