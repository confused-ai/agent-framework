---
title: Memory
description: Persist and recall facts across agent runs using InMemoryStore, VectorMemoryStore, Pinecone, Qdrant, PgVector, and more.
outline: [2, 3]
---

# Memory

Memory lets an agent retain and recall selected facts across runs. The framework ships multiple store backends and a distiller for compressing conversation history into compact summaries.

## Quick start

```ts
import { createAgent, InMemoryStore } from 'confused-ai';

const agent = createAgent({
  name: 'personal-assistant',
  instructions: 'You are a personal assistant. Remember user preferences.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  memoryStore: new InMemoryStore(),
  enableAgenticMemory: true,    // gives agent remember() and recall() tools
  addMemoriesToContext: true,   // auto-prepend recalled memories to each run
  numMemories: 5,               // max memories added to context (default: 5)
});

await agent.run('I prefer TypeScript and dark mode.', { userId: 'alice' });

// Later session — agent recalls these facts automatically
const result = await agent.run('What languages do I use?', { userId: 'alice' });
console.log(result.text);  // references TypeScript
```

---

## Memory stores

### `InMemoryStore`

In-process store. Cleared when the process restarts. Good for prototyping.

```ts
import { InMemoryStore } from 'confused-ai';

const memoryStore = new InMemoryStore();
```

### `VectorMemoryStore`

Semantic search over stored memories using embeddings.

```ts
import { VectorMemoryStore, InMemoryVectorStore, OpenAIEmbeddingProvider } from 'confused-ai';

const memoryStore = new VectorMemoryStore({
  vectorStore: new InMemoryVectorStore(),
  embeddingProvider: new OpenAIEmbeddingProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small',
  }),
});
```

### Pinecone

```ts
import { VectorMemoryStore, PineconeVectorStore, OpenAIEmbeddingProvider } from 'confused-ai';

const memoryStore = new VectorMemoryStore({
  vectorStore: new PineconeVectorStore({
    apiKey: process.env.PINECONE_API_KEY!,
    indexName: 'agent-memories',
  }),
  embeddingProvider: new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! }),
});
```

### Qdrant

```ts
import { VectorMemoryStore, QdrantVectorStore, OpenAIEmbeddingProvider } from 'confused-ai';

const memoryStore = new VectorMemoryStore({
  vectorStore: new QdrantVectorStore({
    url: process.env.QDRANT_URL!,
    collectionName: 'memories',
  }),
  embeddingProvider: new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! }),
});
```

### PgVector (PostgreSQL)

```ts
import { VectorMemoryStore, PgVectorStore, OpenAIEmbeddingProvider } from 'confused-ai';

const memoryStore = new VectorMemoryStore({
  vectorStore: new PgVectorStore({
    connectionString: process.env.DATABASE_URL!,
    tableName: 'agent_memories',
  }),
  embeddingProvider: new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! }),
});
```

### Database-backed store (`DbMemoryStore`)

Persists to the framework's built-in SQLite/Postgres AgentDb:

```ts
import { createDbMemoryStore } from 'confused-ai';

const memoryStore = await createDbMemoryStore({
  connectionString: process.env.DATABASE_URL!,
  tableName: 'agent_memories',
});
```

---

## Agentic memory tools

When `enableAgenticMemory: true`, the agent gets two tools:

- **`remember(fact: string)`** — explicitly stores a fact
- **`recall(query: string)`** — retrieves relevant memories

The agent decides when to call these. Pair with `addMemoriesToContext: true` to also automatically prepend relevant memories before each run.

```ts
const agent = createAgent({
  name: 'assistant',
  instructions: `
    You are a personal assistant.
    Use remember() to store any user preference, fact, or important detail.
    Recalled memories will appear at the top of each conversation.
  `,
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  memoryStore: new InMemoryStore(),
  enableAgenticMemory: true,
  addMemoriesToContext: true,
});
```

---

## Memory distiller

Compress conversation history into concise summaries to prevent context overflow:

```ts
import { MemoryDistiller, summariseMemories, summariseConversation } from 'confused-ai';
import { OpenAIProvider } from 'confused-ai';

const distiller = new MemoryDistiller({
  llm: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! }),
  model: 'gpt-4o-mini',
  maxSummaryLength: 500,
});

// Summarise a list of stored memories into one compact string
const summary = await distiller.distill(existingMemories);
console.log(summary.summary);

// One-shot helpers
const memorySummary = await summariseMemories(llm, memories);
const conversationSummary = await summariseConversation(llm, messages);
```

---

## Summary buffer middleware

Automatically compress conversation history when it grows too long:

```ts
import { createAgent } from 'confused-ai';
import { createSummaryBufferHook } from 'confused-ai';
import { OpenAIProvider } from 'confused-ai';

const llm = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
const summaryHook = createSummaryBufferHook(llm, {
  maxMessages: 20,       // compress when history exceeds this
  keepRecentMessages: 5, // always keep the last N messages intact
});

const agent = createAgent({
  name: 'long-chat-agent',
  instructions: 'You are a long-running assistant.',
  llm,
  hooks: { beforeStep: summaryHook },
});
```

---

## Direct memory store usage

You can read and write the memory store directly without an agent:

```ts
import { InMemoryStore } from 'confused-ai';

const store = new InMemoryStore();

// Write
await store.save({ id: 'mem-1', userId: 'alice', content: 'Prefers TypeScript', createdAt: new Date() });

// Search (semantic stores support similarity; InMemoryStore does substring match)
const results = await store.search({ userId: 'alice', query: 'programming language', limit: 5 });
console.log(results);

// Delete
await store.delete('mem-1');
```

---

## Where to go next

- [RAG](./rag) — retrieve from indexed documents (different from persisted memories).
- [Session](./session) — per-conversation turn history.
- [Agents](./agents) — how to attach a memory store to `createAgent()`.
