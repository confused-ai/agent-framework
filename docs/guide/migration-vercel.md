---
title: Migrate from Vercel AI SDK
description: Side-by-side migration guide from Vercel AI SDK to confused-ai, covering streaming, tools, and multi-step agents.
outline: [2, 3]
---

# Migrate from Vercel AI SDK

<p class="lead">
Vercel AI SDK (`ai` package) is a thin streaming wrapper around LLM providers. confused-ai covers the same ground and adds a full agentic runtime, typed builders, session persistence, and 39 focused packages — all while keeping the streaming API you are used to.
</p>

## Core concept mapping

| Vercel AI SDK | confused-ai |
|---|---|
| `generateText()` | `agent.run(input)` |
| `streamText()` | `agent.stream(input)` |
| `generateObject()` | `.output(z.object({...}))` on the builder |
| `streamObject()` | `agent.stream(input)` with typed output schema |
| `tool()` | `tool()` from `confused-ai` |
| `maxSteps` | `.maxIterations(n)` on the builder |
| `onFinish` callback | `@confused-ai/observe` span subscriber |
| Provider instance (`openai(model)`) | Model reference string `'openai:gpt-4o'` |
| `useChat` (React hook) | `@confused-ai/serve` HTTP endpoint + any React fetch |
| `CoreMessage[]` history | Session store — auto-managed via `.session()` |

---

## Installation

::: code-group
```bash [Vercel AI SDK]
npm install ai @ai-sdk/openai zod
```
```bash [confused-ai]
npm install confused-ai zod
# OPENAI_API_KEY is auto-detected — no provider setup required
```
:::

---

## Text generation

::: code-group
```typescript [Vercel AI SDK]
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the capital of France?',
});
console.log(text); // "Paris"
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';

const agent = defineAgent('qa')
  .model('openai:gpt-4o')
  .build();

const result = await agent.run('What is the capital of France?');
console.log(result); // "Paris"
```
:::

---

## Streaming text

::: code-group
```typescript [Vercel AI SDK]
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Write a haiku about TypeScript.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';

const agent = defineAgent('poet')
  .model('openai:gpt-4o')
  .build();

for await (const event of agent.stream('Write a haiku about TypeScript.')) {
  if (event.type === 'text') process.stdout.write(event.content ?? '');
}
```
:::

---

## Structured / typed output

::: code-group
```typescript [Vercel AI SDK]
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  prompt: 'Analyse the sentiment of: "I absolutely loved the conference!"',
});

console.log(object.sentiment);   // "positive"
console.log(object.confidence);  // 0.97
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const sentimentAgent = defineAgent('sentiment')
  .model('openai:gpt-4o')
  .input(z.object({ text: z.string() }))
  .output(z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }))
  .instructions('Analyse the sentiment of the provided text.')
  .build();

const result = await sentimentAgent.run({
  text: 'I absolutely loved the conference!',
});
console.log(result.sentiment);   // "positive"
console.log(result.confidence);  // 0.97
```
:::

---

## Tools

::: code-group
```typescript [Vercel AI SDK]
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    get_weather: tool({
      description: 'Get the weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => `Sunny in ${location}, 22°C`,
    }),
  },
  maxSteps: 5,
  prompt: 'What is the weather in Tokyo?',
});
```
```typescript [confused-ai]
import { defineAgent, tool } from 'confused-ai';
import { z } from 'zod';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a location',
  input: z.object({ location: z.string() }),
  async execute({ location }) {
    return `Sunny in ${location}, 22°C`;
  },
});

const agent = defineAgent('weather-agent')
  .model('openai:gpt-4o')
  .tools([weatherTool])
  .maxIterations(5)
  .build();

const result = await agent.run('What is the weather in Tokyo?');
console.log(result);
```
:::

---

## Multi-turn conversation

::: code-group
```typescript [Vercel AI SDK]
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { CoreMessage } from 'ai';

// Caller manages history manually
const messages: CoreMessage[] = [];

async function chat(userMessage: string): Promise<string> {
  messages.push({ role: 'user', content: userMessage });

  const { text } = await generateText({
    model: openai('gpt-4o'),
    messages,
  });

  messages.push({ role: 'assistant', content: text });
  return text;
}

await chat('My name is Alice.');
const reply = await chat('What is my name?');
console.log(reply); // "Your name is Alice."
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { InMemoryStore } from '@confused-ai/session';

// Session store manages history automatically
const agent = defineAgent('chat')
  .model('openai:gpt-4o')
  .session(new InMemoryStore())
  .build();

const { sessionId } = await agent.run('My name is Alice.');
const reply = await agent.run('What is my name?', { sessionId });
console.log(reply); // "Your name is Alice."
```
:::

---

## `useChat` React hook → HTTP endpoint

::: code-group
```typescript [Vercel AI SDK — API route]
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({ model: openai('gpt-4o'), messages });
  return result.toDataStreamResponse();
}
```
```typescript [Vercel AI SDK — client]
'use client';
import { useChat } from 'ai/react';
export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```
```typescript [confused-ai — server]
import { createHttpService } from '@confused-ai/serve';
import { defineAgent } from 'confused-ai';
import { InMemoryStore } from '@confused-ai/session';

const agent = defineAgent('chat')
  .model('openai:gpt-4o')
  .session(new InMemoryStore())
  .build();

const service = createHttpService({ agent, port: 3000 });
await service.start();
// POST /run        → { output, sessionId, runId }
// POST /stream     → SSE stream of AgentStreamEvent
```
```typescript [confused-ai — client (plain fetch)]
async function sendMessage(text: string, sessionId?: string) {
  const res = await fetch('/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, sessionId }),
  });
  return res.json(); // { output, sessionId, runId }
}
```
:::

---

## Provider switching

::: code-group
```typescript [Vercel AI SDK]
import { generateText } from 'ai';
import { openai }    from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// Must change import + model instantiation
const { text } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Hello',
});
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';

// Change one string — no import changes needed
const agent = defineAgent('chat')
  .model('anthropic:claude-3-5-sonnet') // or 'openai:gpt-4o', 'google:gemini-2.0-flash'
  .build();

const result = await agent.run('Hello');
```
:::

---

## onFinish → span observer

::: code-group
```typescript [Vercel AI SDK]
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text, usage } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain recursion.',
  onFinish({ usage, text }) {
    console.log('Tokens used:', usage.totalTokens);
    console.log('Output:', text);
  },
});
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { createSpanObserver } from '@confused-ai/observe';

const agent = defineAgent('explain')
  .model('openai:gpt-4o')
  .build();

const unsub = createSpanObserver((span) => {
  if (span.type === 'llm' && span.end) {
    console.log('Tokens used:', span.usage?.totalTokens);
  }
});

const result = await agent.run('Explain recursion.');
console.log(result);
unsub();
```
:::

---

## Key differences

| Topic | Vercel AI SDK | confused-ai |
|---|---|---|
| **Scope** | LLM streaming primitives | Full agentic runtime (session, memory, planning, orchestration) |
| **Message history** | Manually managed `CoreMessage[]` | Auto-managed via `.session()` store — pass `sessionId` between turns |
| **Output validation** | Zod schema passed to `generateObject` | `.output(schema)` on builder — validated at every `run()` |
| **Provider** | Separate `@ai-sdk/openai` etc. imports | Model reference string — single import |
| **Streaming** | `result.textStream` async iterable | `agent.stream(input)` — typed `AgentStreamEvent` iterable |
| **Resume / checkpoint** | Not available | `agent.resume(runId)` |
| **Multi-agent** | Not built-in | `createWorkflow()`, sub-agents as tools |
| **React integration** | `useChat` / `useCompletion` | `@confused-ai/serve` HTTP endpoint + any fetch |
| **Bundle** | ~30 kB (core) | Tree-shakeable — import only the packages you need |
