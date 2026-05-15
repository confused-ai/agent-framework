---
title: "API Reference"
description: "Public API map for confused-ai with verified root and subpath imports."
outline: [2, 3]
---

# API Reference

`confused-ai` is a single install. Public docs should use `confused-ai` or `confused-ai/<module>` imports only.

```bash
npm install confused-ai
```

Do not use internal workspace imports such as `@confused-ai/*`. Do not document `confused-ai/contracts/extensions` as a consumer import surface.

## Recommended Import Map

| Import | Use for |
|--------|---------|
| `confused-ai` | Main authoring API: `agent`, `createAgent`, `defineAgent`, `compose`, `pipe` |
| `confused-ai/model` | Provider factories such as `openai`, `anthropic`, and `ollama` |
| `confused-ai/tool` | Tool authoring helpers such as `tool`, `defineTool`, `createTools`, and `extendTool` |
| `confused-ai/tools` | Built-in tools and focused tool subpaths |
| `confused-ai/workflow` | Graphs, orchestration helpers, teams, handoffs, and agent routing |
| `confused-ai/guard` | Circuit breaker, rate limiting, approval primitives, and guardrails |
| `confused-ai/production` | `withResilience` plus audit, checkpoint, idempotency, approval, and tenancy utilities |
| `confused-ai/serve` | HTTP service creation and transport helpers |
| `confused-ai/observe` | Logging, tracing, metrics, and evaluation helpers |
| `confused-ai/session` | Session persistence |
| `confused-ai/memory` | Long-lived and vector memory |
| `confused-ai/knowledge` | Knowledge and retrieval layers |
| `confused-ai/storage` | Generic storage layer |
| `confused-ai/skills` | Skill composition |
| `confused-ai/background` | Background queues and hook offloading |
| `confused-ai/voice` | Voice and speech providers |

`confused-ai/runtime` and `confused-ai/observability` are still exported, but they are compatibility aliases for the same runtime and telemetry surfaces exposed by `confused-ai/serve` and `confused-ai/observe`. For new docs, prefer `serve` and `observe`.

## Root Agent API

Use the root package for the default agent authoring flow.

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

const result = await assistant.run('Say hello in one sentence.');
console.log(result.text);
```

Use `createAgent(...)` when you want the factory-style API directly. Use `Agent` when you want a class-based API with legacy defaults plus modern fluent methods.

## Typed Builder

Use `defineAgent(...)` when you want schema-typed input and output.

```ts
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const qa = defineAgent('qa')
  .model('openai:gpt-4o-mini')
  .input(z.object({ question: z.string() }))
  .output(z.object({ answer: z.string() }))
  .instructions('Answer clearly and briefly.')
  .build();

const result = await qa.run({ question: 'What is 2 + 2?' });
console.log(result.answer, result.runId, result.sessionId);
```

## Models

Use provider factories from `confused-ai/model` when you want explicit model instances instead of string refs.

```ts
import { anthropic, ollama, openai } from 'confused-ai/model';

const primary = openai('gpt-4o-mini');
const backup = anthropic('claude-sonnet-4-20250514');
const local = ollama('llama3.2');

void primary;
void backup;
void local;
```

## Serving Agents Over HTTP

Use `confused-ai/serve` for HTTP endpoints and transports.

```ts
import { agent } from 'confused-ai';
import { createHttpService, listenService } from 'confused-ai/serve';

const chat = agent({
  name: 'chat',
  model: 'openai:gpt-4o-mini',
  instructions: 'You are a chat assistant.',
  tools: [],
  sessionStore: false,
  guardrails: false,
});

const service = createHttpService({
  agents: { chat },
  cors: '*',
});

await listenService(service, 3000);
```

## Production Wrappers

Use `confused-ai/production` for resilience and operational stores.

```ts
import { agent } from 'confused-ai';
import { withResilience } from 'confused-ai/production';

const base = agent({
  name: 'assistant',
  model: 'openai:gpt-4o-mini',
  instructions: 'You are a helpful assistant.',
  tools: [],
  sessionStore: false,
  guardrails: false,
});

const resilient = withResilience(base, {
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
  rateLimit: { maxRpm: 60 },
  retry: { maxRetries: 3, backoffMs: 1_000 },
});

const result = await resilient.run('Summarize three practical TypeScript improvements.');
console.log(result.text);
```

## Tool Catalog Subpaths

Built-in tool collections are exposed under `confused-ai/tools` and focused subpaths such as:

- `confused-ai/tools/search`
- `confused-ai/tools/devtools`
- `confused-ai/tools/utils`
- `confused-ai/tools/communication`

Use `confused-ai/tool` when you are defining tools. Use `confused-ai/tools` when you are importing ready-made tools and toolkits.

## Notes

- Prefer the owning subpath for focused modules like `session`, `memory`, `knowledge`, `storage`, `production`, `background`, `skills`, and `voice`.
- Do not assume every focused module is re-exported from the root package.
- Keep public docs aligned to one install story: `npm install confused-ai`.