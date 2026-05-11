---
title: Graph Workflows
description: Build DAG-based workflows with createGraph(). Node kinds — task, router, parallel, join, agent, wait. Conditional edges, fan-out/fan-in, retry policies, and durable execution with AgentRuntime.
outline: [2, 3]
---

# Graph Workflows

The graph engine executes arbitrary DAGs — directed acyclic graphs — with node-level retries, conditional edges, parallel fan-out, and durable checkpointing. Use it when a pipeline is no longer enough.

```ts
import { createGraph } from 'confused-ai';
import { AgentRuntime } from 'confused-ai';
```

---

## Quick start

```ts
import { createGraph, AgentRuntime } from 'confused-ai';

const graph = createGraph('content-pipeline', { version: '1.0' })
  .addNode('fetch',    { kind: 'task', execute: (ctx) => fetchContent(ctx.state.input as string) })
  .addNode('analyse',  { kind: 'task', execute: (ctx) => analyseContent(ctx.state.results['fetch']) })
  .addNode('publish',  { kind: 'task', execute: (ctx) => publishContent(ctx.state.results['analyse']) })
  .chain('fetch', 'analyse', 'publish')  // linear shorthand
  .build();

const runtime = new AgentRuntime();
const execution = await runtime.run(graph, { input: 'https://example.com/article' });
// execution.state.results — keyed by node name
```

---

## Node kinds

| Kind | Use for |
|---|---|
| `task` | Any async function |
| `agent` | Run an LLM agent |
| `router` | Route to exactly one of multiple targets |
| `parallel` | Fan out to multiple targets concurrently |
| `join` | Wait for all incoming branches, then merge |
| `start` | Entry point (auto-detected if omitted) |
| `end` | Terminal node (optional) |
| `wait` | Pause for an external event or timer |

---

## Task node

```ts
.addNode('process', {
  kind: 'task',
  execute: async (ctx) => {
    // ctx.state.input — initial input
    // ctx.state.results['nodeName'] — output of a previous node
    return await processData(ctx.state.results['fetch']);
  },
  retry: { maxAttempts: 3, delayMs: 1000, backoff: 'exponential' },
  timeout: { durationMs: 30_000 },
})
```

---

## Agent node

Run an LLM agent as a graph node:

```ts
.addNode('summarise', {
  kind: 'agent',
  instructions: 'Summarise the provided text in 3 bullet points.',
  model: 'gpt-4o-mini',
  tools: [webSearchTool],
  maxSteps: 5,
})
```

---

## Router node

Branch to exactly one target based on state:

```ts
.addNode('classify', {
  kind: 'router',
  route: (state) => {
    const category = state.results['classifier'] as string;
    if (category === 'billing')   return 'billing-agent';
    if (category === 'technical') return 'tech-agent';
    return 'general-agent';
  },
})
.addEdge('classify', 'billing-agent')
.addEdge('classify', 'tech-agent')
.addEdge('classify', 'general-agent')
```

---

## Parallel fan-out / join

Run multiple nodes concurrently, then merge results:

```ts
const graph = createGraph('parallel-research')
  .addNode('query',          { kind: 'task', execute: (ctx) => parseQuery(ctx.state.input as string) })
  .addNode('web-search',     { kind: 'task', execute: (ctx) => webSearch(ctx.state.results['query']) })
  .addNode('db-lookup',      { kind: 'task', execute: (ctx) => dbQuery(ctx.state.results['query']) })
  .addNode('docs-search',    { kind: 'task', execute: (ctx) => docSearch(ctx.state.results['query']) })
  .addNode('merge',          {
    kind: 'join',
    merge: (results) => ({
      web:  results['web-search'],
      db:   results['db-lookup'],
      docs: results['docs-search'],
    }),
  })
  .addNode('synthesise',     { kind: 'task', execute: (ctx) => synthesise(ctx.state.results['merge']) })
  .addEdge('query', 'web-search')
  .fanOut('query', ['web-search', 'db-lookup', 'docs-search'])   // parallel edges
  .fanIn(['web-search', 'db-lookup', 'docs-search'], 'merge')    // join
  .addEdge('merge', 'synthesise')
  .build();
```

---

## Conditional edges

Add a condition on any edge:

```ts
.addEdge('review', 'publish', {
  condition: (state) => (state.results['review'] as string).includes('approved'),
})
.addEdge('review', 'revise', {
  condition: (state) => !(state.results['review'] as string).includes('approved'),
})
```

---

## Graph-level options

```ts
createGraph('my-workflow')
  .defaultRetry({ maxAttempts: 3, delayMs: 500, backoff: 'exponential' })
  .defaultTimeout({ durationMs: 60_000 })
  .maxConcurrency(4)   // max parallel nodes
  .description('Content generation pipeline')
  .version('2.0')
```

---

## Durable execution with `AgentRuntime`

`AgentRuntime` persists execution state so runs survive process restarts:

```ts
import { AgentRuntime } from 'confused-ai';
import { SqliteAgentDb } from 'confused-ai';

const runtime = new AgentRuntime({
  db: new SqliteAgentDb({ path: './agent.db' }),
  maxConcurrency: 8,
});

const execution = await runtime.run(graph, { input: 'my-input' });
// execution.status   — 'completed' | 'failed' | 'running'
// execution.results  — node-keyed results map
```

---

## Where to go next

- [Workflow branching](./workflow-branching) — conditional routing patterns.
- [Compose](./compose) — simpler linear pipelines.
- [Orchestration](./orchestration) — supervisor/consensus patterns for agent teams.
