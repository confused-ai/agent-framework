---
title: Database
description: AgentDb — a unified interface for SQLite, PostgreSQL, MongoDB, Redis, MySQL, DynamoDB, Turso, and in-memory backends. Connect agents to structured data via AgentDb or the database tool.
outline: [2, 3]
---

# Database

`AgentDb` is the unified database abstraction used internally by sessions, memory, knowledge, schedules, and eval stores. You can also use it directly to connect agents to structured data.

```ts
import {
  SqliteAgentDb,
  PostgresAgentDb,
  MongoAgentDb,
  RedisAgentDb,
  MysqlAgentDb,
  DynamoDbAgentDb,
  TursoAgentDb,
  InMemoryAgentDb,
  createAgentDb,
} from 'confused-ai';
```

---

## Backends

### SQLite (zero-config local)

```ts
import { SqliteAgentDb } from 'confused-ai';

const db = new SqliteAgentDb({ path: './data/agent.db' });
```

### PostgreSQL

```ts
import { PostgresAgentDb } from 'confused-ai';

const db = new PostgresAgentDb({
  connectionString: process.env.DATABASE_URL!,
  // ssl: { rejectUnauthorized: false },  // for managed Postgres
});
```

### MongoDB

```ts
import { MongoAgentDb } from 'confused-ai';

const db = new MongoAgentDb({
  uri: process.env.MONGODB_URI!,
  database: 'myapp',
});
```

### Redis (key-value)

```ts
import { RedisAgentDb } from 'confused-ai';

const db = new RedisAgentDb({
  redis: process.env.REDIS_URL!,
  keyPrefix: 'myapp:',
});
```

### Turso (libSQL, edge-ready)

```ts
import { TursoAgentDb } from 'confused-ai';

const db = new TursoAgentDb({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### DynamoDB

```ts
import { DynamoDbAgentDb } from 'confused-ai';

const db = new DynamoDbAgentDb({
  region: 'us-east-1',
  tableName: 'agent-data',
});
```

### `createAgentDb` factory

Pick a backend by string at runtime:

```ts
import { createAgentDb } from 'confused-ai';

const db = createAgentDb({
  type: process.env.DB_TYPE as 'sqlite' | 'postgres' | 'mongo' | 'redis',
  // sqlite
  path: './agent.db',
  // postgres
  connectionString: process.env.DATABASE_URL,
  // mongo
  uri: process.env.MONGODB_URI,
  database: 'myapp',
});
```

---

## Plug into framework stores

The main use of `AgentDb` is wiring all framework stores to a single persistent backend:

```ts
import { createAgent } from 'confused-ai';
import { SqliteAgentDb } from 'confused-ai';
import { DbSessionStore } from 'confused-ai';
import { createDbMemoryStore } from 'confused-ai';
import { createDbKnowledgeEngine, OpenAIEmbeddingProvider } from 'confused-ai';
import { DbScheduleStore } from 'confused-ai';

const db = new SqliteAgentDb({ path: './agent.db' });

const agent = createAgent({
  name: 'persistent-agent',
  instructions: '...',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  sessionStore:  new DbSessionStore(db),
  memoryStore:   createDbMemoryStore({ db }),
  knowledgebase: createDbKnowledgeEngine({
    db,
    embedding: new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! }),
  }),
});
```

---

## Database as a tool

For agent-initiated queries, expose database access as a typed tool:

```ts
import { tool, createAgent } from 'confused-ai';
import { z } from 'zod';
import { db } from './db.js';  // your existing database client (Drizzle, Prisma, Knex...)

const lookupOrder = tool({
  name: 'lookup_order',
  description: 'Look up an order by ID. Returns order status and line items.',
  schema: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => {
    const order = await db.query.orders.findFirst({
      where: (o, { eq }) => eq(o.id, orderId),
      with: { lineItems: true },
    });
    if (!order) return { error: `Order ${orderId} not found.` };
    return order;
  },
});

const agent = createAgent({
  name: 'support-agent',
  instructions: 'Help customers with order questions.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [lookupOrder],
});
```

---

## Where to go next

- [Storage](./storage) — key-value storage for application state.
- [Session](./session) — plug `DbSessionStore` into agents.
- [Memory](./memory) — `createDbMemoryStore` for persistent memory.
- [RAG](./rag) — `createDbKnowledgeEngine` for vector search.
