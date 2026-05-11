---
title: Guardrails
description: Validate inputs and outputs, detect PII, block prompt injection, moderate content, and enforce allowlists with GuardrailValidator.
outline: [2, 3]
---

# Guardrails

Guardrails run before and after each agent step to validate messages, detect unsafe content, and enforce policies. The framework ships a `GuardrailValidator` with composable rules that you pass to `createAgent()`.

## Quick start

```ts
import { createAgent } from 'confused-ai';
import { GuardrailValidator, createPiiDetectionRule, createPromptInjectionRule } from 'confused-ai';

const guardrails = new GuardrailValidator({
  rules: [
    createPromptInjectionRule({ threshold: 0.7 }),
    createPiiDetectionRule({ redact: true }),
  ],
});

const agent = createAgent({
  name: 'safe-agent',
  instructions: 'You are a helpful assistant.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  guardrails,
});
```

Pass `guardrails: false` to disable all guardrails (including the default PII guardrail that runs when you omit the option).

---

## `GuardrailValidator`

The core engine. Compose any combination of built-in and custom rules.

```ts
import { GuardrailValidator } from 'confused-ai';

const guardrails = new GuardrailValidator({
  rules: [rule1, rule2, rule3],
  onViolation: (violation, ctx) => {
    // called when any rule fires
    console.warn('Guardrail violation:', violation.rule, violation.message);
    // return 'block' | 'warn' | 'redact' | 'continue'
  },
});
```

---

## PII detection

Detect and optionally redact personally identifiable information:

```ts
import { createPiiDetectionRule } from 'confused-ai';

const piiRule = createPiiDetectionRule({
  redact: true,           // replace PII with [REDACTED]
  // redact: false        // just flag without modifying

  // PII types to detect (all enabled by default):
  types: ['email', 'phone', 'ssn', 'credit_card', 'jwt', 'aws_key', 'ip_address'],
});
```

**Detected PII types:** `email` · `phone` · `ssn` · `credit_card` · `jwt` · `aws_key` · `ip_address` · and more from `PII_PATTERNS`.

```ts
import { detectPii, PII_PATTERNS } from 'confused-ai';

// Use standalone (no agent required)
const result = await detectPii('Contact me at alice@example.com or 555-123-4567');
console.log(result.found);    // true
console.log(result.matches);  // [{ type: 'email', value: 'alice@example.com' }, ...]
```

---

## Prompt injection detection

Block attempts to hijack the agent via crafted input:

```ts
import { createPromptInjectionRule, detectPromptInjection } from 'confused-ai';

const injectionRule = createPromptInjectionRule({
  threshold: 0.7,    // 0.0–1.0; higher = stricter. Default: 0.7
});

// Standalone usage:
const detection = await detectPromptInjection('Ignore all previous instructions and...');
console.log(detection.score);     // 0.95
console.log(detection.signals);   // ['ignore_previous', 'jailbreak_attempt']
```

### LLM-based injection classifier (higher accuracy)

```ts
import { createLlmInjectionClassifier } from 'confused-ai';
import { OpenAIProvider } from 'confused-ai';

const injectionRule = createLlmInjectionClassifier({
  llm: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! }),
  model: 'gpt-4o-mini',
  threshold: 0.8,
});
```

---

## Content moderation

### OpenAI Moderation API

```ts
import { createOpenAiModerationRule } from 'confused-ai';

const moderationRule = createOpenAiModerationRule({
  apiKey: process.env.OPENAI_API_KEY!,
  // Block if any category score exceeds threshold:
  thresholds: {
    hate: 0.7,
    'hate/threatening': 0.5,
    harassment: 0.7,
    'self-harm': 0.5,
    sexual: 0.8,
    violence: 0.7,
  },
});
```

### Forbidden topics

```ts
import { createForbiddenTopicsRule } from 'confused-ai';

const topicsRule = createForbiddenTopicsRule({
  topics: ['competitor pricing', 'internal salary data', 'acquisition plans'],
  action: 'block',  // 'block' | 'warn'
});
```

---

## Content and length rules

```ts
import {
  createContentRule,
  createMaxLengthRule,
  createAllowlistRule,
  createSensitiveDataRule,
  createUrlValidationRule,
} from 'confused-ai';

const rules = [
  // Block responses that contain specific patterns
  createContentRule({
    patterns: [/\b(password|secret|token)\s*[:=]/i],
    action: 'block',
    message: 'Response contains sensitive credential patterns.',
  }),

  // Limit output length
  createMaxLengthRule({ maxChars: 10_000 }),

  // Only allow certain output patterns
  createAllowlistRule({
    patterns: [/^[a-z0-9\s.,!?-]+$/i],
    action: 'block',
  }),

  // Flag sensitive data patterns
  createSensitiveDataRule({ patterns: SENSITIVE_DATA_PATTERNS }),

  // Block requests to disallowed domains
  createUrlValidationRule({
    allowedDomains: ['api.company.com', 'docs.company.com'],
  }),
];
```

---

## Tool allowlist

Restrict which tools the agent can call from within a guardrail rule:

```ts
import { createToolAllowlistRule } from 'confused-ai';

const toolRule = createToolAllowlistRule({
  allowedTools: ['search_orders', 'get_product_info'],
  // Any tool not in this list is blocked before execution
});
```

---

## Custom rules

```ts
import type { GuardrailRule, GuardrailContext, GuardrailResult } from 'confused-ai';

const noProfanityRule: GuardrailRule = {
  name: 'no-profanity',
  type: 'output',   // 'input' | 'output' | 'both'
  check: async (ctx: GuardrailContext): Promise<GuardrailResult> => {
    const text = typeof ctx.message.content === 'string' ? ctx.message.content : '';
    const hasProfanity = /\b(badword1|badword2)\b/i.test(text);

    if (hasProfanity) {
      return {
        passed: false,
        action: 'block',
        message: 'Response contains prohibited language.',
        rule: 'no-profanity',
      };
    }
    return { passed: true };
  },
};

const guardrails = new GuardrailValidator({ rules: [noProfanityRule] });
```

---

## Full example: production guardrail stack

```ts
import { createAgent } from 'confused-ai';
import {
  GuardrailValidator,
  createPromptInjectionRule,
  createPiiDetectionRule,
  createOpenAiModerationRule,
  createForbiddenTopicsRule,
  createMaxLengthRule,
  createToolAllowlistRule,
} from 'confused-ai';

const guardrails = new GuardrailValidator({
  rules: [
    createPromptInjectionRule({ threshold: 0.75 }),
    createPiiDetectionRule({ redact: true }),
    createOpenAiModerationRule({ apiKey: process.env.OPENAI_API_KEY! }),
    createForbiddenTopicsRule({ topics: ['competitor pricing', 'legal strategy'] }),
    createMaxLengthRule({ maxChars: 8_000 }),
    createToolAllowlistRule({ allowedTools: ['search', 'get_order', 'send_email'] }),
  ],
  onViolation: (violation) => {
    // Send to your audit log
    auditLogger.warn({ rule: violation.rule, action: violation.action, score: violation.score });
  },
});

const agent = createAgent({
  name: 'customer-service',
  instructions: 'You are a customer service agent for Acme Corp.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  guardrails,
  tools: [searchTool, orderTool, emailTool],
});
```

---

## Where to go next

- [HITL](./hitl) — escalate violations to a human instead of auto-blocking.
- [Production](./production) — rate limiting, circuit breakers, and audit logging.
- [Agents](./agents) — how guardrails fit into the full `createAgent()` config.
