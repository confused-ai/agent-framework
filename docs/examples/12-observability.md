# 12 · Observability & Hooks

The lifecycle hook surface is small and explicit. The safest docs pattern is one self-contained example that uses the real hook signatures from `AgenticLifecycleHooks`.

## Example

```ts
import { z } from 'zod/v3';
import { createAgent, tool } from 'confused-ai';

const lookupStatus = tool({
  name: 'lookup_status',
  description: 'Return a mock order status.',
  parameters: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => ({ orderId, status: 'packed' }),
});

const observedAgent = createAgent({
  name: 'observed-agent',
  instructions: 'Answer support questions and use lookup_status when order state matters.',
  model: 'gpt-4o-mini',
  tools: [lookupStatus],
  hooks: {
    beforeRun: (prompt, config) => {
      console.log('run:start', { prompt, userId: config.userId, runId: config.runId });
      return prompt;
    },
    beforeToolCall: async (name, args, step) => {
      console.log('tool:start', { name, args, step });
      return args;
    },
    afterToolCall: async (name, result, _args, step) => {
      console.log('tool:end', { name, step, result });
      return result;
    },
    buildSystemPrompt: (instructions, ragContext) =>
      [instructions, ragContext].filter(Boolean).join('\n\n'),
    afterRun: (result) => {
      console.log('run:finish', {
        steps: result.steps,
        finishReason: result.finishReason,
        usage: result.usage,
      });
      return result;
    },
    onError: (error, step) => {
      console.error('run:error', { step, message: error.message });
    },
  },
});

const result = await observedAgent.run('Check order ORD-42 and summarize the status.');
console.log(result.text);
```

## Use hooks for

- Structured logs around runs and tool calls
- Lightweight tracing with `runId` and `traceId`
- Post-run metrics based on `steps`, `finishReason`, and `usage`

Avoid assuming extra fields on `config` or `result`. If you need more metadata, pass it into your own wrapper before calling `run()`.