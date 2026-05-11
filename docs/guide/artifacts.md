---
title: Artifacts
description: Create and store typed durable outputs (files, images, code, data, reports, plans). createTextArtifact, createMarkdownArtifact, createDataArtifact, createPlanArtifact, createReasoningArtifact. InMemoryArtifactStorage.
outline: [2, 3]
---

# Artifacts

Artifacts are typed, versioned outputs produced by an agent run — files, reports, code, structured data, plans, reasoning traces — that should persist beyond the message text.

```ts
import {
  createTextArtifact,
  createMarkdownArtifact,
  createDataArtifact,
  createPlanArtifact,
  createReasoningArtifact,
  InMemoryArtifactStorage,
} from 'confused-ai';
```

---

## Artifact types

```ts
type ArtifactType =
  | 'file'
  | 'image'
  | 'audio'
  | 'video'
  | 'code'
  | 'data'
  | 'document'
  | 'markdown'
  | 'json'
  | 'reasoning'
  | 'plan'
  | 'report';
```

---

## Create artifacts

```ts
import {
  createTextArtifact,
  createMarkdownArtifact,
  createDataArtifact,
  createPlanArtifact,
  createReasoningArtifact,
} from 'confused-ai';

// Plain text / code file
const code = createTextArtifact({
  name: 'auth-handler.ts',
  content: `export function verifyToken(token: string) { ... }`,
  type: 'code',
  mimeType: 'text/typescript',
  tags: ['auth', 'typescript'],
  createdBy: 'code-agent',
});

// Markdown report
const report = createMarkdownArtifact({
  name: 'Q4-report.md',
  content: '## Q4 Summary\n\nRevenue up 12% YoY...',
  tags: ['report', 'q4'],
});

// Structured data
const data = createDataArtifact({
  name: 'search-results',
  content: { query: 'LLM benchmarks', results: [...] },
  type: 'json',
});

// Agent reasoning trace
const trace = createReasoningArtifact({
  steps: [
    { title: 'Analyse', action: 'Read the requirements', result: '...', confidence: 0.9 },
  ],
  conclusion: 'Use a queue-based approach.',
  model: 'gpt-4o',
});

// Execution plan
const plan = createPlanArtifact({
  goal: 'Migrate database to PostgreSQL',
  tasks: [
    { id: '1', name: 'Backup current DB', priority: 0 },
    { id: '2', name: 'Provision RDS', priority: 1, dependencies: ['1'] },
  ],
});
```

---

## `ArtifactMetadata` fields

All artifacts share these fields:

```ts
interface ArtifactMetadata {
  id: string;             // auto-generated UUID
  name: string;           // human-readable name
  type: ArtifactType;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;        // starts at 1
  tags?: string[];
  metadata?: Record<string, unknown>;  // custom key-value pairs
  createdBy?: string;     // agent name
  sessionId?: string;
}
```

---

## Store artifacts

```ts
import { InMemoryArtifactStorage } from 'confused-ai';

const storage = new InMemoryArtifactStorage({
  maxArtifacts: 1000,
  maxSizeBytes: 100 * 1024 * 1024,  // 100 MB total
});

// Store
const stored = await storage.store(report);

// Retrieve
const retrieved = await storage.get(stored.id);

// List by type
const allReports = await storage.list({
  type: 'markdown',
  tags: ['q4'],
  createdBy: 'report-agent',
});

// Search
const results = await storage.search('Q4 revenue');

// Delete
await storage.delete(stored.id);
```

---

## Emit artifacts from agent hooks

Attach artifact creation to the `afterRun` hook to capture every run's output:

```ts
import { createAgent, InMemoryArtifactStorage, createMarkdownArtifact } from 'confused-ai';

const artifactStorage = new InMemoryArtifactStorage();

const agent = createAgent({
  name: 'report-agent',
  instructions: 'Generate detailed reports when asked.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  hooks: {
    afterRun: async (result) => {
      // Persist agent text output as a markdown artifact
      const artifact = createMarkdownArtifact({
        name: `report-${result.runId}.md`,
        content: result.text,
        createdBy: 'report-agent',
        metadata: { runId: result.runId, tokens: result.usage?.totalTokens },
      });
      await artifactStorage.store(artifact);
      return result;
    },
  },
});
```

---

## `ArtifactStorage` interface

Implement this to persist artifacts to S3, GCS, or any external store:

```ts
interface ArtifactStorage {
  store<T>(artifact: Artifact<T>): Promise<Artifact<T>>;
  get<T>(id: string): Promise<Artifact<T> | null>;
  list(filter?: ArtifactFilter): Promise<ArtifactMetadata[]>;
  delete(id: string): Promise<boolean>;
  search?(query: string): Promise<ArtifactMetadata[]>;
}
```

---

## Where to go next

- [Storage](./storage) — key-value storage for lighter-weight state.
- [Hooks](./hooks) — `afterRun` where artifacts are typically created.
- [Production](./production) — audit stores for compliance.
