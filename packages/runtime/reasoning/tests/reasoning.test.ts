/**
 * @confused-ai/reasoning — package-level conformance tests.
 *
 * Covers: ReasoningManager (reason() stream, run(), minSteps, maxSteps, error,
 *         parse-error, RESET, FINAL_ANSWER), TreeOfThoughtEngine (solve)
 */

import { describe, it, expect } from 'vitest';
import {
    ReasoningManager,
    REASONING_SYSTEM_PROMPT,
    TreeOfThoughtEngine,
    NextAction,
    ReasoningEventType,
} from '@confused-ai/reasoning';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a JSON reasoning step as a string (mimics what an LLM would return). */
function makeStepJson(
    nextAction: NextAction = NextAction.CONTINUE,
    confidence = 0.9,
): string {
    return JSON.stringify({
        title: 'A step',
        action: 'I will think.',
        result: 'I thought.',
        reasoning: 'Because.',
        nextAction,
        confidence,
    });
}

/** A generate function that always emits `step`, then final_answer. */
function makeFinalAfterN(n: number): (msgs: Array<{ role: string; content: string }>) => Promise<string> {
    let calls = 0;
    return async () => {
        calls++;
        const action = calls >= n ? NextAction.FINAL_ANSWER : NextAction.CONTINUE;
        return makeStepJson(action);
    };
}

// ── ReasoningManager ──────────────────────────────────────────────────────────

describe('ReasoningManager', () => {
    it('exports a non-empty REASONING_SYSTEM_PROMPT', () => {
        expect(typeof REASONING_SYSTEM_PROMPT).toBe('string');
        expect(REASONING_SYSTEM_PROMPT.length).toBeGreaterThan(10);
    });

    it('reason() yields STARTED as the first event', async () => {
        const manager = new ReasoningManager({ generate: makeFinalAfterN(1), maxSteps: 3 });
        const events = [];
        for await (const evt of manager.reason([{ role: 'user', content: 'hi' }])) {
            events.push(evt.eventType);
        }
        expect(events[0]).toBe(ReasoningEventType.STARTED);
    });

    it('reason() yields STEP events for each reasoning step', async () => {
        const manager = new ReasoningManager({ generate: makeFinalAfterN(3), maxSteps: 5 });
        const steps = [];
        for await (const evt of manager.reason([{ role: 'user', content: 'solve it' }])) {
            if (evt.eventType === ReasoningEventType.STEP) steps.push(evt.step);
        }
        expect(steps.length).toBeGreaterThanOrEqual(1);
    });

    it('reason() yields COMPLETED with accumulated steps', async () => {
        const manager = new ReasoningManager({ generate: makeFinalAfterN(2), maxSteps: 5 });
        let completed;
        for await (const evt of manager.reason([{ role: 'user', content: 'solve it' }])) {
            if (evt.eventType === ReasoningEventType.COMPLETED) completed = evt;
        }
        expect(completed).toBeDefined();
        expect(Array.isArray(completed?.steps)).toBe(true);
        expect(completed?.steps?.length).toBeGreaterThanOrEqual(2);
    });

    it('run() returns success:true with steps', async () => {
        const manager = new ReasoningManager({ generate: makeFinalAfterN(2), maxSteps: 5 });
        const result = await manager.run([{ role: 'user', content: 'think' }]);
        expect(result.success).toBe(true);
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps.length).toBeGreaterThanOrEqual(2);
    });

    it('run() respects maxSteps — stops when cap is reached', async () => {
        let calls = 0;
        const generate = async () => { calls++; return makeStepJson(NextAction.CONTINUE); };
        const manager = new ReasoningManager({ generate, maxSteps: 3 });
        const result = await manager.run([{ role: 'user', content: 'loop' }]);
        // maxSteps=3 → at most 3 STEP events
        expect(result.steps.length).toBeLessThanOrEqual(3);
        expect(calls).toBeLessThanOrEqual(3);
    });

    it('run() returns error:true when generate throws', async () => {
        const generate = async () => { throw new Error('LLM unavailable'); };
        const manager = new ReasoningManager({ generate, maxSteps: 5 });
        const result = await manager.run([{ role: 'user', content: 'fail' }]);
        expect(result.success).toBe(false);
        expect(result.error).toContain('LLM unavailable');
    });

    it('reason() yields ERROR when generate throws', async () => {
        const generate = async () => { throw new Error('timeout'); };
        const manager = new ReasoningManager({ generate, maxSteps: 5 });
        const events = [];
        for await (const evt of manager.reason([{ role: 'user', content: 'fail' }])) {
            events.push(evt.eventType);
        }
        expect(events).toContain(ReasoningEventType.ERROR);
    });

    it('reason() yields ERROR on unparseable LLM response', async () => {
        const generate = async () => 'not json at all!!!';
        const manager = new ReasoningManager({ generate, maxSteps: 5 });
        const events = [];
        for await (const evt of manager.reason([{ role: 'user', content: 'fail' }])) {
            events.push(evt.eventType);
        }
        expect(events).toContain(ReasoningEventType.ERROR);
    });

    it('minSteps prevents early FINAL_ANSWER', async () => {
        // generate always returns FINAL_ANSWER, but minSteps=2 should make it take ≥2 steps
        let calls = 0;
        const generate = async () => { calls++; return makeStepJson(NextAction.FINAL_ANSWER); };
        const manager = new ReasoningManager({ generate, maxSteps: 5, minSteps: 3 });
        const result = await manager.run([{ role: 'user', content: 'q' }]);
        expect(result.steps.length).toBeGreaterThanOrEqual(3);
    });

    it('VALIDATE step continues reasoning', async () => {
        let calls = 0;
        const generate = async () => {
            calls++;
            if (calls === 1) return makeStepJson(NextAction.VALIDATE);
            return makeStepJson(NextAction.FINAL_ANSWER);
        };
        const manager = new ReasoningManager({ generate, maxSteps: 5, minSteps: 1 });
        const result = await manager.run([{ role: 'user', content: 'validate me' }]);
        expect(result.steps.length).toBe(2);
    });

    it('RESET clears steps and restarts', async () => {
        let calls = 0;
        const generate = async () => {
            calls++;
            if (calls === 1) return makeStepJson(NextAction.RESET);
            if (calls === 2) return makeStepJson(NextAction.FINAL_ANSWER);
            return makeStepJson(NextAction.FINAL_ANSWER);
        };
        const manager = new ReasoningManager({ generate, maxSteps: 5, minSteps: 1 });
        const result = await manager.run([{ role: 'user', content: 'reset please' }]);
        // run() collects STEP events: RESET step (yielded before reset) + FINAL_ANSWER step = 2
        expect(result.success).toBe(true);
        expect(result.steps.length).toBe(2);
        // The final step is the FINAL_ANSWER, not the RESET step
        expect(result.steps[result.steps.length - 1]?.nextAction).toBe(NextAction.FINAL_ANSWER);
    });

    it('RESET cannot bypass the global maxSteps cap', async () => {
        let calls = 0;
        const generate = async () => {
            calls++;
            return makeStepJson(NextAction.RESET);
        };

        const manager = new ReasoningManager({ generate, maxSteps: 3, minSteps: 1 });
        const result = await manager.run([{ role: 'user', content: 'keep resetting' }]);

        expect(result.success).toBe(true);
        expect(result.steps).toHaveLength(3);
        expect(result.steps.every(step => step.nextAction === NextAction.RESET)).toBe(true);
        expect(calls).toBe(3);
    });

    it('step fields are parsed correctly', async () => {
        const manager = new ReasoningManager({ generate: makeFinalAfterN(1), maxSteps: 3, minSteps: 1 });
        const result = await manager.run([{ role: 'user', content: 'parse me' }]);
        const step = result.steps[0]!;
        expect(step.title).toBe('A step');
        expect(step.confidence).toBe(0.9);
        expect(step.nextAction).toBe(NextAction.FINAL_ANSWER);
    });

    it('step with markdown-fenced JSON is parsed correctly', async () => {
        const generate = async () => '```json\n' + makeStepJson(NextAction.FINAL_ANSWER) + '\n```';
        const manager = new ReasoningManager({ generate, maxSteps: 3, minSteps: 1 });
        const result = await manager.run([{ role: 'user', content: 'fenced' }]);
        expect(result.success).toBe(true);
        expect(result.steps[0]?.nextAction).toBe(NextAction.FINAL_ANSWER);
    });
});

// ── TreeOfThoughtEngine ───────────────────────────────────────────────────────

describe('TreeOfThoughtEngine', () => {
    /** A deterministic generate that always returns a plain-text thought. */
    const deterministicGenerate = async () => 'Think step by step.';

    /** A deterministic evaluate that always returns score 0.8. */
    const deterministicEvaluate = async () => JSON.stringify({ score: 0.8, rationale: 'good' });

    it('solve() returns a TotResult with bestThought', async () => {
        const tot = new TreeOfThoughtEngine({
            generate: deterministicGenerate,
            evaluate: deterministicEvaluate,
            beamWidth: 2,
            maxDepth: 2,
        });

        const result = await tot.solve('What is 2+2?');
        expect(result.bestThought).toBeTruthy();
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThan(0);
    });

    it('solve() populates the nodes array', async () => {
        const tot = new TreeOfThoughtEngine({
            generate: deterministicGenerate,
            evaluate: deterministicEvaluate,
            beamWidth: 2,
            maxDepth: 2,
        });

        const result = await tot.solve('Any goal');
        expect(Array.isArray(result.nodes)).toBe(true);
        expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('solve() with beamWidth=1 and maxDepth=1 visits just one root', async () => {
        const tot = new TreeOfThoughtEngine({
            generate: deterministicGenerate,
            evaluate: deterministicEvaluate,
            beamWidth: 1,
            maxDepth: 1,
        });

        const result = await tot.solve('Simple goal');
        expect(result.nodes.length).toBe(1);
        expect(result.depth).toBe(1);
    });

    it('solve() returns an empty result when no root thoughts can be generated', async () => {
        const tot = new TreeOfThoughtEngine({
            generate: async () => '',
            evaluate: deterministicEvaluate,
            beamWidth: 2,
            maxDepth: 2,
        });

        const result = await tot.solve('Any goal');

        expect(result.bestThought).toBe('');
        expect(result.score).toBe(0);
        expect(result.nodes).toEqual([]);
        expect(result.depth).toBe(0);
    });

    it('solve() uses context in generation', async () => {
        const seen: string[] = [];
        const generate = async (msgs: Array<{ role: string; content: string }>) => {
            seen.push(msgs.map(m => m.content).join(' '));
            return 'step';
        };
        const tot = new TreeOfThoughtEngine({
            generate,
            evaluate: deterministicEvaluate,
            beamWidth: 1,
            maxDepth: 1,
        });

        await tot.solve('goal', 'extra context');
        expect(seen.some(s => s.includes('extra context'))).toBe(true);
    });

    it('solve() falls back to generate for evaluation when evaluate not provided', async () => {
        // When evaluate is not given, generate is used for scoring; we return a valid score JSON
        let callCount = 0;
        const generate = async () => {
            callCount++;
            // First call → generation, subsequent calls → evaluation
            if (callCount > 1) return JSON.stringify({ score: 0.5, rationale: 'ok' });
            return 'a thought';
        };

        const tot = new TreeOfThoughtEngine({ generate, beamWidth: 1, maxDepth: 1 });
        const result = await tot.solve('test');
        expect(result.bestThought).toBeTruthy();
    });
});
