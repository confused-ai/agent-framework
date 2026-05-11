---
title: agent() / createAgent()
description: Choose the right agent authoring API and understand the common runtime patterns.
outline: [2, 3]
---

# agent() / createAgent()

The root package exposes four related ways to author agents. They solve different levels of control, not different products.

## Which One To Use

| API | Use when | Recommendation |
|---|---|---|
| `agent()` | You want the default authoring path for new code | Start here |
| `createAgent()` | You want the explicit factory surface or need compatibility with factory-oriented code | Use when the explicit factory is clearer |
| `defineAgent()` | You want typed input and output contracts | Use for app and API boundaries |
| `Agent` | You are maintaining older class-based code | Avoid for new code unless you need the class surface |

## Minimal Agent

```ts
import { agent } from 'confused-ai';

const assistant = agent({
  name: 'assistant',
  model: 'openai:gpt-4o-mini',
  instructions: 'You are a concise assistant.',
  tools: [],
  sessionStore: false,
  guardrails: false,
});

const result = await assistant.run('Summarize vector databases in one sentence.');
console.log(result.text);
```

This is the shortest path to a production-shaped agent. It keeps the important switches visible without forcing you into every optional subsystem.

## What You Configure First

| Option | What it controls | Add it when |
|---|---|---|
| `model` | provider or model instance | always |
| `instructions` | baseline system behavior | always |
| `tools` | callable external capabilities | the model must act on live data or side effects |
| `sessionStore` | conversation continuity | users return across turns |
| `knowledgebase` | retrieval context | the agent should answer from docs, policies, or indexed content |
| `guardrails` | safety and validation | you need policy enforcement or output checking |
| `budget` | token or cost control | production spend matters |

## Running Patterns

### Request and response

```ts
const result = await assistant.run('Explain the difference between recall and precision.');

console.log(result.text);
console.log(result.runId);
console.log(result.sessionId);
```

`run()` is the default request-response path. Use it for server handlers, jobs, and tests.

### Streaming

```ts
for await (const chunk of assistant.stream('Explain TypeScript project references.')) {
  process.stdout.write(chunk);
}
```

Use `stream()` when the user should see tokens arrive incrementally.

## Typed Agent Builder

Use `defineAgent()` when the call boundary matters as much as the text output.

```ts
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const qa = defineAgent('qa')
  .model('openai:gpt-4o-mini')
  .input(z.object({ question: z.string() }))
  .output(z.object({ answer: z.string() }))
  .instructions('Answer clearly and briefly.')
  .build();

const result = await qa.run({ question: 'What does idempotent mean in an API?' });
console.log(result.answer);
```

This is the cleanest pattern when your agent sits behind an HTTP contract, workflow step, or internal SDK.

## Factory Style

`createAgent()` exposes the more explicit factory surface directly.

```ts
import { createAgent } from 'confused-ai';

const assistant = createAgent({
  name: 'assistant',
  model: 'openai:gpt-4o-mini',
  instructions: 'You are a concise assistant.',
  tools: [],
  sessionStore: false,
  guardrails: false,
});
```

Prefer `agent()` when you are writing docs, tutorials, or new app code. Reach for `createAgent()` when the explicit factory name communicates intent better in your codebase.

## Usage Patterns

### Per-request agents

Create the agent near the request boundary when you want isolation, tenant scoping, or request-level configuration.

### Long-lived assistants

Add `sessionStore` and optional `knowledgebase` when you want continuity across turns.

### Production wrappers

Wrap the agent with `withResilience()` from `confused-ai/production` when you want rate limits, retries, circuit breakers, approvals, or audit trails without changing the core authoring flow.

## Related APIs

- [tool() / defineTool()](./tools)
- [KnowledgeEngine / createKnowledgeEngine()](./knowledge)
- [Workflow / Orchestration](./orchestration)