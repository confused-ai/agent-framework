---
title: Retrieval Augmented Generation
description: Index documents, retrieve relevant context, and ground agent answers with KnowledgeEngine — built-in vector stores, PDF/CSV/URL loaders, and pluggable backends (Pinecone, Qdrant, pgvector, Neo4j, Chroma).
outline: [2, 3]
---

# Retrieval Augmented Generation

The knowledge layer lets you ingest documents, embed them into a vector store, and attach them to an agent so answers are grounded in your content rather than model guesswork.

```ts
import {
  KnowledgeEngine,
  createKnowledgeEngine,
  InMemoryVectorStore,   // built-in, good for <10 000 docs
  loadPdf, loadCsv, loadUrl,
} from 'confused-ai';
```

---

## Quick start

```ts
import { createAgent } from 'confused-ai';
import { createKnowledgeEngine, loadUrl } from 'confused-ai';
import { OpenAIEmbeddingProvider } from 'confused-ai';

// 1. Build the engine
const kb = createKnowledgeEngine({
  embedding: new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! }),
  // default: InMemoryVectorStore (cosine similarity)
});

// 2. Ingest documents
const docs = await loadUrl('https://docs.example.com/api-reference', { recursive: true, maxPages: 20 });
await kb.ingest(docs);

// 3. Attach to agent
const agent = createAgent({
  name: 'docs-assistant',
  instructions: 'Answer questions about our product using the provided documentation.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  knowledgebase: kb,
  addKnowledgeToContext: true,   // automatically prepends retrieved chunks to system prompt
  // numKnowledgeChunks: 5,      // how many top-k chunks to retrieve (default: 5)
});

const result = await agent.run('How do I authenticate API requests?');
console.log(result.text);
```

---

## Document loaders

### Load from URL

```ts
import { loadUrl } from 'confused-ai';

const docs = await loadUrl('https://example.com/docs', {
  recursive: true,
  maxPages: 50,
  selector: 'main',  // CSS selector to extract content from
});
```

### Load PDF

```ts
import { loadPdf } from 'confused-ai';

const docs = await loadPdf('./data/handbook.pdf', {
  splitByPage: true,  // one Document per page
  metadata: { source: 'handbook', version: '2.1' },
});
```

### Load CSV

```ts
import { loadCsv } from 'confused-ai';

const docs = await loadCsv('./data/products.csv', {
  contentColumn: 'description',   // column to use as document content
  metadataColumns: ['sku', 'category', 'price'],
});
```

### Manual documents

```ts
import type { Document } from 'confused-ai';

const docs: Document[] = [
  {
    id: crypto.randomUUID(),
    content: 'The refund policy allows returns within 30 days of purchase.',
    metadata: { source: 'policy', section: 'refunds' },
  },
];
await kb.addDocuments(docs);
```

---

## Vector store backends

### InMemoryVectorStore (default)

Good for development and up to ~10 000 documents. Data is lost on process restart.

```ts
const kb = createKnowledgeEngine({
  embedding: new OpenAIEmbeddingProvider({ apiKey: '...' }),
  // InMemoryVectorStore is the default; no extra config needed
});
```

### PgvectorKnowledgeAdapter

Production-ready vector search backed by PostgreSQL + pgvector:

```ts
import { PgvectorKnowledgeAdapter, createKnowledgeEngine } from 'confused-ai';

const adapter = new PgvectorKnowledgeAdapter({
  connectionString: process.env.DATABASE_URL!,
  tableName: 'knowledge_embeddings',
  dimensions: 1536,  // match your embedding model
});

const kb = createKnowledgeEngine({ embedding: myEmbed, vectorStore: adapter });
```

### ChromaKnowledgeAdapter

```ts
import { ChromaKnowledgeAdapter } from 'confused-ai';

const adapter = new ChromaKnowledgeAdapter({
  host: 'http://localhost:8000',
  collectionName: 'my-docs',
});
```

### Neo4jKnowledgeAdapter — graph RAG

```ts
import { Neo4jKnowledgeAdapter } from 'confused-ai';

const adapter = new Neo4jKnowledgeAdapter({
  uri: process.env.NEO4J_URI!,
  username: process.env.NEO4J_USER!,
  password: process.env.NEO4J_PASSWORD!,
  database: 'docs',
});
```

### DbKnowledgeEngine — zero infra (SQLite-backed)

```ts
import { createDbKnowledgeEngine } from 'confused-ai';
import { SqliteAgentDb } from 'confused-ai';

const db = new SqliteAgentDb({ path: './agent.db' });
const kb = createDbKnowledgeEngine({ db, embedding: myEmbed });
```

---

## Retrieval options

```ts
// Manual retrieve — get chunks without running an agent
const results = await kb.retrieve('How do I reset my password?', {
  limit: 5,
  threshold: 0.75,   // minimum cosine similarity score
  filter: { source: 'help-center' },  // metadata filter
  rerank: true,       // cross-encoder reranking (if supported)
  hybrid: true,       // BM25 + vector hybrid search (if supported)
});

for (const chunk of results.chunks) {
  console.log(chunk.score, chunk.content);
}
```

---

## Embedding providers

```ts
import { OpenAIEmbeddingProvider, CohereEmbeddingProvider } from 'confused-ai';

const openaiEmbed  = new OpenAIEmbeddingProvider({ apiKey: '...', model: 'text-embedding-3-small' });
const cohereEmbed  = new CohereEmbeddingProvider({ apiKey: '...', model: 'embed-multilingual-v3.0' });
```

### Custom embedding function

Any `async (text: string) => number[]` works:

```ts
import type { EmbeddingFn } from 'confused-ai';

const myEmbed: EmbeddingFn = async (text) => {
  const res = await fetch('https://my-embed-service/embed', {
    method: 'POST', body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { embedding } = await res.json();
  return embedding;
};
```

---

## Embedding cache

Avoid re-embedding the same content on restarts:

```ts
import { withEmbeddingCache } from 'confused-ai';

const cachedEmbed = withEmbeddingCache(myEmbeddingFn, {
  store: myRedisStore,  // any Storage adapter
  ttlSeconds: 86_400,   // 24 hours
});
```

---

## Where to go next

- [Memory](./memory) — retain facts across conversations.
- [Eval](./eval) — measure RAG quality with `RAG_CRITERIA`.
- [Example 05: RAG](../examples/05-rag) — full ingestion-to-answer example.
