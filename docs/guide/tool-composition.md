---
title: Tool Composition
description: Compose, chain, parallelize, and guard tools using composeTool, parallelTools, fallbackTool, retryTool, timeoutTool, mapTool, and filterTool.
outline: [2, 3]
---

# Tool Composition

`@confused-ai/tools` ships seven higher-order composition utilities that transform existing tools into more powerful ones — without modifying the originals. All combinators return a standard `Tool` so they integrate seamlessly with `agent({ tools: [...] })` and the `defineAgent()` builder.

```ts
import {
  composeTool,
  parallelTools,
  fallbackTool,
  retryTool,
  timeoutTool,
  mapTool,
  filterTool,
} from '@confused-ai/tools';
```

---

## `composeTool()`

Chain tools in sequence. The output of tool N is passed as the input to tool N+1. The result of the final tool is returned.

```ts
import { composeTool } from '@confused-ai/tools';

// fetchTool → cleanTool → summariseTool
const fetchAndSummarise = composeTool(
  [fetchUrlTool, htmlCleanerTool, textSummaryTool],
  { name: 'fetch_and_summarise', description: 'Fetch a URL and return a clean summary.' },
);

// Use in any agent
const ai = agent({ model: 'gpt-4o', tools: [fetchAndSummarise] });
```

### Type flow

Each tool's output schema must be assignable to the next tool's input schema. If schemas are incompatible, provide an adapter function:

```ts
const pipeline = composeTool(
  [fetchUrlTool, summariseTool],
  {
    name: 'fetch_summarise',
    description: 'Fetch and summarise',
    adapter: (fetchOutput) => ({
      text: fetchOutput.html.replace(/<[^>]+>/g, ''),
    }),
  },
);
```

---

## `parallelTools()`

Execute multiple tools **simultaneously** and collect all results into a single object.

```ts
import { parallelTools } from '@confused-ai/tools';

const marketData = parallelTools(
  [stockPriceTool, newsHeadlinesTool, analystRatingTool],
  {
    name:        'market_data',
    description: 'Fetch price, headlines, and analyst ratings in parallel.',
    mergeKey:    'ticker',    // optional: shared input key forwarded to all tools
  },
);

// The LLM calls market_data({ ticker: 'AAPL' }) once.
// Internally, all three tools run concurrently.
// Result: { price: {...}, headlines: [...], rating: {...} }
```

### Partial failures

By default, `parallelTools` throws if **any** sub-tool fails. Set `allowPartial` to tolerate individual failures:

```ts
const marketData = parallelTools(
  [stockPriceTool, newsHeadlinesTool, analystRatingTool],
  {
    name:         'market_data',
    description:  '...',
    allowPartial: true,   // failed tools produce { error: string } in the result
  },
);
```

---

## `fallbackTool()`

Try tools in order and return the **first successful** result. Ideal for redundant data sources.

```ts
import { fallbackTool } from '@confused-ai/tools';

const weatherTool = fallbackTool(
  [openWeatherTool, weatherApiTool, wttrTool],
  { name: 'weather', description: 'Get weather for a location. Tries 3 providers.' },
);
```

Each tool is tried in sequence. If it throws or returns a value matching `isFailure`, the next tool is tried. The first success is returned immediately.

```ts
const weatherTool = fallbackTool(
  [primaryProvider, backupProvider],
  {
    name:      'weather',
    description: '...',
    isFailure: (result) => result.status === 'unavailable',  // custom failure predicate
  },
);
```

---

## `retryTool()`

Wrap a tool with automatic retry logic using exponential backoff with jitter.

```ts
import { retryTool } from '@confused-ai/tools';

const reliableFetch = retryTool(fetchUrlTool, {
  maxAttempts:   3,
  initialDelayMs: 200,    // first retry after 200ms
  backoffFactor:  2,      // 200 → 400 → 800ms
  jitter:         true,   // randomise ±50% to avoid thundering herd
  shouldRetry:   (error, attempt) => {
    // Only retry on 5xx errors, not 4xx
    if (error instanceof HttpError) return error.status >= 500;
    return true;
  },
});
```

### Defaults

| Option | Default |
|--------|---------|
| `maxAttempts` | 3 |
| `initialDelayMs` | 100 |
| `backoffFactor` | 2 |
| `jitter` | `true` |
| `shouldRetry` | always retry |

---

## `timeoutTool()`

Wrap a tool with a hard wall-clock deadline. Throws a `TimeoutError` if the tool takes longer than `ms`.

```ts
import { timeoutTool } from '@confused-ai/tools';

const fastSearch = timeoutTool(slowSearchTool, {
  ms:      5_000,     // 5 second deadline
  message: 'Search timed out — try a shorter query',  // optional
});
```

::: tip Combine with retry
```ts
const robustSearch = retryTool(
  timeoutTool(searchTool, { ms: 5_000 }),
  { maxAttempts: 2 },
);
```
The timeout fires inside each attempt; if all attempts time out, `retryTool` propagates the `TimeoutError`.
:::

---

## `mapTool()`

Transform a tool's **output** without changing its input or name:

```ts
import { mapTool } from '@confused-ai/tools';

// Strip HTML tags from the output before returning to the LLM
const cleanFetchTool = mapTool(fetchUrlTool, (output) => ({
  ...output,
  html: output.html.replace(/<[^>]+>/g, ''),
}));

// Parse a JSON string in the output
const parsedApiTool = mapTool(rawApiTool, (output) => ({
  data: JSON.parse(output.rawJson as string),
}));
```

Transform the **input** instead with the second overload:

```ts
const uppercaseTool = mapTool(searchTool, {
  input:  (input) => ({ ...input, query: input.query.toUpperCase() }),
  output: (output) => output,
});
```

---

## `filterTool()`

Selectively expose a subset of a tool's output keys to the LLM — useful for reducing token usage when a tool returns large objects:

```ts
import { filterTool } from '@confused-ai/tools';

// Only expose title, url, and snippet from search results
const leanSearchTool = filterTool(fullSearchTool, {
  pick: ['title', 'url', 'snippet'],
});

// Exclude sensitive fields from a user-data tool
const safeUserTool = filterTool(userDetailsTool, {
  omit: ['password', 'creditCard', 'internalNotes'],
});
```

---

## Composing combinators

Combinators return plain `Tool` objects, so they stack freely:

```ts
// A tool that:
// 1. Times out after 10s
// 2. Retries up to 3 times
// 3. Falls back to a backup if the primary still fails
// 4. Maps the output to a clean format

const robustDataTool = mapTool(
  fallbackTool(
    [
      retryTool(timeoutTool(primaryApiTool, { ms: 10_000 }), { maxAttempts: 3 }),
      backupApiTool,
    ],
    { name: 'data_fetch', description: 'Fetch data with fallback.' },
  ),
  (output) => ({ value: output.data.value, unit: output.data.unit }),
);
```

---

## Full reference

| Function | What it does |
|----------|-------------|
| `composeTool(tools, meta)` | Sequential pipeline — output of N becomes input of N+1 |
| `parallelTools(tools, meta)` | Fan-out — all tools run concurrently, results merged |
| `fallbackTool(tools, meta)` | Try first, on failure try next — first success wins |
| `retryTool(tool, opts)` | Retry with exponential backoff + jitter on failure |
| `timeoutTool(tool, opts)` | Hard deadline — throws `TimeoutError` if exceeded |
| `mapTool(tool, fn)` | Transform input and/or output of an existing tool |
| `filterTool(tool, opts)` | Pick or omit keys from the tool's output |

---

## See also

- [Built-in Tools](/guide/tools) — the 100+ tools you can compose
- [Custom Tools](/guide/custom-tools) — building your own tools
- [Plugins](/guide/plugins) — cross-cutting middleware (logging, rate-limiting)
- [Lifecycle Hooks](/guide/hooks) — before/after callbacks on every tool call
