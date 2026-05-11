---
title: Evaluation
description: Score agent outputs with LLM-as-judge, text metrics, benchmark suites, regression detection, and eval dataset persistence.
outline: [2, 3]
---

# Evaluation

The evaluation framework gives you LLM-as-judge scoring, text metrics (ROUGE-L, word overlap), benchmark runners, persistent eval stores, and CI regression detection. Import from `confused-ai`.

## LLM-as-judge

Score a response against a prompt with an LLM:

```ts
import { runLlmAsJudge } from 'confused-ai';
import { OpenAIProvider } from 'confused-ai';

const llm = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' });

const result = await runLlmAsJudge({
  llm,
  prompt: 'Explain how transformers work.',
  response: agentResult.text,
  criteria: [
    { name: 'accuracy',    description: 'Is the explanation factually correct?',     weight: 0.5 },
    { name: 'clarity',     description: 'Is it easy for a non-expert to understand?', weight: 0.3 },
    { name: 'conciseness', description: 'Is it concise without losing key details?',  weight: 0.2 },
  ],
});

console.log(result.score);         // 0.0 – 1.0
console.log(result.reasoning);     // judge explanation
console.log(result.criteriaScores); // per-criterion breakdown
```

### Pre-built criteria sets

```ts
import { RAG_CRITERIA, AGENT_CRITERIA } from 'confused-ai';

// For RAG agents: faithfulness, answer relevance, context precision, recall
const ragResult = await runLlmAsJudge({ llm, prompt, response, criteria: RAG_CRITERIA });

// For general agents: correctness, helpfulness, safety, coherence
const agentResult2 = await runLlmAsJudge({ llm, prompt, response, criteria: AGENT_CRITERIA });
```

### Multi-criteria judge

```ts
import { createMultiCriteriaJudge } from 'confused-ai';

const judge = createMultiCriteriaJudge({
  llm,
  criteria: AGENT_CRITERIA,
});

const scores = await judge.evaluate({ prompt, response });
```

---

## Text metrics

Fast, deterministic metrics that require no LLM:

```ts
import {
  ExactMatchAccuracy,
  PartialMatchAccuracy,
  LevenshteinAccuracy,
  wordOverlapF1,
  rougeLWords,
} from 'confused-ai';

// Exact string match
const exact = new ExactMatchAccuracy();
console.log(exact.score('hello world', 'hello world')); // 1.0
console.log(exact.score('hello world', 'Hello World')); // 0.0

// Case-insensitive partial match
const partial = new PartialMatchAccuracy({ caseInsensitive: true });
console.log(partial.score('hello world', 'hello'));  // 1.0

// Edit distance
const lev = new LevenshteinAccuracy();
console.log(lev.score('kitten', 'sitting')); // 0.57

// Word overlap F1 (great for longer text)
console.log(wordOverlapF1('the cat sat on the mat', 'the cat sat'));  // 0.75

// ROUGE-L (longest common subsequence)
console.log(rougeLWords('the cat sat on the mat', 'cat sat on mat'));  // 0.83
```

---

## Batch eval runner

Run an eval against a dataset and collect aggregate metrics:

```ts
import { runEvalBatch } from 'confused-ai';
import { createAgent } from 'confused-ai';

const agent = createAgent({ name: 'agent', instructions: '...', model: 'gpt-4o-mini', apiKey: '...' });

const cases = [
  { prompt: 'What is 2 + 2?',          expectedOutput: '4' },
  { prompt: 'Capital of France?',       expectedOutput: 'Paris' },
  { prompt: 'Who wrote Hamlet?',        expectedOutput: 'Shakespeare' },
];

const results = await runEvalBatch({
  agent,
  cases,
  scorers: [
    new ExactMatchAccuracy(),
    new PartialMatchAccuracy({ caseInsensitive: true }),
  ],
  concurrency: 3,
});

console.log(results.summary);
// { totalCases: 3, passed: 2, failed: 1, avgScore: 0.83, p50Latency: 420 }
```

---

## Benchmark pipeline

Run a full benchmark with multiple scorers and get a formatted report:

```ts
import {
  runBenchmark,
  exactMatchScorer,
  containsScorer,
  wordOverlapScorer,
  rougeLScorer,
  llmJudgeScorer,
  formatBenchmarkReport,
} from 'confused-ai';

const report = await runBenchmark({
  name: 'qa-benchmark-v3',
  samples: [
    { input: 'What is the boiling point of water?', expected: '100°C' },
    { input: 'Who invented the telephone?',          expected: 'Alexander Graham Bell' },
  ],
  run: async (sample) => {
    const result = await agent.run(sample.input);
    return result.text;
  },
  scorers: [
    exactMatchScorer({ caseSensitive: false }),
    containsScorer(),
    wordOverlapScorer({ threshold: 0.7 }),
    rougeLScorer({ threshold: 0.6 }),
    llmJudgeScorer({ llm, criteria: AGENT_CRITERIA }),
  ],
  concurrency: 5,
  timeoutMs: 30_000,
});

console.log(formatBenchmarkReport(report));
```

---

## Eval store — persist and query results

```ts
import { InMemoryEvalStore, SqliteEvalStore, runEvalSuite } from 'confused-ai';

// Development: in-memory
const store = new InMemoryEvalStore();

// Production: SQLite (or use a Postgres eval store)
const store2 = createSqliteEvalStore({ path: './evals.db' });

const suite = await runEvalSuite({
  store: store2,
  name: 'customer-service-v2',
  agent,
  cases,
  scorers: [wordOverlapScorer(), llmJudgeScorer({ llm, criteria: AGENT_CRITERIA })],
});

// Query stored results
const history = await store2.query({ suiteName: 'customer-service-v2', limit: 10 });
console.log(history.map(r => ({ date: r.createdAt, avgScore: r.summary.avgScore })));
```

---

## Regression detection (CI/CD)

Compare a new eval run against a baseline and fail if scores drop:

```ts
import { runEvalSuite } from 'confused-ai';

const suite = await runEvalSuite({
  store,
  name: 'regression-check',
  agent,
  cases,
  scorers: [wordOverlapScorer({ threshold: 0.7 })],
  regression: {
    baselineSuiteName: 'regression-check',      // compare against last stored run
    failIfScoreDropsBy: 0.05,                   // fail CI if avg score drops > 5%
    failIfPassRateDropsBy: 0.1,                 // fail CI if pass rate drops > 10%
  },
});

if (suite.regressionDetected) {
  console.error('Regression detected!', suite.regressionDetails);
  process.exit(1);
}
```

---

## Dataset loading

```ts
import { loadDataset } from 'confused-ai';

// JSON lines
const jsonlCases = await loadDataset('./evals/qa.jsonl');

// CSV (first column = prompt, second = expected)
const csvCases = await loadDataset('./evals/qa.csv', { format: 'csv' });

// Inline
const inlineCases = [
  { prompt: '...', expected: '...' },
];
```

---

## Fine-tuning dataset generator

Collect high-quality runs and export them as fine-tuning data:

```ts
import { generateFineTuningDataset } from 'confused-ai';

const dataset = await generateFineTuningDataset({
  store,                       // eval store with saved runs
  suiteName: 'production-logs',
  minScore: 0.9,               // only include runs that scored ≥ 0.9
  format: 'openai-chat',       // 'openai-chat' | 'anthropic' | 'jsonl'
  outputPath: './finetune-data.jsonl',
});

console.log(`Exported ${dataset.count} examples`);
```

---

## Where to go next

- [Observability](./observability) — trace and measure agent runs in production.
- [Production](./production) — circuit breakers, budget tracking, and rate limits.
- [Examples: eval CI pipeline](../examples/22-eval-ci) — complete CI regression example.
