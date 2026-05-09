---
title: Workflow Branching & Control Flow
description: Add conditional branching, loops, parallel fan-out, race conditions, and retries to multi-step workflows using branch, loopUntil, forEach, race, and retry.
outline: [2, 3]
---

# Workflow Branching & Control Flow

`@confused-ai/workflow` provides five control-flow primitives that extend the linear `createWorkflow().then(step).commit()` chain into expressive, production-ready graphs.

```ts
import {
  branch,
  loopUntil,
  forEach,
  race,
  retry,
} from '@confused-ai/workflow';
```

All five return objects compatible with `.then()` in the workflow builder — you can mix them freely.

---

## `branch()`

Execute one of several steps based on a runtime condition. Only the matching branch runs.

```ts
import { createWorkflow, createStep, branch } from '@confused-ai/workflow';
import { z } from 'zod';

const classifyStep = createStep({
  name:   'classify',
  input:   z.object({ text: z.string() }),
  output:  z.object({ label: z.enum(['positive', 'negative', 'neutral']), text: z.string() }),
  run: async ({ text }) => ({ label: await classify(text), text }),
});

const positiveStep = createStep({ name: 'positive', input: z.object({ text: z.string() }), output: z.object({ reply: z.string() }), run: async ({ text }) => ({ reply: `Great: ${text}` }) });
const negativeStep = createStep({ name: 'negative', input: z.object({ text: z.string() }), output: z.object({ reply: z.string() }), run: async ({ text }) => ({ reply: `Sorry to hear: ${text}` }) });
const neutralStep  = createStep({ name: 'neutral',  input: z.object({ text: z.string() }), output: z.object({ reply: z.string() }), run: async ({ text }) => ({ reply: `Noted: ${text}` }) });

const sentimentWorkflow = createWorkflow({
  name:  'sentiment-reply',
  input:  z.object({ text: z.string() }),
})
  .then(classifyStep)
  .then(
    branch({
      when: (output) => output.label === 'positive', step: positiveStep,
    }, {
      when: (output) => output.label === 'negative', step: negativeStep,
    }, {
      // default branch — matched when no other condition is true
      step: neutralStep,
    }),
  )
  .commit();

const result = await sentimentWorkflow.run({ text: 'This product is amazing!' });
console.log(result.reply); // "Great: This product is amazing!"
```

### Branch shape

Each branch takes `{ when?, step }`:

```ts
interface BranchCase {
  when?: (output: unknown) => boolean | Promise<boolean>;
  step:  Step;          // the step to run when `when` returns true
}
```

The **first** branch whose `when` returns `true` is executed. If none match and there is no default branch (no `when`), the workflow passes the current output through unchanged.

---

## `loopUntil()`

Repeat a step (or step group) until a condition is met. Useful for polling, retry-with-inspection, or iterative refinement.

```ts
import { createWorkflow, createStep, loopUntil } from '@confused-ai/workflow';
import { z } from 'zod';

const pollStatus = createStep({
  name:   'poll_status',
  input:   z.object({ jobId: z.string() }),
  output:  z.object({ jobId: z.string(), status: z.string(), result: z.string().optional() }),
  run: async ({ jobId }) => {
    const job = await api.jobs.get(jobId);
    return { jobId, status: job.status, result: job.result };
  },
});

const waitForCompletion = createWorkflow({
  name:  'wait-for-job',
  input:  z.object({ jobId: z.string() }),
})
  .then(
    loopUntil(pollStatus, {
      condition:   (output) => output.status === 'completed' || output.status === 'failed',
      delayMs:     2_000,      // wait 2s between iterations
      maxAttempts: 30,         // give up after 30 polls (1 minute)
      onTimeout:   'throw',    // 'throw' | 'break' (default: 'throw')
    }),
  )
  .commit();

const { status, result } = await waitForCompletion.run({ jobId: 'job-abc123' });
```

### `loopUntil` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `condition` | `(output) => boolean` | — | **Required.** Stop looping when this returns `true`. |
| `delayMs` | `number` | `0` | Wait between iterations. |
| `maxAttempts` | `number` | `Infinity` | Hard cap on iterations. |
| `onTimeout` | `'throw' \| 'break'` | `'throw'` | Behaviour when `maxAttempts` is reached. |

---

## `forEach()`

Fan-out over an array output — run a step once per item, collect results.

```ts
import { createWorkflow, createStep, forEach } from '@confused-ai/workflow';
import { z } from 'zod';

const fetchRepoList = createStep({
  name:   'fetch_repos',
  input:   z.object({ org: z.string() }),
  output:  z.object({ repos: z.array(z.string()) }),
  run: async ({ org }) => ({
    repos: await github.listRepos(org),
  }),
});

const analyseRepo = createStep({
  name:   'analyse_repo',
  input:   z.object({ item: z.string() }),    // forEach injects `item` for each element
  output:  z.object({ repo: z.string(), stars: z.number() }),
  run: async ({ item: repoName }) => ({
    repo:  repoName,
    stars: (await github.getRepo(repoName)).stargazers_count,
  }),
});

const orgAnalysis = createWorkflow({
  name:  'org-analysis',
  input:  z.object({ org: z.string() }),
})
  .then(fetchRepoList)
  .then(
    forEach(analyseRepo, {
      arrayKey:    'repos',      // key in the previous step's output that holds the array
      concurrency: 5,            // run up to 5 analyses in parallel
      resultKey:   'analyses',   // key in the final output holding the results array
    }),
  )
  .commit();

const { analyses } = await orgAnalysis.run({ org: 'confused-ai' });
// analyses: [{ repo: 'confused-ai', stars: 2100 }, ...]
```

### `forEach` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `arrayKey` | `string` | — | **Required.** Key in previous output containing the array. |
| `concurrency` | `number` | `1` | Max parallel executions. |
| `resultKey` | `string` | `'results'` | Key in output holding the collected results. |
| `onError` | `'throw' \| 'skip'` | `'throw'` | Behaviour when a single item fails. |

---

## `race()`

Run multiple steps concurrently and use the **first** result that resolves. All other steps are cancelled.

```ts
import { createWorkflow, createStep, race } from '@confused-ai/workflow';
import { z } from 'zod';

const searchGoogle = createStep({
  name:   'google',
  input:   z.object({ query: z.string() }),
  output:  z.object({ results: z.array(z.string()) }),
  run: async ({ query }) => ({ results: await google.search(query) }),
});

const searchBing = createStep({
  name:   'bing',
  input:   z.object({ query: z.string() }),
  output:  z.object({ results: z.array(z.string()) }),
  run: async ({ query }) => ({ results: await bing.search(query) }),
});

const searchDDG = createStep({
  name:   'ddg',
  input:   z.object({ query: z.string() }),
  output:  z.object({ results: z.array(z.string()) }),
  run: async ({ query }) => ({ results: await ddg.search(query) }),
});

const fastSearch = createWorkflow({
  name:  'fastest-search',
  input:  z.object({ query: z.string() }),
})
  .then(
    race([searchGoogle, searchBing, searchDDG], {
      timeoutMs: 3_000,    // optional: if no step resolves in time, throw
    }),
  )
  .commit();

// Returns whichever search engine responds first
const { results } = await fastSearch.run({ query: 'confused-ai framework' });
```

### `race` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeoutMs` | `number` | `Infinity` | Throw if no step resolves within this time. |

---

## `retry()`

Wrap a step (or entire sub-workflow) with retry logic at the workflow level. Retries the step from scratch on failure with exponential backoff.

```ts
import { createWorkflow, createStep, retry } from '@confused-ai/workflow';
import { z } from 'zod';

const sendWebhook = createStep({
  name:   'send_webhook',
  input:   z.object({ url: z.string(), payload: z.unknown() }),
  output:  z.object({ sent: z.boolean(), status: z.number() }),
  run: async ({ url, payload }) => {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Webhook failed: ${res.status}`);
    return { sent: true, status: res.status };
  },
});

const reliableWebhook = createWorkflow({
  name:  'reliable-webhook',
  input:  z.object({ url: z.string(), payload: z.unknown() }),
})
  .then(
    retry(sendWebhook, {
      maxAttempts:    4,
      initialDelayMs: 500,
      backoffFactor:  2,          // 500ms → 1s → 2s
      jitter:         true,
      shouldRetry:   (error) => {
        // Only retry on network errors, not payload validation errors
        return error.message.startsWith('Webhook failed:');
      },
    }),
  )
  .commit();
```

### `retry` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | `number` | `3` | Total attempts (including first). |
| `initialDelayMs` | `number` | `100` | Delay before the first retry. |
| `backoffFactor` | `number` | `2` | Multiplier applied to delay each retry. |
| `jitter` | `boolean` | `true` | Add ±50% random variation to delays. |
| `shouldRetry` | `(err) => boolean` | always | Predicate to decide whether to retry. |

---

## Composing control-flow primitives

All five primitives are composable — you can nest and combine them:

```ts
const complexWorkflow = createWorkflow({ name: 'complex', input: z.object({ items: z.array(z.string()) }) })
  // Fan out over items
  .then(forEach(processItem, { arrayKey: 'items', concurrency: 3 }))

  // Branch based on total success rate
  .then(branch(
    { when: (out) => out.successRate >= 0.9, step: archiveStep },
    { when: (out) => out.successRate >= 0.5, step: partialSuccessStep },
    { step: failureStep },
  ))

  // Retry any remaining notification
  .then(retry(notifyStep, { maxAttempts: 3 }))

  .commit();
```

---

## Summary

| Primitive | Use case |
|-----------|---------|
| `branch()` | Route to different steps based on a condition |
| `loopUntil()` | Repeat a step until a condition is met |
| `forEach()` | Fan-out over an array, collect results |
| `race()` | Run multiple steps, use the fastest result |
| `retry()` | Retry a step on failure with backoff |

---

## See also

- [Workflows](/guide/workflows) — `createWorkflow`, `createStep`, suspend/resume
- [Execution Engine](/guide/graph) — DAG-based workflow execution
- [Orchestration](/guide/orchestration) — multi-agent teams, supervisor, swarm
