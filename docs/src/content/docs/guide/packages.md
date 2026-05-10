---
title: "Packages & Imports"
---

# Packages & Imports

confused-ai publishes both an umbrella package and focused scoped packages.

Use `confused-ai` for the complete framework, `confused-ai/<subpath>` for focused imports from the root install, and `@confused-ai/<package>` when a library or service should depend on one package directly.

```bash
npm install confused-ai
npm install @confused-ai/core @confused-ai/models @confused-ai/tools
```

```ts
import { agent } from 'confused-ai';
import { createAgent } from 'confused-ai/core';
import { createAgent } from '@confused-ai/core';
import { OpenAIProvider } from '@confused-ai/models/openai';
```

Every public package includes ESM, CommonJS, and TypeScript declarations. `npm run package:prepare` syncs manifests, builds all scoped packages, builds the root facades, and verifies every declared export target before publishing.
