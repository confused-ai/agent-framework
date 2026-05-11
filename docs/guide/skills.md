---
title: Skills
description: Bundle reusable agent capabilities (instructions + tools) into named skills. Built-in webResearchSkill, codeReviewerSkill, pdfSummarizerSkill. Author custom skills with the Skill interface.
outline: [2, 3]
---

# Skills

Skills are capability bundles — a named set of instructions and tools that can be applied to any agent. They let you package reusable behaviours once and share them across agents without copying prompt logic or tool wiring.

```ts
import {
  webResearchSkill,
  codeReviewerSkill,
  pdfSummarizerSkill,
} from 'confused-ai/skills';
```

---

## Attach built-in skills

```ts
import { createAgent } from 'confused-ai';
import { webResearchSkill, codeReviewerSkill } from 'confused-ai/skills';

const agent = createAgent({
  name: 'research-reviewer',
  instructions: 'Help users research topics and review code.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  skills: [webResearchSkill, codeReviewerSkill],
});
```

---

## Built-in skills

### `webResearchSkill`

Gives the agent a `fetch_page` tool that retrieves the visible text from any HTTPS URL:

```ts
import { webResearchSkill } from 'confused-ai/skills';

const agent = createAgent({
  name: 'researcher',
  instructions: 'Research questions using the web.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  skills: [webResearchSkill],
});

const result = await agent.run('What is the latest version of Node.js?');
// Agent will call fetch_page('https://nodejs.org/en/download/releases') internally
```

### `codeReviewerSkill`

Gives the agent a `read_source_file` tool that loads source files from disk:

```ts
import { codeReviewerSkill } from 'confused-ai/skills';

const agent = createAgent({
  name: 'code-reviewer',
  instructions: 'Review source code files for bugs and security issues.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  skills: [codeReviewerSkill],
});

const result = await agent.run('Review src/auth/jwt.ts for security vulnerabilities.');
// Supported extensions: .ts, .js, .py, .go, .rs, .java, .sql, .yaml, .md and more
```

### `pdfSummarizerSkill`

Gives the agent the ability to load and summarise PDF documents:

```ts
import { pdfSummarizerSkill } from 'confused-ai/skills';

const agent = createAgent({
  name: 'doc-summarizer',
  instructions: 'Summarise documents and answer questions about their content.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  skills: [pdfSummarizerSkill],
});

const result = await agent.run('Summarise the document at ./reports/Q4-2024.pdf');
```

---

## Author a custom skill

A `Skill` is a plain object with `name`, optional `instructions`, and an array of `tools`:

```ts
import type { Skill } from 'confused-ai';
import { tool } from 'confused-ai';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current weather for a city.',
  schema: z.object({ city: z.string() }),
  execute: async ({ city }) => fetchWeather(city),
});

export const weatherSkill: Skill = {
  name: 'weather',
  instructions: 'You can look up current weather for any city using get_weather.',
  tools: [getWeather],
};

// Use it
const agent = createAgent({
  name: 'travel-agent',
  instructions: 'Help users plan trips.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  skills: [weatherSkill],
});
```

---

## `Skill` interface

```ts
interface Skill {
  /** Unique name for the skill */
  name: string;
  /** Additional instructions appended to the agent system prompt */
  instructions?: string;
  /** Tools this skill provides */
  tools?: Tool[];
}
```

---

## Where to go next

- [Custom tools](./custom-tools) — build the individual tools that skills expose.
- [Tool composition](./tool-composition) — wrap and extend skill tools.
- [Plugins](./plugins) — framework-level extension points.
