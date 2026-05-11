---
title: Workflows
description: Build DAG-based workflows with GraphBuilder, typed nodes (task, router, parallel, join, agent, wait), event sourcing, and durable execution.
outline: [2, 3]
---

# Workflows

The graph workflow engine lets you build typed, durable DAG workflows with explicit branching, parallel execution, retries, and checkpointing. Import from `confused-ai/workflow`.

## Quick start

```ts
import { createGraph, DAGEngine } from 'confused-ai/workflow';

const graph = createGraph('data-pipeline')
  .task('fetch', async (ctx) => {
    const data = await fetchData(ctx.input.url);
    return { data };
  })
  .task('transform', async (ctx) => {
    const transformed = transform(ctx.state.fetch.data);
    return { transformed };
  })
  .task('save', async (ctx) => {
    await saveToDatabase(ctx.state.transform.transformed);
    return { saved: true };
  })
  .edge('fetch', 'transform')
  .edge('transform', 'save')
  .build();

const engine = new DAGEngine(graph);
const result = await engine.run({ url: 'https://api.example.com/data' });
console.log(result.state);
```

---

## `GraphBuilder`

All graph types are created through the `GraphBuilder` or the `createGraph` helper.

### Node types

| Type | Purpose |
|---|---|
| `task` | Execute a function; can call LLMs, APIs, or any async work |
| `agent` | Run a `createAgent()` agent as a node |
| `router` | Branch to different nodes based on condition |
| `parallel` | Fan out to multiple nodes simultaneously |
| `join` | Wait for all branches to complete before continuing |
| `wait` | Pause for an external event (HITL, webhook, timer) |

### `task` node

```ts
import { GraphBuilder } from 'confused-ai/workflow';

const builder = new GraphBuilder({ id: 'my-graph' });

builder.addNode({
  id: 'classify',
  kind: 'task',
  execute: async (ctx) => {
    const label = await classifyText(ctx.input.text);
    return { label };
  },
  retry: { maxAttempts: 3, delayMs: 1_000, backoffMultiplier: 2 },
  timeout: { ms: 10_000 },
});
```

### `agent` node

```ts
import { createAgent } from 'confused-ai';

const researchAgent = createAgent({
  name: 'researcher',
  instructions: 'Research the given topic thoroughly.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
});

builder.addNode({
  id: 'research',
  kind: 'agent',
  agent: researchAgent,
  inputMapper: (ctx) => ctx.state.classify.label,
  outputMapper: (result) => ({ research: result.text }),
});
```

### `router` node — conditional branching

```ts
builder.addNode({
  id: 'route',
  kind: 'router',
  route: (ctx) => {
    if (ctx.state.classify.label === 'technical') return 'tech-handler';
    if (ctx.state.classify.label === 'billing')   return 'billing-handler';
    return 'general-handler';
  },
});

builder
  .addEdge({ from: 'route', to: 'tech-handler' })
  .addEdge({ from: 'route', to: 'billing-handler' })
  .addEdge({ from: 'route', to: 'general-handler' });
```

### `parallel` node — fan out

```ts
builder.addNode({
  id: 'gather',
  kind: 'parallel',
  branches: ['search-web', 'search-db', 'search-docs'],
});

builder.addNode({
  id: 'merge',
  kind: 'join',
  waitFor: ['search-web', 'search-db', 'search-docs'],
  merge: (results) => ({ combined: results.map(r => r.text).join('\n\n') }),
});
```

### `wait` node — HITL and webhooks

```ts
builder.addNode({
  id: 'await-approval',
  kind: 'wait',
  event: 'human-approval',
  timeoutMs: 86_400_000,  // 24 hours
  onTimeout: 'auto-approve',  // or 'fail'
});
```

---

## Full DAG example: content pipeline

```ts
import { createGraph, DAGEngine } from 'confused-ai/workflow';
import { createAgent } from 'confused-ai';

const outline  = createAgent({ name: 'outliner', instructions: 'Create a detailed outline.',          model: 'gpt-4o-mini', apiKey: '...' });
const sections = createAgent({ name: 'writer',   instructions: 'Write a section from the outline.',   model: 'gpt-4o',      apiKey: '...' });
const review   = createAgent({ name: 'reviewer', instructions: 'Review for accuracy and readability.',model: 'gpt-4o-mini', apiKey: '...' });
const seo      = createAgent({ name: 'seo',      instructions: 'Add SEO keywords and meta tags.',     model: 'gpt-4o-mini', apiKey: '...' });

const graph = createGraph('content-pipeline')
  .agent('plan',   outline,  { inputMapper: (ctx) => ctx.input.topic })
  .parallel('write-sections', ['section-intro', 'section-body', 'section-conclusion'])
  .agent('section-intro',       sections, { inputMapper: (ctx) => `Intro: ${ctx.state.plan.text}` })
  .agent('section-body',        sections, { inputMapper: (ctx) => `Body: ${ctx.state.plan.text}` })
  .agent('section-conclusion',  sections, { inputMapper: (ctx) => `Conclusion: ${ctx.state.plan.text}` })
  .join('assemble', ['section-intro', 'section-body', 'section-conclusion'])
  .agent('review', review, { inputMapper: (ctx) => ctx.state.assemble.combined })
  .agent('seo',    seo,    { inputMapper: (ctx) => ctx.state.review.text })
  .edge('plan',          'write-sections')
  .edge('write-sections','section-intro')
  .edge('write-sections','section-body')
  .edge('write-sections','section-conclusion')
  .edge('section-intro', 'assemble')
  .edge('section-body',  'assemble')
  .edge('section-conclusion', 'assemble')
  .edge('assemble', 'review')
  .edge('review',   'seo')
  .build();

const engine = new DAGEngine(graph);
const result = await engine.run({ topic: 'The future of TypeScript in 2027' });
console.log(result.state.seo.text);
```

---

## `compose` and `pipe` — lightweight pipelines

For simple sequential chains without the full graph engine:

```ts
import { compose, pipe } from 'confused-ai/workflow';
import { createAgent } from 'confused-ai';

// compose: agents in sequence, output → input
const chain = compose(researchAgent, writeAgent, editAgent);
const result = await chain.run('Write a blog post on Rust async runtimes.');

// pipe: functional transform chain
const process = pipe(
  async (topic: string) => researchAgent.run(topic),
  async (r)             => writeAgent.run(r.text),
  async (r)             => editAgent.run(r.text),
);
const final = await process('Rust async runtimes');
```

---

## Retry policies

```ts
builder.addNode({
  id: 'call-external-api',
  kind: 'task',
  execute: async (ctx) => callApi(ctx.input),
  retry: {
    maxAttempts: 5,
    delayMs: 500,
    backoffMultiplier: 2,   // exponential backoff
    maxDelayMs: 10_000,
    retryOn: (err) => err.message.includes('rate limit') || err.message.includes('timeout'),
  },
});
```

---

## Checkpointing (durable workflows)

The graph engine emits `GraphEvent`s. Plug in an `EventStore` to replay interrupted workflows:

```ts
import { DAGEngine } from 'confused-ai/workflow';
import { SqliteEventStore } from 'confused-ai';

const engine = new DAGEngine(graph, {
  eventStore: new SqliteEventStore({ path: './workflow-events.db' }),
  checkpointInterval: 'every-node',
});

// On crash/restart, replay from last checkpoint:
const result = await engine.resume(executionId);
```

---

## Where to go next

- [Graph workflow branching](./workflow-branching) — advanced conditional branching patterns.
- [Orchestration](./orchestration) — team, supervisor, and swarm patterns.
- [Production](./production) — circuit breakers, checkpoints, and durable execution.
