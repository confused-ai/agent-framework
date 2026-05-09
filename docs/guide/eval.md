---
title: Evaluation & Benchmarking
description: Measure agent quality with scorers, LLM-as-judge, ROUGE-L, regression detection, and CI integration.
outline: [2, 3]
---

# Evaluation & Benchmarking

`@confused-ai/eval` provides everything you need to measure, compare, and gate agent quality in CI.

```ts
import {
  runBenchmark,
  runEvalSuite,
  exactMatchScorer,
  containsScorer,
  wordOverlapScorer,
  rougeLScorer,
  llmJudgeScorer,
  customScorer,
  formatBenchmarkReport,
} from '@confused-ai/eval';
```

---

## Core concepts

| Concept | What it is |
|---------|-----------|
| **EvalDataset** | Array of `{ input, expectedOutput }` pairs |
| **Scorer** | Function that grades an agent output (0–1) |
| **EvalResult** | Score + metadata for one dataset item |
| **EvalSuite** | Named collection of datasets + scorers |
| **Benchmark** | Run an agent against a dataset, collect scores, produce a report |

---

## Quick start — single benchmark

```ts
import { runBenchmark, containsScorer, formatBenchmarkReport } from '@confused-ai/eval';
import { agent } from 'confused-ai';

const ai = agent({ model: 'gpt-4o-mini', instructions: 'Answer geography questions.' });

const dataset = [
  { input: 'Capital of France?',   expectedOutput: 'Paris'   },
  { input: 'Capital of Japan?',    expectedOutput: 'Tokyo'   },
  { input: 'Capital of Germany?',  expectedOutput: 'Berlin'  },
  { input: 'Capital of Brazil?',   expectedOutput: 'Brasília' },
];

const report = await runBenchmark({
  agent:   ai,
  dataset,
  scorers: [containsScorer()],     // output must contain the expected string
  concurrency: 4,
});

console.log(formatBenchmarkReport(report));
// ┌─ Benchmark Report ──────────────────────────────────┐
// │ Total: 4   Passed: 4   Failed: 0   Avg score: 1.00  │
// │ Duration: 3.2s                                       │
// └──────────────────────────────────────────────────────┘
```

---

## Scorers

### `exactMatchScorer()`

Returns `1.0` when `output === expectedOutput` (trimmed, case-insensitive by default), `0.0` otherwise.

```ts
import { exactMatchScorer } from '@confused-ai/eval';

const scorer = exactMatchScorer({
  caseSensitive: false,   // default: false
  trim: true,             // default: true
});
```

Use for structured outputs where you need bit-for-bit precision (e.g. classification labels, IDs).

---

### `containsScorer()`

Returns `1.0` if the output **contains** the expected string, `0.0` otherwise.

```ts
import { containsScorer } from '@confused-ai/eval';

const scorer = containsScorer({
  caseSensitive: false,
});
```

Use for free-text answers where you care that a fact appears, not the exact phrasing.

---

### `wordOverlapScorer()`

Returns the Jaccard similarity between the output and expected output word sets (value between 0 and 1).

```ts
import { wordOverlapScorer } from '@confused-ai/eval';

const scorer = wordOverlapScorer();

// output:   "Paris is the capital of France and a major European city"
// expected: "Paris"
// score:    1/13 ≈ 0.077 (only "Paris" is shared)
```

Good for rough similarity checks when exact match is too strict.

---

### `rougeLScorer()`

ROUGE-L (longest-common-subsequence) F1 score. Standard NLP metric for text summarisation quality.

```ts
import { rougeLScorer } from '@confused-ai/eval';

const scorer = rougeLScorer();

// output:   "The quick brown fox jumped over the lazy dog"
// expected: "The quick brown fox jumps over a dog"
// score:    ~0.75 (most words matched in order)
```

Use for summarisation, paraphrase detection, and NLG tasks.

---

### `llmJudgeScorer()`

Uses a separate LLM to evaluate whether the output is a correct, high-quality answer. Returns a score between 0 and 1 along with the judge's reasoning.

```ts
import { llmJudgeScorer } from '@confused-ai/eval';
import { OpenAIProvider } from '@confused-ai/models';

const judge = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' });

const scorer = llmJudgeScorer({
  judge,
  criteria: `
    Score the answer on a scale of 0.0 to 1.0 based on:
    - Factual accuracy (40%)
    - Completeness (30%)
    - Conciseness (30%)
    Return a JSON object: { "score": <float>, "reasoning": "<string>" }
  `,
});
```

::: tip When to use LLM-as-judge
Use for open-ended tasks where rule-based scorers can't capture quality:
- Long-form writing
- Explanations with multiple valid phrasings
- Creative tasks
:::

---

### `customScorer()`

Wrap any function as a scorer:

```ts
import { customScorer } from '@confused-ai/eval';

const hasJsonScorer = customScorer((output, expected) => {
  try {
    JSON.parse(output);
    return 1.0;
  } catch {
    return 0.0;
  }
});

const lengthScorer = customScorer((output, expected) => {
  // Penalise outputs longer than 2x the expected
  if (output.length > expected.length * 2) return 0.5;
  return 1.0;
});
```

---

## Running multiple scorers

Pass multiple scorers to `runBenchmark`. Each item gets all scores; the overall pass/fail uses the **minimum** score across scorers:

```ts
const report = await runBenchmark({
  agent,
  dataset,
  scorers: [
    containsScorer(),
    rougeLScorer(),
    llmJudgeScorer({ judge, criteria: '...' }),
  ],
  passThreshold: 0.7,     // minimum score to count as "passed"
  concurrency:   4,
});
```

---

## `runBenchmark` options

```ts
interface BenchmarkConfig {
  agent:          Agent;              // any confused-ai agent
  dataset:        EvalDataset;        // array of { input, expectedOutput }
  scorers:        Scorer[];           // one or more scorers
  passThreshold?: number;             // score ≥ this = pass (default: 0.5)
  concurrency?:   number;             // parallel runs (default: 1)
  timeout?:       number;             // per-item timeout ms (default: 30_000)
  onItem?:        (result: EvalResult) => void; // progress callback
}
```

---

## `formatBenchmarkReport()`

Pretty-prints a benchmark report to a string:

```ts
import { formatBenchmarkReport } from '@confused-ai/eval';

const report = await runBenchmark({ ... });
const text = formatBenchmarkReport(report);

console.log(text);
// You can also write it to a file for CI artifacts
import { writeFileSync } from 'node:fs';
writeFileSync('./eval-report.txt', text);
```

---

## Regression detection with `runEvalSuite`

`runEvalSuite` runs a structured eval suite and saves results to an `EvalStore`. On the next run it compares against the saved baseline and fails if the score drops.

```ts
import { runEvalSuite, InMemoryEvalStore, exactMatchScorer } from '@confused-ai/eval';
import { SqliteEvalStore } from 'confused-ai/observability';
import { agent } from 'confused-ai';

const ai = agent({ model: 'gpt-4o-mini', instructions: 'Answer questions.' });

// In CI: use SqliteEvalStore to persist baselines across runs
const store = new SqliteEvalStore('./eval-baseline.db');

const suite = {
  name: 'geography-qa',
  agent: ai,
  dataset: [
    { input: 'Capital of France?',  expectedOutput: 'Paris'  },
    { input: 'Capital of Japan?',   expectedOutput: 'Tokyo'  },
  ],
  scorers: [containsScorer()],
};

const result = await runEvalSuite(suite, store);

if (!result.passed) {
  console.error('Eval regression detected!');
  console.error(`Score dropped from ${result.baselineScore} to ${result.currentScore}`);
  process.exit(1);
}
```

### `EvalStore` implementations

| Store | Package | Best for |
|-------|---------|---------|
| `InMemoryEvalStore` | `@confused-ai/eval` | Unit tests |
| `SqliteEvalStore` | `confused-ai/observability` | CI pipelines |

---

## CI integration

Add to your CI pipeline to block merges when agent quality regresses:

```yaml [.github/workflows/eval.yml]
name: Agent Eval

on:
  pull_request:
    branches: [main]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install
        run: bun install

      - name: Run eval suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: bun run eval:ci

      - name: Upload eval report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-report
          path: eval-report.txt
```

```json [package.json]
{
  "scripts": {
    "eval:ci": "bun run examples/eval-regression.ts"
  }
}
```

---

## Benchmark scorers reference

| Scorer | Return range | Speed | LLM call? |
|--------|-------------|-------|-----------|
| `exactMatchScorer` | 0 or 1 | Instant | No |
| `containsScorer` | 0 or 1 | Instant | No |
| `wordOverlapScorer` | 0–1 | Instant | No |
| `rougeLScorer` | 0–1 | Instant | No |
| `llmJudgeScorer` | 0–1 | Slow | Yes |
| `customScorer` | 0–1 | Varies | Optional |

---

## EvalResult shape

Each item in the benchmark produces an `EvalResult`:

```ts
interface EvalResult {
  input:          string;
  expectedOutput: string;
  actualOutput:   string;
  scores:         Record<string, number>;  // scorer name → score
  overallScore:   number;                  // minimum across scorers
  passed:         boolean;                 // overallScore >= passThreshold
  durationMs:     number;
  error?:         string;                  // set if the agent threw
}
```

---

## Advanced — multi-agent eval

Evaluate different agent configurations side by side:

```ts
import { runBenchmark, rougeLScorer } from '@confused-ai/eval';
import { agent } from 'confused-ai';

const dataset = [/* ... */];
const scorers = [rougeLScorer()];

const [reportA, reportB] = await Promise.all([
  runBenchmark({ agent: agent({ model: 'gpt-4o',      instructions: '...' }), dataset, scorers }),
  runBenchmark({ agent: agent({ model: 'gpt-4o-mini', instructions: '...' }), dataset, scorers }),
]);

console.log(`gpt-4o      avg: ${reportA.averageScore.toFixed(3)}`);
console.log(`gpt-4o-mini avg: ${reportB.averageScore.toFixed(3)}`);
console.log(`Cost saved: ${reportA.totalCostUsd - reportB.totalCostUsd} USD`);
```

---

## See also

- [22 · Eval Regression Guard](/examples/22-eval-ci) — end-to-end example with CI exit code
- [Observability & OTLP](/guide/observability) — OTLP tracing for eval runs
- [Learning Machine](/guide/learning-machine) — persistent knowledge built from eval feedback
