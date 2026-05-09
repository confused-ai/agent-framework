---
title: Migrate from LangChain
description: Side-by-side code comparison for migrating LangChain / LangChain.js agents to confused-ai.
outline: [2, 3]
---

# Migrate from LangChain

<p class="lead">
If you are coming from LangChain or LangChain.js this guide walks you through the concept mapping and provides side-by-side code comparisons for the most common patterns.
</p>

## Core concept mapping

| LangChain concept | confused-ai equivalent |
|---|---|
| `ChatOpenAI` / `ChatAnthropic` | `@confused-ai/models` provider (auto-detected from `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) |
| `AgentExecutor` | `defineAgent().build()` |
| `Tool` / `DynamicTool` | `tool()` helper from `confused-ai` |
| `ConversationBufferMemory` | `@confused-ai/session` in-memory or SQLite store |
| `VectorStoreRetriever` | `@confused-ai/knowledge` retrieval engine |
| `Chain` / `SequentialChain` | `createWorkflow()` from `confused-ai` |
| `PromptTemplate` | `instructions()` builder method + `{{variable}}` interpolation |
| `OutputParser` | `.output(z.object({...}))` on the builder |
| `Callbacks` | Lifecycle hooks via `@confused-ai/observe` |
| `LCEL` (LangChain Expression Language) | `createWorkflow().step().step().build()` |

---

## Installation comparison

::: code-group
```bash [LangChain.js]
npm install langchain @langchain/openai
```
```bash [confused-ai]
npm install confused-ai
# OPENAI_API_KEY is auto-picked up — no extra config needed
```
:::

---

## Simple agent

::: code-group
```typescript [LangChain.js]
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicTool } from 'langchain/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const llm = new ChatOpenAI({ model: 'gpt-4o' });

const tools = [
  new DynamicTool({
    name: 'get_weather',
    description: 'Get current weather for a city',
    func: async (city: string) => `The weather in ${city} is sunny.`,
  }),
];

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant.'],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({ input: 'What is the weather in Paris?' });
console.log(result.output);
```
```typescript [confused-ai]
import { defineAgent, tool } from 'confused-ai';
import { z } from 'zod';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  input: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

const agent = defineAgent('my-agent')
  .model('openai:gpt-4o')
  .instructions('You are a helpful assistant.')
  .tools([weatherTool])
  .build();

const result = await agent.run('What is the weather in Paris?');
console.log(result);
```
:::

---

## Typed output

::: code-group
```typescript [LangChain.js]
import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const parser = new JsonOutputParser();
const prompt = ChatPromptTemplate.fromTemplate(
  'Extract the sentiment from this text as JSON with key "sentiment": {text}'
);

const chain = prompt.pipe(new ChatOpenAI()).pipe(parser);
const result = await chain.invoke({ text: 'I love this product!' });
// result is plain unknown — no compile-time guarantee
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const sentimentAgent = defineAgent('sentiment')
  .model('openai:gpt-4o')
  .input(z.object({ text: z.string() }))
  .output(z.object({ sentiment: z.enum(['positive', 'negative', 'neutral']) }))
  .instructions('Extract the sentiment from the provided text.')
  .build();

// TypeScript knows: result.sentiment is 'positive' | 'negative' | 'neutral'
const result = await sentimentAgent.run({ text: 'I love this product!' });
console.log(result.sentiment); // "positive"
```
:::

---

## Memory / conversation history

::: code-group
```typescript [LangChain.js]
import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';

const memory = new BufferMemory();
const chain = new ConversationChain({
  llm: new ChatOpenAI(),
  memory,
});

await chain.call({ input: 'Hi! My name is Alice.' });
const r2 = await chain.call({ input: 'What is my name?' });
console.log(r2.response); // "Your name is Alice."
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { InMemoryStore } from '@confused-ai/session';

const store = new InMemoryStore();
const agent = defineAgent('conversational')
  .model('openai:gpt-4o')
  .session(store)
  .build();

const { sessionId } = await agent.run('Hi! My name is Alice.');
const r2 = await agent.run('What is my name?', { sessionId });
console.log(r2); // "Your name is Alice."
```
:::

---

## Retrieval-augmented generation (RAG)

::: code-group
```typescript [LangChain.js]
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromTexts(
  ['confused-ai supports multi-agent orchestration', 'confused-ai has 39 packages'],
  [],
  embeddings,
);
const retriever = vectorStore.asRetriever();
const chain = RetrievalQAChain.fromLLM(new ChatOpenAI(), retriever);

const result = await chain.call({ query: 'How many packages does confused-ai have?' });
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { KnowledgeEngine } from '@confused-ai/knowledge';
import { InMemoryVectorStore } from '@confused-ai/memory';

const knowledge = new KnowledgeEngine({ store: new InMemoryVectorStore() });
await knowledge.ingest([
  { content: 'confused-ai supports multi-agent orchestration' },
  { content: 'confused-ai has 39 packages' },
]);

const agent = defineAgent('rag-agent')
  .model('openai:gpt-4o')
  .tools([knowledge.asRetrievalTool()])
  .build();

const result = await agent.run('How many packages does confused-ai have?');
```
:::

---

## Sequential chain → workflow

::: code-group
```typescript [LangChain.js]
import { LLMChain, SequentialChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

const summariseChain = new LLMChain({
  llm: new ChatOpenAI(),
  prompt: PromptTemplate.fromTemplate('Summarise: {text}'),
  outputKey: 'summary',
});

const translateChain = new LLMChain({
  llm: new ChatOpenAI(),
  prompt: PromptTemplate.fromTemplate('Translate to French: {summary}'),
  outputKey: 'translation',
});

const pipeline = new SequentialChain({
  chains: [summariseChain, translateChain],
  inputVariables: ['text'],
  outputVariables: ['translation'],
});

const result = await pipeline.call({ text: 'Long English article...' });
```
```typescript [confused-ai]
import { createWorkflow, defineAgent } from 'confused-ai';
import { z } from 'zod';

const summarise = defineAgent('summarise')
  .model('openai:gpt-4o')
  .input(z.object({ text: z.string() }))
  .output(z.object({ summary: z.string() }))
  .instructions('Summarise the provided text in 2–3 sentences.')
  .build();

const translate = defineAgent('translate')
  .model('openai:gpt-4o')
  .input(z.object({ summary: z.string() }))
  .output(z.object({ translation: z.string() }))
  .instructions('Translate the summary into French.')
  .build();

const pipeline = createWorkflow()
  .step('summarise', ({ text }) => summarise.run({ text }))
  .step('translate', ({ summary }) => translate.run({ summary }))
  .build();

const result = await pipeline.run({ text: 'Long English article...' });
console.log(result.translation);
```
:::

---

## Callbacks → lifecycle hooks

::: code-group
```typescript [LangChain.js]
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AgentExecutor } from 'langchain/agents';

class LoggingHandler extends BaseCallbackHandler {
  name = 'logging';
  async handleLLMStart(llm: Record<string, unknown>, prompts: string[]) {
    console.log('LLM start', prompts[0]);
  }
  async handleToolStart(tool: Record<string, unknown>, input: string) {
    console.log('Tool start', tool, input);
  }
}

const executor = new AgentExecutor({ agent, tools, callbacks: [new LoggingHandler()] });
```
```typescript [confused-ai]
import { createSpanObserver } from '@confused-ai/observe';

// Spans are emitted automatically — subscribe once
const unsubscribe = createSpanObserver((span) => {
  if (span.type === 'llm') console.log('LLM start', span.prompt);
  if (span.type === 'tool') console.log('Tool start', span.tool, span.input);
});

// All agents emit spans — no per-agent wiring needed
const result = await agent.run('Hello');
unsubscribe();
```
:::

---

## Key differences to keep in mind

| Topic | LangChain.js | confused-ai |
|---|---|---|
| **Schema validation** | Manual / runtime `z.parse` at call site | `.input()` / `.output()` on the builder — automatic at every `run()` call |
| **Session state** | `BufferMemory` injected per chain | First-class `session()` builder method — IDs returned from `run()` |
| **Streaming** | `llm.stream()` piped manually | `agent.stream(input)` — `AsyncIterable<AgentStreamEvent>` |
| **Resumability** | Not built-in | `agent.resume(runId)` restores from checkpoint |
| **Bundle size** | Monolithic — hard to tree-shake | 39 focused packages — import only what you need |
| **TypeScript** | Inferred but loose (`unknown` at boundaries) | End-to-end generics — `TIn` / `TOut` flow through every call |
