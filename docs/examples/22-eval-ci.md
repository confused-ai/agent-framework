# 22 · Eval Regression Guard

The public eval workflow is `runEvalSuite()` plus an `EvalStore`. Keep the dataset small and deterministic first, then move to larger suites or judge-based scoring.

## Example

```ts
import { bare } from 'confused-ai';
import {
  InMemoryEvalStore,
  runEvalSuite,
  type EvalDatasetItem,
  wordOverlapF1,
} from 'confused-ai/observe';

const dataset: EvalDatasetItem[] = [
  {
    input: 'What is the return policy?',
    expectedOutput: 'You can return any item within 30 days for a full refund.',
  },
  {
    input: 'How do I track my order?',
    expectedOutput: 'Visit the Orders page or check your confirmation email for a tracking link.',
  },
];

const llm = {
  async generateText(messages: Array<{ role: string; content: unknown }>) {
    const prompt = String(messages.at(-1)?.content ?? '');

    if (prompt.toLowerCase().includes('return policy')) {
      return {
        text: 'You can return any item within 30 days for a full refund.',
        finishReason: 'stop' as const,
      };
    }

    return {
      text: 'Visit the Orders page or check your confirmation email for a tracking link.',
      finishReason: 'stop' as const,
    };
  },
};

const scorer = (_input: string, expected: string | undefined, actual: string) =>
  expected ? wordOverlapF1(actual, expected) : 0;

const agent = bare({
  name: 'support-eval',
  instructions: 'Answer support questions using the documented policy only.',
  llm,
  tools: false,
  maxSteps: 1,
});

const report = await runEvalSuite({
  suiteName: 'support-qa',
  dataset,
  agent,
  store: new InMemoryEvalStore(),
  scorer,
  passingScore: 0.6,
  regressionThreshold: 0.05,
  setBaseline: true,
});

console.log(report.averageScore);
console.log(report.passed);
```

## Practical rollout

- Start with `InMemoryEvalStore` for local iteration.
- Switch to `createSqliteEvalStore()` when you want persisted baselines across CI runs.
- Keep `suiteName` stable so regression comparisons stay meaningful.