---
title: Context Providers
description: Feed external context into agent runs with ContextProvider. Three modes — DEFAULT (system prompt injection), TOOLS (callable tools), AGENT (sub-agent). Implement ContextProvider to add databases, web search, or live data.
outline: [2, 3]
---

# Context Providers

A `ContextProvider` is a typed, reusable context source that agents can query. It wraps a backend (database, API, web) and exposes it either as injected system-prompt text, callable tools, or an agent sub-capability.

```ts
import { ContextProvider, ContextMode } from 'confused-ai';
```

---

## Modes

| Mode | Constant | Description |
|---|---|---|
| Default | `ContextMode.DEFAULT` | Provider content is injected into the system prompt before each run |
| Tools | `ContextMode.TOOLS` | Provider registers query/update tools the agent calls on demand |
| Agent | `ContextMode.AGENT` | Provider injects context AND registers as a sub-agent capability |

---

## Implement a custom provider

```ts
import { ContextProvider, ContextMode } from 'confused-ai';
import type { Answer, QueryOptions } from 'confused-ai';

class CompanyDocsProvider extends ContextProvider {
  constructor() {
    super({
      name: 'company-docs',
      mode: ContextMode.TOOLS,          // expose as a callable tool
      queryToolName: 'search_company_docs',
      instructions: 'Use search_company_docs to look up internal policies and procedures.',
    });
  }

  async query(query: string, options?: QueryOptions): Promise<Answer> {
    const docs = await internalSearch(query, {
      limit: options?.limit ?? 5,
      namespace: options?.namespace,
    });
    return {
      results: docs.map(d => ({
        id: d.id,
        name: d.title,
        content: d.body,
        snippet: d.body.slice(0, 200),
        source: 'company-docs',
      })),
    };
  }
}

// Attach to agent
const agent = createAgent({
  name: 'support-agent',
  instructions: 'Help employees with policy questions.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  contextProviders: [new CompanyDocsProvider()],
});
```

---

## Database context provider

```ts
import { ContextProvider, ContextMode } from 'confused-ai';

class CustomerContextProvider extends ContextProvider {
  constructor(private db: Database) {
    super({
      name: 'customer-context',
      mode: ContextMode.DEFAULT,   // inject as system-prompt text
    });
  }

  async query(userId: string): Promise<Answer> {
    const customer = await this.db.findCustomer(userId);
    return {
      results: [{
        id: customer.id,
        name: customer.name,
        content: `Customer: ${customer.name}, Plan: ${customer.plan}, Since: ${customer.createdAt}`,
        source: 'database',
      }],
      text: `Current customer: ${customer.name} on ${customer.plan} plan.`,
    };
  }
}
```

---

## `ContextProvider` base class

```ts
abstract class ContextProvider {
  readonly name: string;
  readonly mode: ContextMode;
  readonly queryToolName: string;    // default: `${name}_query`
  readonly updateToolName: string;   // default: `${name}_update`
  readonly metadata: Record<string, unknown>;

  // Must implement:
  abstract query(query: string, options?: QueryOptions): Promise<Answer>;

  // Optional:
  async update(documents: Document[], options?: UpdateOptions): Promise<void> { ... }
  async health(): Promise<Status> { ... }
}
```

---

## `Document` and `Answer` types

```ts
interface Document {
  id: string;
  name: string;
  uri?: string;
  content?: string;
  source?: string;          // 'database', 'web', 'gdrive', etc.
  snippet?: string;
  metadata?: Record<string, unknown>;
}

interface Answer {
  results: Document[];
  text?: string;            // optional synthesised summary
}
```

---

## `QueryOptions`

```ts
interface QueryOptions {
  userId?: string;         // for access-control aware backends
  sessionId?: string;
  namespace?: string;      // collection / partition
  limit?: number;          // max results (default: 5)
  minScore?: number;       // similarity threshold (0.0–1.0)
}
```

---

## Where to go next

- [RAG](./rag) — full retrieval pipeline with vector search and reranking.
- [Hooks](./hooks) — inject context via `buildSystemPrompt` hook.
- [Memory](./memory) — agent long-term memory as a context source.
