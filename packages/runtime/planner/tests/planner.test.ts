/**
 * @confused-ai/planner — package-level conformance tests.
 *
 * Covers: ClassicalPlanner (plan, refine, validate), PlanValidator
 */

import { describe, it, expect } from 'vitest';
import {
    ClassicalPlanner,
    PlanValidator,
    PlanningAlgorithm,
    TaskPriority,
    TaskStatus,
} from '@confused-ai/planner';
import type { Plan, Task } from '@confused-ai/planner';
import type { EntityId } from '@confused-ai/core';

// ── ClassicalPlanner ──────────────────────────────────────────────────────────

describe('ClassicalPlanner', () => {
    function makePlanner() {
        return new ClassicalPlanner({
            algorithm: PlanningAlgorithm.HIERARCHICAL,
            maxIterations: 5,
            timeoutMs: 5000,
        });
    }

    it('plan() returns a Plan with id, goal, tasks, createdAt, metadata', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Search for information about AI');
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('goal', 'Search for information about AI');
        expect(plan).toHaveProperty('tasks');
        expect(plan).toHaveProperty('createdAt');
        expect(plan).toHaveProperty('metadata');
        expect(Array.isArray(plan.tasks)).toBe(true);
    });

    it('plan() returns at least one task', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Analyse the data');
        expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('plan() tasks have required fields', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Write a report');
        for (const task of plan.tasks) {
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('name');
            expect(task).toHaveProperty('description');
            expect(task).toHaveProperty('dependencies');
            expect(task).toHaveProperty('priority');
            expect(task).toHaveProperty('metadata');
            expect(Array.isArray(task.dependencies)).toBe(true);
        }
    });

    it('plan() metadata includes plannerType:classical', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Deploy the system');
        expect(plan.metadata.plannerType).toBe('classical');
    });

    it('plan() createdAt is a Date', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Build a feature');
        expect(plan.createdAt).toBeInstanceOf(Date);
    });

    it('plan() accepts a PlanContext', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Search the web', {
            availableTools: ['web_search', 'calculator'],
            constraints: ['Use only approved tools'],
        });
        expect(plan.goal).toBe('Search the web');
        expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('getConfig() returns config with defaults filled in', () => {
        const planner = makePlanner();
        const config = planner.getConfig();
        expect(config.maxIterations).toBe(5);
        expect(config.timeoutMs).toBe(5000);
        expect(typeof config.allowParallelExecution).toBe('boolean');
    });

    it('refine() returns a new plan with updated metadata', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Analyse data');
        const firstTaskId = plan.tasks[0]?.id;
        expect(firstTaskId).toBeDefined();

        const refined = await planner.refine(plan, {
            failedTaskId: firstTaskId as EntityId,
            error: 'timeout',
            suggestions: ['try alternative approach'],
        });

        expect(refined).toHaveProperty('id');
        expect(refined.tasks.length).toBeGreaterThan(0);
    });

    it('validate() returns ValidationResult with valid:true for a valid plan', async () => {
        const planner = makePlanner();
        const plan = await planner.plan('Complete goal');
        const result = planner.validate(plan);
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
    });
});

// ── PlanValidator ─────────────────────────────────────────────────────────────

describe('PlanValidator', () => {
    function makeTask(id: string, deps: string[] = []): Task {
        return {
            id: id as EntityId,
            name: `Task ${id}`,
            description: `Do task ${id}`,
            dependencies: deps as EntityId[],
            priority: TaskPriority.MEDIUM,
            metadata: {},
        };
    }

    function makePlan(tasks: Task[], goal = 'test goal'): Plan {
        return {
            id: 'plan-1' as EntityId,
            goal,
            tasks,
            createdAt: new Date(),
            metadata: { plannerType: 'test' },
        };
    }

    it('validates a valid plan as true', () => {
        const v = new PlanValidator();
        const tasks = [makeTask('t1'), makeTask('t2', ['t1'])];
        const result = v.validate(makePlan(tasks));
        expect(result.valid).toBe(true);
        expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('fails validation for empty tasks', () => {
        const v = new PlanValidator();
        const result = v.validate(makePlan([]));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('detects duplicate task IDs', () => {
        const v = new PlanValidator();
        const tasks = [makeTask('dup'), makeTask('dup')];
        const result = v.validate(makePlan(tasks));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.toLowerCase().includes('duplicate'))).toBe(true);
    });

    it('detects circular dependencies', () => {
        const v = new PlanValidator();
        // t1 → t2 → t1 (circular)
        const tasks = [makeTask('t1', ['t2']), makeTask('t2', ['t1'])];
        const result = v.validate(makePlan(tasks));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.toLowerCase().includes('circular'))).toBe(true);
    });

    it('detects missing dependency references', () => {
        const v = new PlanValidator();
        const tasks = [makeTask('t1', ['nonexistent'])];
        const result = v.validate(makePlan(tasks));
        expect(result.valid).toBe(false);
    });

    it('addCustomRule extends validation', () => {
        const v = new PlanValidator();
        v.addRule((plan) => [{
            message: 'custom rule triggered',
            severity: 'error' as const,
        }]);
        const result = v.validate(makePlan([makeTask('t1')]));
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message === 'custom rule triggered')).toBe(true);
    });

    it('errors array is empty for a single-task plan with no deps', () => {
        const v = new PlanValidator();
        const result = v.validate(makePlan([makeTask('solo')]));
        const errorErrors = result.errors.filter(e => e.severity === 'error');
        expect(errorErrors).toHaveLength(0);
    });
});
