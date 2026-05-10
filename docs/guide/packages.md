---
title: Packages & Imports
description: How confused-ai is published to npm, when to use the root package, and when to install scoped packages directly.
outline: [2, 3]
---

# Packages & Imports

confused-ai publishes both an umbrella package and focused scoped packages.

Use `confused-ai` when you want the complete framework installed once. Use `confused-ai/<subpath>` when you want focused imports from that root install. Use `@confused-ai/<package>` when a package, app, or plugin should depend on one module directly.

## Install everything

```bash
npm install confused-ai
```

The root package depends on all 40 public `@confused-ai/*` packages, so one install gives you the full framework surface.

```ts
import { agent, defineTool } from 'confused-ai';
import { createAgent } from 'confused-ai/core';
import { createSqliteStore } from 'confused-ai/session';
import { KnowledgeEngine } from 'confused-ai/knowledge';
```

Root subpaths are tiny facades over the matching scoped packages. They keep imports readable while still letting bundlers tree-shake unused modules.

## Install focused packages

```bash
npm install @confused-ai/core @confused-ai/models @confused-ai/tools
```

Direct scoped packages are best for libraries, adapters, serverless functions, or minimal services that only need part of the framework.

```ts
import { createAgent } from '@confused-ai/core';
import { OpenAIProvider } from '@confused-ai/models/openai';
import { ToolRegistryImpl } from '@confused-ai/tools';
```

Every public package includes ESM, CommonJS, and TypeScript declarations:

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

## Subpath exports

Several packages expose smaller subpaths for optional features or provider-specific imports.

```ts
import { OpenAIProvider } from '@confused-ai/models/openai';
import { createSqliteStore } from '@confused-ai/session/sqlite';
import { loadPdf } from '@confused-ai/knowledge/loaders';
import { compose } from '@confused-ai/workflow/compose';
```

The root package also exposes common facades:

```ts
import { withResilience } from 'confused-ai/production';
import { createCostRouter } from 'confused-ai/router';
import { createScheduler } from 'confused-ai/scheduler';
import { createRedisAdapter } from 'confused-ai/adapter-redis';
```

## Publish checks

The repository validates npm accessibility before publishing:

```bash
npm run package:prepare
```

That command syncs manifests, builds all scoped packages, builds the root facades, and verifies that every declared export target exists on disk. `npm run publish:packages:dry-run` runs the same preparation step before simulating npm publishes.
