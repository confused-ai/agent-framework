/**
 * @confused-ai/eval — conformance tests.
 *
 * Covers:
 * - EvalAggregator statistics (latency, cost, correctness, custom metrics)
 * - Text metrics: word overlap F1, ROUGE-L
 * - runEvalSuite: basic run, batch chunking, concurrency, baseline regression,
 *   setBaseline, sample timeout, onSample callback, error handling
 * - InMemoryEvalStore: appendSample, querySamples, appendRun, queryRuns,
 *   getBaseline, saveBaseline
 * - runRegression: threshold, pass/fail, concurrency chunking
 */

import { describe, it, expect, vi } from 'vitest';
import { EvalAggregator } from '../src/eval.js';
import type { EvalResult } from '../src/eval.js';
import { wordOverlapF1, rougeLWords } from '../src/eval.js';
import { InMemoryEvalStore, runEvalSuite } from '../src/eval-store.js';
import type { EvalDatasetItem } from '../src/eval-store.js';
import { runRegression } from '../src/regression.js';

// ── helpers ───────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<EvalResult> = {}): EvalResult {
    return {
        id: `r-${Math.random().toString(36).slice(2)}`,
        input: 'test input',
        output: 'test output',
        latency: { total: 100 },
        tokens: { input: 10, output: 20, total: 30 },
        cost: 0.001,
        timestamp: Date.now(),
        ...overrides,
    };
}

function makeAgent(responses: string[]): { run: (prompt: string) => Promise<{ text: string; usage: { totalTokens: number } }> } {
    let i = 0;
    return {
        run: async (_prompt: string) => ({
            text: responses[i++ % responses.length] ?? '',
            usage: { totalTokens: 10 },
        }),
    };
}

// ── EvalAggregator ────────────────────────────────────────────────────────

describe('EvalAggregator', () => {
    it('returns zero stats for empty aggregator', () => {
        const agg = new EvalAggregator();
        const stats = agg.getStats();
        expect(stats.total).toBe(0);
        expect(stats.successRate).toBe(0);
    });

    it('computes latency percentiles correctly', () => {
        const agg = new EvalAggregator();
        const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        for (const l of latencies) {
            agg.addResult(makeResult({ latency: { total: l }, error: undefined }));
        }
        const stats = agg.getStats();
        expect(stats.total).toBe(10);
        expect(stats.latency.min).toBe(10);
        expect(stats.latency.max).toBe(100);
        expect(stats.latency.p95).toBeGreaterThanOrEqual(90);
    });

    it('tracks cost statistics', () => {
        const agg = new EvalAggregator();
        agg.addResult(makeResult({ cost: 0.01 }));
        agg.addResult(makeResult({ cost: 0.03 }));
        const stats = agg.getStats();
        expect(stats.cost.total).toBeCloseTo(0.04);
        expect(stats.cost.mean).toBeCloseTo(0.02);
        expect(stats.cost.min).toBeCloseTo(0.01);
        expect(stats.cost.max).toBeCloseTo(0.03);
    });

    it('computes correctness stats from labelled results', () => {
        const agg = new EvalAggregator();
        agg.addResult(makeResult({ correctness: 1.0 }));
        agg.addResult(makeResult({ correctness: 0.6 }));
        const stats = agg.getStats();
        expect(stats.correctness?.mean).toBeCloseTo(0.8);
        expect(stats.correctness?.min).toBeCloseTo(0.6);
        expect(stats.correctness?.max).toBeCloseTo(1.0);
    });

    it('tracks success rate (results without error field)', () => {
        const agg = new EvalAggregator();
        agg.addResult(makeResult({ error: undefined }));
        agg.addResult(makeResult({ error: 'boom' }));
        const stats = agg.getStats();
        expect(stats.successRate).toBeCloseTo(0.5);
    });
});

// ── Text metrics ──────────────────────────────────────────────────────────

describe('wordOverlapF1', () => {
    it('returns 1.0 for identical strings', () => {
        expect(wordOverlapF1('the cat sat', 'the cat sat')).toBeCloseTo(1.0);
    });

    it('returns 0.0 for completely different strings', () => {
        expect(wordOverlapF1('dog', 'cat')).toBeCloseTo(0.0);
    });

    it('returns partial overlap', () => {
        const score = wordOverlapF1('the cat sat on the mat', 'the cat sat');
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(1);
    });
});

describe('rougeLWords', () => {
    it('returns 1.0 for identical strings', () => {
        expect(rougeLWords('hello world', 'hello world')).toBeCloseTo(1.0);
    });

    it('returns 0.0 for completely different strings', () => {
        expect(rougeLWords('abc', 'xyz')).toBeCloseTo(0.0);
    });

    it('returns a higher score for more overlap', () => {
        const high = rougeLWords('the quick brown fox', 'the quick brown fox jumps');
        const low = rougeLWords('the quick brown fox', 'a slow red cat runs');
        expect(high).toBeGreaterThan(low);
    });
});

// ── InMemoryEvalStore ─────────────────────────────────────────────────────

describe('InMemoryEvalStore', () => {
    it('stores and retrieves samples by suiteRunId', async () => {
        const store = new InMemoryEvalStore();
        const sample = {
            id: 's1',
            suiteRunId: 'run-1',
            suiteName: 'suite-a',
            input: 'q',
            actualOutput: 'a',
            score: 0.8,
            passed: true,
            durationMs: 50,
            timestamp: new Date().toISOString(),
        };
        await store.appendSample(sample);
        const results = await store.querySamples('run-1');
        expect(results).toHaveLength(1);
        expect(results[0]?.score).toBe(0.8);
    });

    it('returns empty array for unknown suiteRunId', async () => {
        const store = new InMemoryEvalStore();
        const results = await store.querySamples('nonexistent');
        expect(results).toHaveLength(0);
    });

    it('stores and retrieves runs by suiteName (newest first)', async () => {
        const store = new InMemoryEvalStore();
        const makeRun = (id: string, ts: string) => ({
            id,
            suiteName: 'suite-b',
            averageScore: 0.9,
            passedCount: 1,
            totalCount: 1,
            durationMs: 100,
            timestamp: ts,
            isBaseline: false,
        });
        await store.appendRun(makeRun('r1', '2026-01-01T00:00:00.000Z'));
        await store.appendRun(makeRun('r2', '2026-06-01T00:00:00.000Z'));
        const runs = await store.queryRuns('suite-b');
        expect(runs).toHaveLength(2);
        // newest first
        expect(runs[0]?.id).toBe('r2');
    });

    it('returns null baseline before any baseline is set', async () => {
        const store = new InMemoryEvalStore();
        const baseline = await store.getBaseline('suite-c');
        expect(baseline).toBeNull();
    });

    it('saves and retrieves a baseline', async () => {
        const store = new InMemoryEvalStore();
        await store.saveBaseline('suite-d', 'run-99', 0.75);
        const baseline = await store.getBaseline('suite-d');
        expect(baseline?.averageScore).toBe(0.75);
        expect(baseline?.runId).toBe('run-99');
    });

    it('overwrites an existing baseline', async () => {
        const store = new InMemoryEvalStore();
        await store.saveBaseline('suite-e', 'run-1', 0.5);
        await store.saveBaseline('suite-e', 'run-2', 0.9);
        const baseline = await store.getBaseline('suite-e');
        expect(baseline?.averageScore).toBe(0.9);
        expect(baseline?.runId).toBe('run-2');
    });
});

// ── runEvalSuite ──────────────────────────────────────────────────────────

describe('runEvalSuite — basic run', () => {
    it('runs all samples and returns a report', async () => {
        const dataset: EvalDatasetItem[] = [
            { input: 'a', expectedOutput: 'a' },
            { input: 'b', expectedOutput: 'b' },
        ];
        const agent = makeAgent(['a', 'b']);

        const report = await runEvalSuite({
            suiteName: 'smoke',
            dataset,
            agent,
        });

        expect(report.totalCount).toBe(2);
        expect(report.passedCount).toBe(2);
        expect(report.averageScore).toBeCloseTo(1.0);
        expect(report.passed).toBe(true);
        expect(report.regressionDelta).toBeNull(); // no baseline yet
        expect(report.samples).toHaveLength(2);
    });

    it('scores partial match with default exact-match scorer', async () => {
        const dataset: EvalDatasetItem[] = [
            { input: 'q', expectedOutput: 'correct' },
        ];
        const agent = makeAgent(['wrong']);

        const report = await runEvalSuite({
            suiteName: 'partial',
            dataset,
            agent,
            passingScore: 0.5,
        });

        expect(report.averageScore).toBeCloseTo(0.0);
        expect(report.passedCount).toBe(0);
    });

    it('uses a custom scorer when provided', async () => {
        const dataset: EvalDatasetItem[] = [
            { input: 'q', expectedOutput: 'expected' },
        ];
        const agent = makeAgent(['anything']);
        const alwaysOne = async () => 1.0;

        const report = await runEvalSuite({
            suiteName: 'custom-scorer',
            dataset,
            agent,
            scorer: alwaysOne,
        });

        expect(report.averageScore).toBeCloseTo(1.0);
    });

    it('fires onSample callback for each sample', async () => {
        const dataset: EvalDatasetItem[] = [
            { input: 'x', expectedOutput: 'x' },
            { input: 'y', expectedOutput: 'y' },
        ];
        const agent = makeAgent(['x', 'y']);
        const calls: number[] = [];

        await runEvalSuite({
            suiteName: 'cb',
            dataset,
            agent,
            onSample: (i) => calls.push(i),
        });

        expect(calls).toEqual([1, 2]);
    });
});

describe('runEvalSuite — concurrency chunking', () => {
    it('runs samples in parallel chunks of the specified size', async () => {
        const dataset: EvalDatasetItem[] = Array.from({ length: 6 }, (_, i) => ({
            input: String(i),
            expectedOutput: String(i),
        }));
        let maxConcurrent = 0;
        let concurrent = 0;
        const agent = {
            run: async (prompt: string) => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await new Promise<void>((r) => setTimeout(r, 20));
                concurrent--;
                return { text: prompt, usage: { totalTokens: 1 } };
            },
        };

        await runEvalSuite({
            suiteName: 'concurrent',
            dataset,
            agent,
            concurrency: 3,
        });

        expect(maxConcurrent).toBeLessThanOrEqual(3);
        expect(maxConcurrent).toBeGreaterThan(1);
    });
});

describe('runEvalSuite — baseline & regression', () => {
    it('passes when no baseline exists (first run)', async () => {
        const store = new InMemoryEvalStore();
        const report = await runEvalSuite({
            suiteName: 'reg-first',
            dataset: [{ input: 'q', expectedOutput: 'a' }],
            agent: makeAgent(['a']),
            store,
        });
        expect(report.passed).toBe(true);
        expect(report.regressionDelta).toBeNull();
    });

    it('sets baseline when setBaseline=true', async () => {
        const store = new InMemoryEvalStore();
        await runEvalSuite({
            suiteName: 'reg-set',
            dataset: [{ input: 'q', expectedOutput: 'a' }],
            agent: makeAgent(['a']),
            store,
            setBaseline: true,
        });
        const baseline = await store.getBaseline('reg-set');
        expect(baseline).not.toBeNull();
        expect(baseline?.averageScore).toBeCloseTo(1.0);
    });

    it('detects regression when score drops below threshold', async () => {
        const store = new InMemoryEvalStore();

        // First run: score = 1.0, set as baseline
        await runEvalSuite({
            suiteName: 'reg-detect',
            dataset: [{ input: 'q', expectedOutput: 'a' }],
            agent: makeAgent(['a']),
            store,
            setBaseline: true,
        });

        // Second run: score = 0.0 (wrong answer) — delta = -1.0, threshold = 0.05
        const report = await runEvalSuite({
            suiteName: 'reg-detect',
            dataset: [{ input: 'q', expectedOutput: 'a' }],
            agent: makeAgent(['wrong']),
            store,
            regressionThreshold: 0.05,
        });

        expect(report.passed).toBe(false);
        expect(report.regressionDelta).toBeLessThan(-0.05);
        expect(report.baselineScore).toBeCloseTo(1.0);
    });

    it('passes when improvement from baseline', async () => {
        const store = new InMemoryEvalStore();
        // Baseline: 0.5
        await store.saveBaseline('reg-improve', 'old', 0.5);

        const report = await runEvalSuite({
            suiteName: 'reg-improve',
            dataset: [{ input: 'q', expectedOutput: 'a' }],
            agent: makeAgent(['a']),
            store,
            regressionThreshold: 0.05,
        });

        expect(report.passed).toBe(true);
        expect(report.regressionDelta).toBeGreaterThan(0);
    });
});

describe('runEvalSuite — error handling', () => {
    it('records error and scores 0 when agent throws', async () => {
        const dataset: EvalDatasetItem[] = [{ input: 'q', expectedOutput: 'a' }];
        const agent = {
            run: async () => { throw new Error('agent crashed'); },
        };

        const report = await runEvalSuite({
            suiteName: 'error-case',
            dataset,
            agent,
        });

        expect(report.samples[0]?.error).toMatch(/agent crashed/);
        expect(report.samples[0]?.score).toBe(0);
        expect(report.samples[0]?.passed).toBe(false);
    });

    it('times out sample and records error when agent is too slow', async () => {
        const dataset: EvalDatasetItem[] = [{ input: 'slow', expectedOutput: 'fast' }];
        const agent = {
            run: async () => {
                await new Promise<void>((r) => setTimeout(r, 500));
                return { text: 'fast', usage: { totalTokens: 1 } };
            },
        };

        const report = await runEvalSuite({
            suiteName: 'timeout-case',
            dataset,
            agent,
            sampleTimeoutMs: 100,
        });

        expect(report.samples[0]?.error).toMatch(/timeout/i);
    });
});

// ── runRegression ─────────────────────────────────────────────────────────

describe('runRegression', () => {
    it('returns all-passed report when all scores meet threshold', async () => {
        const samples = [
            { id: '1', input: 'a' },
            { id: '2', input: 'b' },
        ];

        const report = await runRegression({
            samples,
            run: async (input) => input,
            score: (candidate, _expected) => (candidate === 'a' || candidate === 'b' ? 1 : 0),
            threshold: 0.6,
        });

        expect(report.passed).toBe(2);
        expect(report.failed).toBe(0);
        expect(report.passRate).toBeCloseTo(1.0);
        expect(report.regressions).toHaveLength(0);
    });

    it('marks samples as failed when below threshold', async () => {
        const samples = [
            { id: '1', input: 'q' },
        ];

        const report = await runRegression({
            samples,
            run: async () => 'wrong',
            score: async () => 0.3,
            threshold: 0.6,
        });

        expect(report.failed).toBe(1);
        expect(report.regressions).toHaveLength(1);
    });

    it('runs samples in concurrent chunks', async () => {
        let maxConcurrent = 0;
        let concurrent = 0;

        const samples = Array.from({ length: 8 }, (_, i) => ({ id: String(i), input: String(i) }));

        await runRegression({
            samples,
            run: async (input) => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await new Promise<void>((r) => setTimeout(r, 20));
                concurrent--;
                return input;
            },
            score: () => 1,
            concurrency: 4,
        });

        expect(maxConcurrent).toBeLessThanOrEqual(4);
        expect(maxConcurrent).toBeGreaterThan(1);
    });

    it('computes mean score correctly', async () => {
        const samples = [
            { id: '1', input: 'a' },
            { id: '2', input: 'b' },
            { id: '3', input: 'c' },
        ];
        const scores = [0.4, 0.8, 0.6];
        let i = 0;

        const report = await runRegression({
            samples,
            run: async (input) => input,
            score: () => scores[i++] ?? 0,
        });

        expect(report.meanScore).toBeCloseTo(0.6);
    });
});
