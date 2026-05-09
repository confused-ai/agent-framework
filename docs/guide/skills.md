---
title: Pre-built Skills
description: Drop-in capability bundles — web research, PDF summarisation, code review, and more. Add a skill in one line.
outline: [2, 3]
---

# Pre-built Skills

A **Skill** is a reusable capability bundle that combines:
- **Instructions** — system-prompt fragments prepended to the agent at run-time.
- **Tools** *(optional)* — extra tools registered automatically when you attach the skill.

Skills are composable: attach multiple skills and their instructions + tools are merged. They work with both the `defineAgent()` builder and the `agent()` config API.

```ts
import { defineAgent } from 'confused-ai';
import { webResearchSkill, codeReviewerSkill } from '@confused-ai/skills';
import { z } from 'zod';

const researchAgent = defineAgent('researcher')
  .model('openai:gpt-4o')
  .input(z.object({ topic: z.string() }))
  .output(z.object({ summary: z.string(), sources: z.array(z.string()) }))
  .skills([webResearchSkill, codeReviewerSkill])   // stack skills freely
  .build();
```

---

## `webResearchSkill`

Turns any agent into a web-research assistant. Provides instructions for:
- forming effective search queries
- evaluating source credibility
- citing references in the output
- synthesising information from multiple sources

```ts
import { webResearchSkill } from '@confused-ai/skills';
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const researcher = defineAgent('web-researcher')
  .model('openai:gpt-4o')
  .input(z.object({ query: z.string() }))
  .output(z.object({ answer: z.string(), citations: z.array(z.string()) }))
  .skills([webResearchSkill])
  .tools([webSearchTool, httpFetchTool])           // bring your own search + fetch tools
  .build();

const { answer, citations } = await researcher.run({
  query: 'Latest breakthroughs in fusion energy 2025',
});
```

### What the skill adds

```ts
// Effective instructions fragment (prepended to your base instructions):
// "When researching topics:
//  1. Form multiple distinct search queries to gather diverse perspectives.
//  2. Prefer primary sources — academic papers, official documentation, or reputable news outlets.
//  3. Cite every claim with the URL of the source document.
//  4. Synthesise conflicting information and surface disagreements explicitly."
```

### With the `agent()` API

```ts
import { agent } from 'confused-ai';
import { webResearchSkill } from '@confused-ai/skills';

const ai = agent({
  model:    'gpt-4o',
  skills:   [webResearchSkill],
  tools:    [mySearchTool],
  instructions: 'You are a research assistant focused on technology topics.',
});
```

---

## `pdfSummarizerSkill`

Adds structured document-analysis instructions. Guides the agent to:
- identify the document's purpose and audience
- extract key arguments, findings, and conclusions
- produce a structured summary with section headings
- flag gaps, limitations, or unanswered questions

```ts
import { pdfSummarizerSkill } from '@confused-ai/skills';
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const summariser = defineAgent('pdf-summariser')
  .model('anthropic:claude-3-5-sonnet-20241022')
  .input(z.object({
    documentText: z.string().describe('Full extracted text of the PDF'),
    focusAreas:   z.array(z.string()).optional(),
  }))
  .output(z.object({
    title:       z.string(),
    keyPoints:   z.array(z.string()),
    summary:     z.string(),
    limitations: z.array(z.string()).optional(),
  }))
  .skills([pdfSummarizerSkill])
  .build();

const result = await summariser.run({
  documentText: extractedPdfText,
  focusAreas:   ['methodology', 'results'],
});

console.log(result.summary);
console.log(result.keyPoints);
```

### Pairing with a PDF extraction tool

```ts
import { tool } from 'confused-ai';
import { z } from 'zod';
import { readFileSync } from 'node:fs';

// Simple text-extraction tool (use pdfjs-dist or similar in production)
const extractPdfTool = tool({
  name:        'extract_pdf',
  description: 'Extract text content from a PDF file path.',
  parameters:  z.object({ path: z.string() }),
  execute: async ({ path }) => {
    // Use your preferred PDF extraction library here
    return { text: readFileSync(path, 'utf-8') };
  },
});

const agent = defineAgent('doc-agent')
  .model('openai:gpt-4o')
  .skills([pdfSummarizerSkill])
  .tools([extractPdfTool])
  .build();
```

---

## `codeReviewerSkill`

Adds senior-engineer code-review instructions. Guides the agent to evaluate:
- **Correctness** — logical errors, off-by-one, null/undefined handling
- **Security** — injection, SSRF, secret exposure, dependency risks (OWASP Top 10)
- **Performance** — O(n²) patterns, unnecessary re-computation, blocking I/O
- **Maintainability** — naming, duplication, module coupling, test coverage gaps
- **Style** — consistency with the detected language conventions

```ts
import { codeReviewerSkill } from '@confused-ai/skills';
import { defineAgent } from 'confused-ai';
import { z } from 'zod';

const ReviewComment = z.object({
  file:     z.string(),
  line:     z.number().optional(),
  severity: z.enum(['error', 'warning', 'suggestion']),
  message:  z.string(),
});

const reviewer = defineAgent('code-reviewer')
  .model('openai:gpt-4o')
  .input(z.object({
    code:       z.string().describe('Source code to review'),
    language:   z.string().optional(),
    prTitle:    z.string().optional(),
  }))
  .output(z.object({
    summary:  z.string(),
    comments: z.array(ReviewComment),
    approved: z.boolean(),
  }))
  .skills([codeReviewerSkill])
  .build();

const result = await reviewer.run({
  code: `
    async function getUser(id) {
      const query = "SELECT * FROM users WHERE id = " + id;
      return db.query(query);
    }
  `,
  language: 'javascript',
});

// result.comments → [{ severity: 'error', message: 'SQL injection risk — use parameterised queries', ... }]
// result.approved → false
```

---

## Building custom skills

A skill is any object that conforms to the `Skill` interface from `@confused-ai/contracts`:

```ts
import type { Skill } from '@confused-ai/contracts';
import { tool } from 'confused-ai';
import { z } from 'zod';

// Optional: a tool the skill bundles
const lookupTimezoneTool = tool({
  name:        'lookup_timezone',
  description: 'Get current time for a given timezone.',
  parameters:  z.object({ timezone: z.string() }),
  execute: async ({ timezone }) => {
    return { time: new Date().toLocaleString('en-US', { timeZone: timezone }) };
  },
});

// The skill object
export const timezoneAwareSkill: Skill = {
  name:         'timezone-aware',
  instructions: `
    Always be timezone-aware when discussing times or schedules.
    Use the lookup_timezone tool to fetch the current local time when needed.
    Format times in the user's local timezone unless they ask otherwise.
  `,
  tools: [lookupTimezoneTool],  // bundled tools — registered automatically
};
```

Use it like any built-in skill:

```ts
import { defineAgent } from 'confused-ai';
import { timezoneAwareSkill } from './skills/timezone-aware';

const scheduler = defineAgent('scheduler')
  .model('openai:gpt-4o')
  .skills([timezoneAwareSkill])
  .build();
```

---

## Stacking skills

Skills compose freely. Instructions are joined in order; tools from all skills are registered together:

```ts
import { webResearchSkill, codeReviewerSkill } from '@confused-ai/skills';
import { timezoneAwareSkill } from './skills/timezone-aware';

const polyglotAgent = defineAgent('polyglot')
  .model('openai:gpt-4o')
  .instructions('You are a versatile technical assistant.')
  .skills([
    webResearchSkill,       // research instructions + web tools
    codeReviewerSkill,      // code review instructions
    timezoneAwareSkill,     // timezone instructions + timezone tool
  ])
  .build();
```

### Effective instructions at run-time

The runtime concatenates instructions as:
```
[base instructions]\n[skill 1 instructions]\n[skill 2 instructions]\n...
```

All skill tools are registered in the tool registry before the first `run()` call, so the LLM can invoke any of them during reasoning.

---

## Skills vs. tools vs. hooks

| Concept | What it adds | When to use |
|---------|-------------|-------------|
| **Tool** | A callable function the LLM can invoke | When the agent needs to take an action |
| **Skill** | Instructions + optional bundled tools | When you want reusable behavioural patterns |
| **Hook** | Lifecycle callbacks (beforeRun, afterRun, …) | When you need observability or side effects |
| **Plugin** | Middleware around every tool call | When you need cross-cutting concerns (logging, rate-limiting) |
