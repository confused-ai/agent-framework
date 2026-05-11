---
title: Custom Tools
description: Author tools with tool(), defineTool, and createTools(). Schema validation with Zod. ToolContext for runId, userId, signal. Approval gates, timeouts, categories, and tags.
outline: [2, 3]
---

# Custom Tools

Custom tools expose your application's capabilities to agents. Each tool has a typed Zod schema, an execute function, and optional metadata like approval requirements, timeouts, and categories.

```ts
import { tool, defineTool, createTools } from 'confused-ai';
import { z } from 'zod';
```

---

## `tool()` — primary helper

```ts
import { tool, createAgent } from 'confused-ai';
import { z } from 'zod';

const getOrder = tool({
  name: 'get_order',
  description: 'Retrieve an order by ID. Returns status, items, and shipping info.',
  schema: z.object({
    orderId: z.string().describe('The order ID to look up'),
  }),
  execute: async ({ orderId }, ctx) => {
    const order = await orderService.findById(orderId);
    if (!order) return { error: `Order ${orderId} not found.` };
    return { id: order.id, status: order.status, items: order.items };
  },
});

const agent = createAgent({
  name: 'support',
  instructions: 'Help customers with their orders.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [getOrder],
});
```

---

## `ToolContext`

The second argument to `execute` is a `ToolContext` with request-scoped metadata:

```ts
const auditedTool = tool({
  name: 'update_record',
  description: 'Update a database record.',
  schema: z.object({
    id: z.string(),
    patch: z.record(z.unknown()),
  }),
  execute: async ({ id, patch }, ctx) => {
    ctx.logger?.info('Updating record', { id, userId: ctx.userId, runId: ctx.runId });

    // Abort early if the run was cancelled
    if (ctx.signal?.aborted) {
      return { error: 'Run cancelled.' };
    }

    await db.update(id, patch);
    return { updated: true };
  },
});

// ToolContext fields:
// ctx.runId      — current run ID
// ctx.userId     — user who triggered the run
// ctx.sessionId  — current session ID
// ctx.signal     — AbortSignal (fires when agent is cancelled/timed out)
// ctx.logger     — framework logger
// ctx.metadata   — arbitrary key-value from agent.run() options
```

---

## Approval gates

Set `needsApproval: true` to require human approval before the tool runs:

```ts
const sendEmail = tool({
  name: 'send_email',
  description: 'Send an email to a customer.',
  schema: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
  needsApproval: true,   // agent will pause and wait for human approval
  execute: async ({ to, subject, body }) => {
    await mailer.send({ to, subject, body });
    return { sent: true };
  },
});

// Dynamic approval based on parameters
const chargeCard = tool({
  name: 'charge_card',
  description: 'Charge a customer credit card.',
  schema: z.object({ customerId: z.string(), amount: z.number() }),
  needsApproval: ({ amount }) => amount > 100,  // only require approval for large charges
  execute: async ({ customerId, amount }) => {
    await payments.charge(customerId, amount);
    return { charged: true };
  },
});
```

---

## Tool timeout

```ts
const slowTool = tool({
  name: 'run_report',
  description: 'Generate a complex report (can take up to 2 minutes).',
  schema: z.object({ reportId: z.string() }),
  timeoutMs: 120_000,   // 2 minutes
  execute: async ({ reportId }) => {
    return await reportEngine.generate(reportId);
  },
});
```

---

## Tool categories and tags

```ts
import { ToolCategory } from 'confused-ai';

const myTool = tool({
  name: 'search_products',
  description: 'Search the product catalogue.',
  schema: z.object({ query: z.string() }),
  category: ToolCategory.DATA,
  tags: ['search', 'products', 'catalogue'],
  execute: async ({ query }) => searchProducts(query),
});
```

---

## `defineTool` (alias)

```ts
import { defineTool } from 'confused-ai';

// Identical to tool() — just a named alias
const myTool = defineTool({
  name: 'hello',
  description: 'Say hello.',
  schema: z.object({ name: z.string() }),
  execute: async ({ name }) => `Hello, ${name}!`,
});
```

---

## `createTools()` — define multiple tools at once

```ts
import { createTools } from 'confused-ai';

const [getProduct, updateInventory, checkStock] = createTools([
  {
    name: 'get_product',
    description: 'Get product details by SKU.',
    schema: z.object({ sku: z.string() }),
    execute: async ({ sku }) => getProductBySku(sku),
  },
  {
    name: 'update_inventory',
    description: 'Update inventory count for a product.',
    schema: z.object({ sku: z.string(), delta: z.number() }),
    needsApproval: true,
    execute: async ({ sku, delta }) => adjustInventory(sku, delta),
  },
  {
    name: 'check_stock',
    description: 'Check if a product is in stock.',
    schema: z.object({ sku: z.string() }),
    execute: async ({ sku }) => checkProductStock(sku),
  },
]);
```

---

## Streaming tool output (long-running)

```ts
const streamingTool = tool({
  name: 'process_large_file',
  description: 'Process a large file and stream progress.',
  schema: z.object({ fileUrl: z.string() }),
  execute: async ({ fileUrl }, ctx) => {
    const lines: string[] = [];
    for await (const line of streamFile(fileUrl)) {
      if (ctx.signal?.aborted) break;
      lines.push(processLine(line));
    }
    return { lines: lines.length, sample: lines.slice(0, 5) };
  },
});
```

---

## Where to go next

- [Tool composition](./tool-composition) — `extendTool`, `wrapTool`, `pipeTools`.
- [Tools](./tools) — built-in tools (100+) and the `tools: 'web'` preset.
- [HITL](./hitl) — durable approval stores for `needsApproval` tools.
