# 17 · Full Framework Showcase

This page is the map, not the kitchen sink. The safest public story is one small runnable slice plus a clear module layout.

## One end-to-end slice

```ts
import { z } from 'zod/v3';
import { createAgent, tool } from 'confused-ai';
import { InMemorySessionStore } from 'confused-ai/session';
import { createHttpService, listenService } from 'confused-ai/serve';

const lookupStorePolicy = tool({
  name: 'lookup_store_policy',
  description: 'Return a mock store policy by topic.',
  parameters: z.object({ topic: z.string() }),
  execute: async ({ topic }) => ({
    topic,
    answer: `Policy for ${topic}: 30-day return window with manager approval after day 30.`,
  }),
});

const storeOps = createAgent({
  name: 'store-ops',
  instructions: 'Help store managers with policy questions and operational summaries.',
  model: 'gpt-4o-mini',
  tools: [lookupStorePolicy],
  sessionStore: new InMemorySessionStore(),
});

const service = createHttpService({
  agents: { storeOps },
  cors: '*',
});

void listenService(service, 8787);
```

## How the platform fits together

- Agent creation: `createAgent()`, `agent()`, or `bare()` depending on how much control you want.
- Tools: `tool()` for lightweight tools, `confused-ai/tool` for MCP and the broader tools surface.
- Sessions: `confused-ai/session` for conversation continuity.
- HTTP runtime: `confused-ai/serve` for REST, SSE, and OpenAPI.
- Orchestration: `confused-ai/orchestration` for teams, supervisors, routing, and handoffs.
- Production: `confused-ai/production` and `confused-ai/guard` for checkpointing, budgets, resilience, rate limits, and circuit breakers.
- Observability: `confused-ai/observe` for metrics, tracing, evals, and reporting.

## Use this page as a decision map

Start with one agent, one session store, and one HTTP service. Add orchestration, evals, or production controls only when the simpler path is already stable.