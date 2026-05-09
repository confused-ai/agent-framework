---
title: Stream Utilities
description: Transform, filter, merge, and budget LLM streams with streamToText, streamToSSE, streamTee, streamMap, and more.
outline: [2, 3]
---

# Stream Utilities

`@confused-ai/models` exports a set of stream utility functions for working with `AsyncIterable<StreamChunk>` — the streaming format used throughout confused-ai. Every utility is composable with the others.

```ts
import {
  streamToText,
  streamToChunks,
  streamToSSE,
  streamWithBudget,
  streamTee,
  streamMap,
  streamFilter,
  streamMerge,
  streamToNodeCallback,
} from '@confused-ai/models';
```

---

## `StreamChunk`

All stream utilities operate on `AsyncIterable<StreamChunk>`:

```ts
interface StreamChunk {
  type:     'text' | 'tool_call' | 'tool_result' | 'usage' | 'done' | 'error';
  text?:    string;
  delta?:   string;           // incremental text (subset of text)
  usage?:   { inputTokens: number; outputTokens: number; totalTokens: number };
  toolCall?: { name: string; input: unknown };
  error?:   unknown;
}
```

---

## `streamToText()`

Collect a full stream into a single string. Buffers all `text` chunks and joins them.

```ts
import { streamToText } from '@confused-ai/models';
import { agent } from 'confused-ai';

const ai = agent({ model: 'gpt-4o', instructions: '...' });
const stream = ai.streamEvents('Write a haiku.');

const text = await streamToText(stream);
console.log(text); // "Petals fall softly / silence fills the morning air / a crow calls once"
```

---

## `streamToChunks()`

Collect a stream into an array of all `StreamChunk` objects. Useful for post-processing or inspection.

```ts
import { streamToChunks } from '@confused-ai/models';

const chunks = await streamToChunks(stream);

// Inspect usage
const usageChunk = chunks.find(c => c.type === 'usage');
console.log(usageChunk?.usage?.totalTokens);

// Collect all text deltas
const text = chunks
  .filter(c => c.type === 'text' && c.delta)
  .map(c => c.delta)
  .join('');
```

---

## `streamToSSE()`

Convert a stream to Server-Sent Events format — useful for HTTP streaming endpoints.

```ts
import { streamToSSE } from '@confused-ai/models';
import { serve } from '@confused-ai/serve';

const app = serve();

app.post('/v1/chat', async (req, res) => {
  const ai = agent({ model: 'gpt-4o', instructions: '...' });
  const stream = ai.streamEvents(req.body.prompt);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');

  for await (const sseChunk of streamToSSE(stream)) {
    res.write(sseChunk);   // "data: {"type":"text","delta":"Hello"}\n\n"
  }

  res.end();
});
```

### SSE format

Each event is formatted as:
```
data: {"type":"text","delta":"Hello"}\n\n
data: {"type":"done"}\n\n
```

Compatible with the browser `EventSource` API and any SSE-capable HTTP client.

---

## `streamWithBudget()`

Enforce a token budget on a stream. Automatically truncates the stream when `maxTokens` is reached, emitting a final `done` chunk with a truncation indicator.

```ts
import { streamWithBudget } from '@confused-ai/models';

const stream = ai.streamEvents('Write a very long story about...');

const budgetedStream = streamWithBudget(stream, {
  maxTokens:    500,
  onExceeded:   (used) => console.warn(`Budget exceeded at ${used} tokens`),
  truncateAt:   'sentence',    // 'sentence' | 'word' | 'char' (default: 'char')
});

for await (const chunk of budgetedStream) {
  if (chunk.type === 'text') process.stdout.write(chunk.delta ?? '');
}
```

### Budget options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTokens` | `number` | — | Hard token limit |
| `onExceeded` | `(used: number) => void` | — | Called when limit hit |
| `truncateAt` | `'sentence' \| 'word' \| 'char'` | `'char'` | Truncation granularity |

---

## `streamTee()`

Duplicate a stream into two independent iterables — both receive every chunk. Useful when you need to simultaneously display text and save to a database.

```ts
import { streamTee } from '@confused-ai/models';

const stream = ai.streamEvents('Explain quantum entanglement.');
const [displayStream, saveStream] = streamTee(stream);

// Consumer 1: display in real-time
(async () => {
  for await (const chunk of displayStream) {
    if (chunk.type === 'text') process.stdout.write(chunk.delta ?? '');
  }
})();

// Consumer 2: collect and save
(async () => {
  const full = await streamToText(saveStream);
  await db.responses.insert({ prompt: '...', response: full });
})();
```

::: warning Backpressure
`streamTee` buffers chunks internally when one consumer is slower than the other. For very long streams, prefer `streamToText` on one branch and process the other in real-time.
:::

---

## `streamMap()`

Transform every chunk in a stream. Returns a new `AsyncIterable<T>` where `T` is the return type of your mapper.

```ts
import { streamMap } from '@confused-ai/models';

// Uppercase all text deltas (toy example)
const uppercaseStream = streamMap(stream, (chunk) => ({
  ...chunk,
  delta: chunk.delta?.toUpperCase(),
}));

// Extract only text deltas as plain strings
const textOnlyStream = streamMap(
  stream,
  (chunk) => chunk.type === 'text' ? chunk.delta ?? '' : null,
);
for await (const text of textOnlyStream) {
  if (text) process.stdout.write(text);
}
```

---

## `streamFilter()`

Drop chunks that don't satisfy a predicate:

```ts
import { streamFilter } from '@confused-ai/models';

// Only yield text chunks — skip tool_call, tool_result, usage, done
const textOnly = streamFilter(stream, (chunk) => chunk.type === 'text');

// Skip empty deltas
const nonEmpty = streamFilter(stream, (chunk) => {
  if (chunk.type !== 'text') return true;
  return (chunk.delta?.length ?? 0) > 0;
});
```

---

## `streamMerge()`

Merge multiple concurrent streams into one ordered stream. Chunks from all sources are yielded as they arrive (not interleaved in round-robin).

```ts
import { streamMerge } from '@confused-ai/models';

// Run two agents in parallel and stream both outputs in real-time
const [streamA, streamB] = [
  agentA.streamEvents('Research topic A'),
  agentB.streamEvents('Research topic B'),
];

for await (const chunk of streamMerge([streamA, streamB])) {
  if (chunk.type === 'text') process.stdout.write(chunk.delta ?? '');
}
```

Each chunk includes an injected `sourceIndex` field (0-based) so you can route chunks to different UI panels:

```ts
for await (const chunk of streamMerge([streamA, streamB])) {
  const panel = chunk.sourceIndex === 0 ? panelA : panelB;
  panel.append(chunk.delta ?? '');
}
```

---

## `streamToNodeCallback()`

Adapt an `AsyncIterable<StreamChunk>` to a Node.js-style callback. Useful when integrating with older APIs that expect `(err, chunk)` callbacks.

```ts
import { streamToNodeCallback } from '@confused-ai/models';

streamToNodeCallback(
  stream,
  (err, chunk) => {
    if (err) {
      console.error('Stream error:', err);
      return;
    }
    if (chunk?.type === 'text') process.stdout.write(chunk.delta ?? '');
  },
  () => console.log('\nStream complete'),
);
```

---

## Composing utilities

All utilities accept and return `AsyncIterable<StreamChunk>`, so they compose naturally:

```ts
import {
  streamFilter,
  streamMap,
  streamWithBudget,
  streamToSSE,
  streamTee,
} from '@confused-ai/models';

const rawStream = ai.streamEvents(prompt);

// Build a processing pipeline:
const [logStream, responseStream] = streamTee(
  streamWithBudget(
    streamFilter(rawStream, c => c.type !== 'usage'),  // drop usage chunks
    { maxTokens: 1000 },                               // cap at 1000 tokens
  ),
);

// Send SSE to HTTP client
for await (const sse of streamToSSE(responseStream)) {
  res.write(sse);
}

// Log to observability store
for await (const chunk of logStream) {
  await obs.record(chunk);
}
```

---

## Quick reference

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `streamToText` | `AsyncIterable<StreamChunk>` | `Promise<string>` | Collect all text |
| `streamToChunks` | `AsyncIterable<StreamChunk>` | `Promise<StreamChunk[]>` | Collect all chunks |
| `streamToSSE` | `AsyncIterable<StreamChunk>` | `AsyncIterable<string>` | Format as SSE events |
| `streamWithBudget` | `AsyncIterable<StreamChunk>` | `AsyncIterable<StreamChunk>` | Token-budget gate |
| `streamTee` | `AsyncIterable<StreamChunk>` | `[AsyncIterable, AsyncIterable]` | Duplicate stream |
| `streamMap` | `AsyncIterable<StreamChunk>` | `AsyncIterable<T>` | Transform each chunk |
| `streamFilter` | `AsyncIterable<StreamChunk>` | `AsyncIterable<StreamChunk>` | Drop chunks |
| `streamMerge` | `AsyncIterable<StreamChunk>[]` | `AsyncIterable<StreamChunk>` | Merge multiple streams |
| `streamToNodeCallback` | `AsyncIterable<StreamChunk>` | `void` | Node.js callback adapter |

---

## See also

- [Creating Agents](/guide/agents) — `agent.stream()` and `agent.streamEvents()`
- [WebSocket Transport](/guide/websocket) — stream over WebSocket
- [Observability & OTLP](/guide/observability) — trace every stream chunk
- [Background Queues](/guide/background-queues) — process streams asynchronously
