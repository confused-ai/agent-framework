# 19 · Reasoning

The public reasoning API is `ReasoningManager` plus streamed `ReasoningEventType` values. A deterministic generator is the clearest docs example because it shows the contract without relying on a specific model SDK.

## Example

```ts
import { NextAction, ReasoningEventType, ReasoningManager } from 'confused-ai/reasoning';

let calls = 0;

const manager = new ReasoningManager({
  minSteps: 1,
  maxSteps: 3,
  generate: async () => {
    calls += 1;

    if (calls === 1) {
      return JSON.stringify({
        title: 'Check the deployment window',
        action: 'I will compare the incident time to recent releases.',
        result: 'The spike starts minutes after the latest deployment.',
        reasoning: 'A recent change is the fastest high-confidence place to look first.',
        nextAction: NextAction.VALIDATE,
        confidence: 0.78,
      });
    }

    return JSON.stringify({
      title: 'Validate rollback hypothesis',
      action: 'I will test whether reverting the deployment removes the symptom.',
      result: 'Rollback aligns with latency returning to baseline.',
      reasoning: 'The deployment is the most likely root cause.',
      nextAction: NextAction.FINAL_ANSWER,
      confidence: 0.94,
    });
  },
});

for await (const event of manager.reason([
  { role: 'user', content: 'Diagnose why POST /orders started timing out after a release.' },
])) {
  if (event.eventType === ReasoningEventType.STEP && event.step) {
    console.log(event.step.title, event.step.nextAction);
  }

  if (event.eventType === ReasoningEventType.COMPLETED) {
    console.log(event.steps?.length);
  }
}
```

## When to use it

- When you want explicit step objects for incident triage, audits, or UI rendering.
- When you need a provider-agnostic reasoning loop around your own `generate` function.