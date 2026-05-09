---
title: Custom Adapters
description: Build any adapter — session, memory, vector store, LLM provider, or background queue — in under 30 lines by implementing a single interface.
outline: [2, 3]
---

# Custom Adapters

<p class="lead">
Every storage and provider boundary in confused-ai is backed by a TypeScript interface. Implement the interface → plug it in anywhere. No subclassing, no abstract base classes, no framework entanglement.
</p>

All interfaces live in `@confused-ai/contracts` so they are available without pulling in any runtime code.

```bash
npm install @confused-ai/contracts
```

---

## Session store

The `SessionStore` interface manages conversation history across turns.

```typescript
// @confused-ai/contracts
export interface SessionStore {
  get(id: string): Promise<SessionData | undefined | null>;
  create(data: { agentId: string; userId?: string; messages?: SessionMessage[] } | string): Promise<SessionData | string>;
  update?(id: string, data: { messages: SessionMessage[] | readonly SessionMessage[] }): Promise<void>;
  delete(id: string): Promise<void>;
  // optional — implement for listing / TTL management
  listByAgent?(agentId: string): Promise<SessionData[]>;
  listByUser?(userId: string): Promise<SessionData[]>;
  touch?(id: string, ttlSeconds?: number): Promise<void>;
}
```

### Example: Upstash Redis session store

```typescript
import type { SessionStore, SessionData, SessionMessage } from '@confused-ai/contracts';
import { Redis } from '@upstash/redis';

export class UpstashSessionStore implements SessionStore {
  private readonly redis: Redis;
  private readonly ttl: number;

  constructor(opts: { redis: Redis; ttlSeconds?: number }) {
    this.redis = opts.redis;
    this.ttl   = opts.ttlSeconds ?? 86_400; // 24 h default
  }

  async get(id: string): Promise<SessionData | null> {
    return this.redis.get<SessionData>(`sess:${id}`);
  }

  async create(data: { agentId: string; userId?: string; messages?: SessionMessage[] } | string): Promise<SessionData> {
    const id      = typeof data === 'string' ? data : crypto.randomUUID();
    const agentId = typeof data === 'string' ? 'unknown' : data.agentId;
    const session: SessionData = {
      id,
      agentId,
      messages:  typeof data === 'string' ? [] : (data.messages ?? []),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.redis.set(`sess:${id}`, session, { ex: this.ttl });
    return session;
  }

  async update(id: string, data: { messages: SessionMessage[] }): Promise<void> {
    const existing = await this.get(id);
    if (existing) {
      await this.redis.set(`sess:${id}`, { ...existing, messages: data.messages, updatedAt: Date.now() }, { ex: this.ttl });
    }
  }

  async delete(id: string): Promise<void> {
    await this.redis.del(`sess:${id}`);
  }
}
```

**Wire it in:**

```typescript
import { defineAgent } from 'confused-ai';

const agent = defineAgent('my-agent')
  .model('openai:gpt-4o')
  .session(new UpstashSessionStore({ redis }))
  .build();
```

---

## Memory store

`MemoryStore` provides semantic / long-term recall across many turns.

```typescript
// @confused-ai/contracts
export interface MemoryStore {
  store(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry>;
  retrieve(query: MemoryQuery): Promise<MemorySearchResult[]>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, updates: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): Promise<MemoryEntry>;
  delete(id: string): Promise<boolean>;
  clear(type?: string): Promise<void>;
  getRecent(limit: number, type?: string): Promise<MemoryEntry[]>;
}
```

### Example: SQLite memory store (28 lines)

```typescript
import type { MemoryStore, MemoryEntry, MemoryQuery, MemorySearchResult } from '@confused-ai/contracts';
import Database from 'better-sqlite3';

export class SQLiteMemoryStore implements MemoryStore {
  private readonly db: Database.Database;

  constructor(path = ':memory:') {
    this.db = new Database(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY, type TEXT, content TEXT NOT NULL, metadata TEXT,
      createdAt INTEGER NOT NULL
    )`);
  }

  async store(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    this.db.prepare('INSERT INTO memories VALUES (?,?,?,?,?)').run(
      id, entry.type ?? null, entry.content, JSON.stringify(entry.metadata ?? {}), createdAt
    );
    return { id, createdAt: new Date(createdAt), ...entry };
  }

  async retrieve(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // Simple keyword search — replace with embedding similarity for production
    const rows = this.db.prepare(
      `SELECT * FROM memories WHERE content LIKE ? LIMIT ?`
    ).all(`%${query.query}%`, query.limit ?? 10) as Array<{ id: string; type: string; content: string; metadata: string; createdAt: number }>;
    return rows.map(r => ({ entry: { ...r, metadata: JSON.parse(r.metadata) as Record<string, unknown>, createdAt: new Date(r.createdAt) }, score: 1 }));
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as { id: string; type: string; content: string; metadata: string; createdAt: number } | undefined;
    if (!row) return null;
    return { ...row, metadata: JSON.parse(row.metadata) as Record<string, unknown>, createdAt: new Date(row.createdAt) };
  }

  async update(id: string, updates: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): Promise<MemoryEntry> {
    if (updates.content) this.db.prepare('UPDATE memories SET content = ? WHERE id = ?').run(updates.content, id);
    return (await this.get(id))!;
  }

  async delete(id: string): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    return info.changes > 0;
  }

  async clear(type?: string): Promise<void> {
    type
      ? this.db.prepare('DELETE FROM memories WHERE type = ?').run(type)
      : this.db.exec('DELETE FROM memories');
  }

  async getRecent(limit: number, type?: string): Promise<MemoryEntry[]> {
    const rows = (type
      ? this.db.prepare('SELECT * FROM memories WHERE type = ? ORDER BY createdAt DESC LIMIT ?').all(type, limit)
      : this.db.prepare('SELECT * FROM memories ORDER BY createdAt DESC LIMIT ?').all(limit)
    ) as Array<{ id: string; type: string; content: string; metadata: string; createdAt: number }>;
    return rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata) as Record<string, unknown>, createdAt: new Date(r.createdAt) }));
  }
}
```

---

## Vector store

`VectorStore` underpins RAG — add documents, search by similarity.

```typescript
// @confused-ai/contracts
export interface VectorStore {
  add(documents: Document[]): Promise<void>;
  search(query: string, topK: number): Promise<SearchResult[]>;
  get?(ids: string[]): Promise<(Document | null)[]>;
  delete?(ids: string[]): Promise<void>;
}
```

### Example: Pinecone vector store (25 lines)

```typescript
import type { VectorStore, Document, SearchResult } from '@confused-ai/contracts';
import { Pinecone } from '@pinecone-database/pinecone';
import type { EmbeddingProvider } from '@confused-ai/contracts';

export class PineconeVectorStore implements VectorStore {
  private readonly index: ReturnType<Pinecone['index']>;
  private readonly embedder: EmbeddingProvider;

  constructor(opts: { client: Pinecone; indexName: string; embedder: EmbeddingProvider }) {
    this.index    = opts.client.index(opts.indexName);
    this.embedder = opts.embedder;
  }

  async add(documents: Document[]): Promise<void> {
    const vectors = await Promise.all(
      documents.map(async (doc) => ({
        id:       doc.id,
        values:   await this.embedder.embed(doc.content),
        metadata: { content: doc.content, ...doc.metadata },
      }))
    );
    await this.index.upsert(vectors);
  }

  async search(query: string, topK: number): Promise<SearchResult[]> {
    const vector = await this.embedder.embed(query);
    const result = await this.index.query({ vector, topK, includeMetadata: true });
    return (result.matches ?? []).map((m) => ({
      document: {
        id:       m.id,
        content:  String(m.metadata?.['content'] ?? ''),
        metadata: (m.metadata ?? {}) as Record<string, unknown>,
      },
      score: m.score ?? 0,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.index.deleteMany(ids);
  }
}
```

---

## LLM provider

Any object implementing `LLMProvider` can be passed to the agent.

```typescript
// @confused-ai/contracts
export interface LLMProvider {
  generateText(messages: Message[], options?: GenerateOptions): Promise<GenerateResult>;
  streamText?(messages: Message[], options?: GenerateOptions): Promise<GenerateResult>;
}
```

### Example: Ollama local provider (22 lines)

```typescript
import type { LLMProvider, Message, GenerateOptions, GenerateResult } from '@confused-ai/contracts';

export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(opts: { baseUrl?: string; model: string }) {
    this.baseUrl = opts.baseUrl ?? 'http://localhost:11434';
    this.model   = opts.model;
  }

  async generateText(messages: Message[], _opts?: GenerateOptions): Promise<GenerateResult> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:    this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream:   false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json() as { message?: { content?: string } };
    const text = data.message?.content ?? '';
    return { text, toolCalls: [] };
  }
}
```

**Wire it in:**

```typescript
import { defineAgent } from 'confused-ai';

// Note: when using a custom LLMProvider directly, use .handler() to supply it
const provider = new OllamaProvider({ model: 'llama3.2' });

const agent = defineAgent('local-agent')
  .instructions('You are a helpful assistant running locally.')
  .handler(async (input, ctx) => {
    const result = await provider.generateText([
      { role: 'system', content: ctx?.['__instructions'] as string ?? '' },
      { role: 'user',   content: String(input) },
    ]);
    return result.text;
  })
  .build();
```

---

## Background queue adapter

`QueueAdapter` powers `@confused-ai/background` for fire-and-forget agent tasks.

```typescript
// @confused-ai/background
export interface QueueAdapter<T = unknown> {
  enqueue(task: T): Promise<void>;
  process(handler: (task: T) => Promise<void>): void;
}
```

### Example: BullMQ adapter (20 lines)

```typescript
import type { QueueAdapter } from '@confused-ai/background';
import { Queue, Worker } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export class BullMQAdapter<T = unknown> implements QueueAdapter<T> {
  private readonly queue: Queue<T>;

  constructor(name: string, connection: RedisOptions) {
    this.queue = new Queue<T>(name, { connection });
  }

  async enqueue(task: T): Promise<void> {
    await this.queue.add('task', task);
  }

  process(handler: (task: T) => Promise<void>): void {
    new Worker<T>(
      this.queue.name,
      async (job) => handler(job.data),
      { connection: (this.queue.opts.connection as RedisOptions) },
    );
  }
}
```

---

## Adapter checklist

Before shipping a custom adapter to production:

- [ ] **Implement the minimal interface** — only required methods; optional ones (`touch`, `listByAgent`, etc.) are additive
- [ ] **Run the conformance suite** — `runVectorStoreConformance` / `runSessionStoreConformance` from `@confused-ai/test-utils/conformance` covers 20+ invariants
- [ ] **Handle errors gracefully** — wrap I/O in try/catch and throw descriptive messages; the framework surfaces your error text to callers
- [ ] **Avoid blocking the event loop** — all methods must return `Promise` even if the underlying storage is synchronous (wrap with `Promise.resolve()`)
- [ ] **Export types** — publish the adapter's options interface so consumers can configure without importing the implementation

### Conformance suite

```typescript
import { runVectorStoreConformance } from '@confused-ai/test-utils/conformance';
import { describe, it, expect } from 'vitest';

runVectorStoreConformance(
  () => new PineconeVectorStore({ client, indexName: 'test', embedder }),
  { describe, it, expect },
);
```
