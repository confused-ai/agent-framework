---
title: "Guardrails"
---

# Guardrails

Guardrails validate and filter agent inputs and outputs to enforce safety, compliance, and business rules.

> **New:** Use a `GuardrailAdapter` (via `guardrailAdapter`) to plug external content safety APIs — Azure Content Safety, AWS Bedrock Guardrails, custom NLP services — without writing a `GuardrailEngine`. See the [Adapters guide](./adapters.md).

## Allowlist guardrails

Restrict topics the agent will engage with:

```ts
import { createGuardrails } from 'confused-ai/guardrails';

const guardrails = createGuardrails({
  // Only allow these topics
  allowlist: ['billing', 'account management', 'product pricing', 'subscription'],
});

const billingAgent = agent({
  model: 'gpt-4o',
  instructions: 'You are a billing support assistant.',
  guardrails,
});
```

## Input/output validation

```ts
const guardrails = createGuardrails({
  validateInput: async (input) => {
    if (input.length > 10_000) {
      return { blocked: true, reason: 'Input too long' };
    }
    if (/\b(sql|drop|delete|truncate)\b/i.test(input)) {
      return { blocked: true, reason: 'SQL injection detected' };
    }
    return { blocked: false };
  },

  validateOutput: async (output) => {
    if (output.includes('PASSWORD') || output.includes('SECRET')) {
      return { blocked: true, reason: 'Output contains sensitive data' };
    }
    return { blocked: false };
  },
});
```

## Disable guardrails

```ts
const rawAgent = defineAgent({
  model: 'gpt-4o',
  instructions: '...',
  guardrails: false,  // no guardrails at all
});
```

## Custom guardrail middleware

For complex guardrails that need external services (content moderation APIs, etc.):

```ts
import type { GuardrailValidator } from 'confused-ai/guardrails';

const moderationGuardrail: GuardrailValidator = {
  async validateInput(input) {
    const result = await openai.moderations.create({ input });
    const flagged = result.results[0].flagged;
    return flagged
      ? { blocked: true, reason: 'Content policy violation' }
      : { blocked: false };
  },
};

const guardrails = createGuardrails({ validators: [moderationGuardrail] });
```
