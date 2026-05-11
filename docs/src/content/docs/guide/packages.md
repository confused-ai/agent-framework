---
title: "Packages & Imports"
---

# Packages & Imports

Install `confused-ai` once. That is the public consumer package.

Use `confused-ai` for the common agent APIs. Use `confused-ai/<module>` when you want a more focused import path from the same installation.

```bash
npm install confused-ai
```

```ts
import { agent, defineAgent, compose, tool } from 'confused-ai';
import { TavilySearchTool } from 'confused-ai/tools';
import { createSqliteStore } from 'confused-ai/session';
import { ConsoleLogger } from 'confused-ai/observability';
```

The repository is organized internally as a monorepo, so contributors will still see `@confused-ai/*` workspace package names in implementation code and build scripts.

That internal layout is not the public install story. Consumer docs, app code, and examples should use:

- `confused-ai`
- `confused-ai/<module>`

`npm run package:prepare` still validates every exported subpath before publishing.
