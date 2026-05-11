# 16 · Intelligent LLM Router

The current router surface is one drop-in `LLMProvider`. Build a router table once, hand it to `createAgent()`, and inspect route decisions after each run.

## Example

```ts
import {
  AnthropicProvider,
  OpenAIProvider,
  createAgent,
  createSmartRouter,
} from 'confused-ai';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const anthropic = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
});

const router = createSmartRouter([
  {
    provider: openai,
    model: 'gpt-4o-mini',
    capabilities: ['simple', 'coding', 'tool_use'],
    costTier: 'small',
    speedTier: 'fast',
    contextWindow: 128_000,
  },
  {
    provider: anthropic,
    model: 'claude-sonnet-4-20250514',
    capabilities: ['reasoning', 'coding', 'long_context'],
    costTier: 'large',
    speedTier: 'medium',
    contextWindow: 200_000,
  },
]);

const assistant = createAgent({
  name: 'router-demo',
  instructions: 'Route each request to the model that fits the task best.',
  llm: router,
  tools: false,
  sessionStore: false,
  guardrails: false,
});

const answer = await assistant.run('Design a TypeScript API client with retries and tests.');

console.log(answer.text);
console.log(router.getLastRouteDecision());
```

## Practical rules

- Use `createSmartRouter()` when you want the adaptive strategy.
- Use `createBalancedRouter()` when you want cheaper, more predictable routing.
- Inspect `getLastRouteDecision()` or `getDecisionHistory()` for audit and tuning.
| `createQualityFirstRouter(entries)` | `quality` |
| `createSpeedOptimizedRouter(entries)` | `speed` |
