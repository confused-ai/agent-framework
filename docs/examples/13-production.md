# 13 · Production Resilience

The current production surface is centered on wrappers and stores you can apply around a normal agent, not a separate "resilient agent" API.

## Example

```ts
import { createAgent } from 'confused-ai';
import { withResilience } from 'confused-ai/production';

const baseAgent = createAgent({
  name: 'ops-bot',
  instructions: 'Summarize incidents and keep answers short.',
  model: 'gpt-4o-mini',
  tools: false,
  retry: {
    maxRetries: 2,
    backoffMs: 250,
    maxBackoffMs: 2_000,
  },
  timeoutMs: 20_000,
});

const resilientAgent = withResilience(baseAgent, {
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeoutMs: 30_000,
  },
  rateLimit: {
    maxRpm: 60,
  },
  retry: {
    maxRetries: 1,
    backoffMs: 250,
    maxBackoffMs: 1_000,
  },
  healthCheck: true,
});

const result = await resilientAgent.run('Summarize the last deployment incident.');

console.log(result.text);
console.log(resilientAgent.health());
```

## Add these next

- `checkpointStore` on `createAgent()` when runs need durable resume
- `budget` on `createAgent()` when you need hard spend limits
- HTTP-level idempotency, audits, and approvals from `confused-ai/production` when you expose the agent through `createHttpService()`