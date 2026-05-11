---
title: Tools
description: Define tools with tool() or defineTool(), compose them, and use 100+ built-in tools from search, communication, devtools, finance, and more.
outline: [2, 3]
---

# Tools

Tools are functions the agent can call during a run. They are defined with `tool()` or `defineTool()`, validated with Zod, and passed directly to `createAgent()`.

## Define a tool

```ts
import { tool } from 'confused-ai/tool';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current weather for a city. Use this when the user asks about weather.',
  parameters: z.object({
    city: z.string().describe('City name, e.g. "Tokyo"'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ city, unit }) => {
    // real implementation calls your weather API
    return { city, temperature: 22, unit, condition: 'sunny' };
  },
});
```

Pass the tool to `createAgent`:

```ts
import { createAgent } from 'confused-ai';

const agent = createAgent({
  name: 'weather-agent',
  instructions: 'Help with weather queries. Always call get_weather before answering.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [getWeather],
});
```

---

## `tool()` vs `defineTool()`

Both produce the same result. `defineTool` is the older API; `tool` is the preferred shorthand.

```ts
import { tool, defineTool, createTool } from 'confused-ai/tool';

// All three are equivalent:
const t1 = tool({ name: 'add', description: '...', parameters: z.object({ a: z.number(), b: z.number() }), execute: async ({ a, b }) => a + b });
const t2 = defineTool({ name: 'add', description: '...', parameters: z.object({ a: z.number(), b: z.number() }), execute: async ({ a, b }) => a + b });
const t3 = createTool({ name: 'add', description: '...', parameters: z.object({ a: z.number(), b: z.number() }), execute: async ({ a, b }) => a + b });
```

---

## Multiple tools: `createTools`

```ts
import { createTools } from 'confused-ai/tool';
import { z } from 'zod';

const tools = createTools([
  {
    name: 'search_orders',
    description: 'Find a customer order by id.',
    parameters: z.object({ orderId: z.string() }),
    execute: async ({ orderId }) => ({ orderId, status: 'shipped', eta: '2026-05-14' }),
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order. Only use if the customer explicitly requests cancellation.',
    parameters: z.object({ orderId: z.string(), reason: z.string() }),
    execute: async ({ orderId, reason }) => ({ cancelled: true, orderId, reason }),
  },
]);

const agent = createAgent({ name: 'support', instructions: '...', model: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY!, tools });
```

---

## Tool context

Every tool receives a context object as the second argument:

```ts
const auditTool = tool({
  name: 'update_record',
  description: 'Update a database record.',
  parameters: z.object({ id: z.string(), data: z.record(z.string()) }),
  execute: async ({ id, data }, ctx) => {
    console.log('called by run:', ctx.runId);
    console.log('user:', ctx.userId);
    // ctx.signal — AbortSignal for cancellation
    // ctx.logger — framework logger
    return { updated: true };
  },
});
```

---

## Tool middleware

Apply cross-cutting behaviour (logging, caching, auth) across all tools:

```ts
import { createAgent } from 'confused-ai';

const agent = createAgent({
  name: 'agent',
  instructions: '...',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [searchTool, dbTool],
  toolMiddleware: [
    // Logging middleware
    async (ctx, next) => {
      console.log(`[tool] ${ctx.tool.name} called`, ctx.input);
      const result = await next();
      console.log(`[tool] ${ctx.tool.name} returned`, result);
      return result;
    },
  ],
});
```

---

## Extend and wrap tools

```ts
import { extendTool, wrapTool, pipeTools } from 'confused-ai/tool';

// Add retry and a cache layer around an existing tool
const reliableSearch = extendTool(searchTool, {
  retry: { maxAttempts: 3, delayMs: 500 },
  cache: { ttlMs: 60_000 },
});

// Wrap with custom pre/post logic
const wrappedSearch = wrapTool(searchTool, async (input, next) => {
  const sanitised = { ...input, query: input.query.trim() };
  const result = await next(sanitised);
  return { ...result, source: 'search' };
});

// Chain tools: output of tool1 becomes input of tool2
const pipeline = pipeTools(fetchPageTool, summariseTool);
```

---

## Built-in tools (100+)

Import from `confused-ai/tool` or directly from the category path.

### Search

```ts
import {
  TavilySearchTool,    // AI-optimised web search
  BraveSearchTool,     // privacy-first web search
  ExaSearchTool,       // neural search
  PerplexityTool,      // web-grounded LLM search
  ArxivSearchTool,     // academic papers
  PubMedSearchTool,    // biomedical papers
  YouTubeSearchTool,
  RedditSearchTool,
  WeatherTool,
  GoogleMapsTool,
} from 'confused-ai/tool';

const agent = createAgent({
  name: 'researcher',
  instructions: 'Research the topic thoroughly.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [new TavilySearchTool({ apiKey: process.env.TAVILY_API_KEY! })],
});
```

### Communication

```ts
import {
  SlackTool,
  GmailTool,
  EmailTool,
  DiscordTool,
  TelegramTool,
  TwilioTool,
  ZoomTool,
  ResendTool,
} from 'confused-ai/tool';
```

### Productivity

```ts
import {
  JiraTool,
  NotionTool,
  ConfluenceTool,
  LinearTool,
  ClickUpTool,
  GoogleDriveTool,
  GoogleSheetsTool,
  GoogleCalendarTool,
} from 'confused-ai/tool';
```

### Developer tools

```ts
import {
  GitHubTool,
  GitLabTool,
  DockerTool,
  E2BTool,           // sandboxed code execution
  CodeExecTool,      // local code execution
} from 'confused-ai/tool';
```

### Data

```ts
import {
  BigQueryTool,
  CsvTool,
  DatabaseTool,
  Neo4jTool,
  RedisTool,
} from 'confused-ai/tool';
```

### Finance

```ts
import {
  StripeTool,
  YFinanceTool,      // Yahoo Finance market data
} from 'confused-ai/tool';
```

### Utilities

```ts
import {
  httpClient,        // HTTP requests
  fileSystem,        // read/write local files
  browserTool,       // headless browser
  createShellTool,   // run shell commands
} from 'confused-ai/tool';
```

### Web preset

Pass `tools: 'web'` to give the agent HTTP + browser tools with no imports:

```ts
const agent = createAgent({
  name: 'web-agent',
  instructions: 'Browse the web and answer questions.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: 'web',
});
```

---

## Tool registry

Group tools into a typed registry for advanced use:

```ts
import { ToolRegistry } from 'confused-ai/tool';

const registry = new ToolRegistry();
registry.register(searchTool);
registry.register(emailTool);
registry.register(dbTool);

const agent = createAgent({ name: 'agent', instructions: '...', model: 'gpt-4o-mini', apiKey: '...', tools: registry });
```

---

## Where to go next

- [Custom tools](./custom-tools) — advanced tool authoring patterns.
- [Tool composition](./tool-composition) — wrapping, caching, and pipelining tools.
- [MCP](./mcp) — expose or consume tools via the Model Context Protocol.
- [HITL](./hitl) — require human approval before a tool executes.
