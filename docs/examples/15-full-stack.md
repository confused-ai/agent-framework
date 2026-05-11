# 15 · Full-Stack App

This page keeps the "full-stack" shape realistic: one agent, one HTTP runtime, one session store, and one tool. Add memory, knowledge, and production modules only when the simpler path is already working.

## Example

```ts
import { z } from 'zod/v3';
import { createAgent, tool } from 'confused-ai';
import { InMemorySessionStore } from 'confused-ai/session';
import { createHttpService, listenService } from 'confused-ai/serve';

const lookupInventory = tool({
  name: 'lookup_inventory',
  description: 'Return a mock inventory count for a SKU.',
  parameters: z.object({ sku: z.string() }),
  execute: async ({ sku }) => ({ sku, available: 17, warehouse: 'east-1' }),
});

const assistant = createAgent({
  name: 'store-ops',
  instructions: 'Help store managers with stock and policy questions.',
  model: 'gpt-4o-mini',
  tools: [lookupInventory],
  sessionStore: new InMemorySessionStore(),
  hooks: {
    afterRun: (result) => {
      console.log('agent:run', { steps: result.steps, usage: result.usage });
      return result;
    },
  },
});

const service = createHttpService({
  agents: { assistant },
  cors: '*',
});

void listenService(service, 3000);
```

## Layer in extra modules deliberately

1. Add `memoryStore` after session continuity is already working.
2. Add `knowledgebase` when you have real documents to retrieve.
3. Add `withResilience()` and approval or audit stores when the app is moving into production.