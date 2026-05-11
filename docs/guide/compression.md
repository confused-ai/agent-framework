---
title: Compression
description: Reduce context size when long conversations or large tool outputs exceed the model window. CompressionManager compresses tool results in-place via LLM summarisation with configurable triggers.
outline: [2, 3]
---

# Compression

`CompressionManager` detects when message threads have grown too large and compresses verbose tool outputs into compact, fact-preserving summaries — in-place, without losing the context the task depends on.

```ts
import { CompressionManager } from 'confused-ai';
```

---

## Quick start

```ts
import { createAgent } from 'confused-ai';
import { CompressionManager } from 'confused-ai';
import { OpenAIProvider } from 'confused-ai';

const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

const compression = new CompressionManager({
  // Provide an LLM callable for summarisation
  generate: async (msgs) => {
    const response = await provider.generateText({
      messages: msgs,
      model: 'gpt-4o-mini',
    });
    return response.text;
  },
  compressToolResults: true,
  compressToolResultsLimit: 3,   // compress after 3+ tool messages
  compressTokenLimit: 4096,      // also compress any message > ~4096 tokens
});

const agent = createAgent({
  name: 'research-agent',
  instructions: 'Research topics in depth using multiple searches.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  compression,
});
```

---

## `CompressionManager` API

### Constructor options

```ts
interface CompressionManagerConfig {
  /** LLM callable for summarisation */
  generate: (messages: Array<{ role: string; content: string }>) => Promise<string>;

  /** Whether to compress tool / function call results (default: true) */
  compressToolResults?: boolean;

  /** Minimum number of tool messages before compressing (default: 3) */
  compressToolResultsLimit?: number;

  /**
   * Single-message content token threshold above which compression triggers
   * regardless of message count. Estimated as content.length / 4.
   * Set to 0 to disable. (default: 4096)
   */
  compressTokenLimit?: number;

  /** Override the default compression system prompt */
  prompt?: string;

  debug?: boolean;
}
```

### Methods

```ts
// Check if the message list needs compression
cm.shouldCompress(messages);

// Compress tool-result messages in-place (sequential)
await cm.compress(messages);

// Compress in parallel (faster for large batches)
await cm.acompress(messages);
```

---

## What gets compressed

- Tool / function-call result messages where content exceeds `compressTokenLimit`
- Any batch of tool-result messages that reaches `compressToolResultsLimit`

Compressed messages have the original content replaced with a fact-preserving summary. The original `role` and all other message fields are preserved.

---

## Manual use in hooks

You can also trigger compression explicitly in an `afterRun` hook or before sending to the model:

```ts
const agent = createAgent({
  name: 'deep-researcher',
  instructions: '...',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  hooks: {
    beforeRun: async (input) => {
      if (compression.shouldCompress(input.messages)) {
        await compression.acompress(input.messages);
      }
      return input;
    },
  },
});
```

---

## Default compression prompt

The built-in prompt instructs the model to:
1. Preserve all key facts, entities, IDs, numbers, names, dates.
2. Remove filler, pleasantries, repeated boilerplate, and excess whitespace.
3. Keep the same language as the input.
4. Output only the compressed content — no preamble.

Override it with the `prompt` option if your domain has specific compression requirements.

---

## Where to go next

- [Session](./session) — conversation persistence; use compression to keep sessions lean.
- [Memory](./memory) — retain selected facts rather than summarising everything.
- [Context providers](./context-provider) — inject context deliberately instead of accumulating it.
