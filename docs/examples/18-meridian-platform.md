# 18 · Meridian Platform

Meridian is best documented as a role-based team, not as one giant all-features file. The current orchestration surface is `confused-ai/orchestration`.

## Example

```ts
import { defineRole, defineTask, createTeam } from 'confused-ai/orchestration';

const llm = {
  async generateText(messages: Array<{ role: string; content: unknown }>) {
    const prompt = String(messages.at(-1)?.content ?? '');
    return {
      text: `Stubbed response for: ${prompt.slice(0, 80)}`,
      finishReason: 'stop' as const,
    };
  },
};

const sage = defineRole({
  role: 'Sage',
  backstory: 'Senior analytics specialist focused on turning raw metrics into decisions.',
  goal: 'Summarize the most important signal in the provided request.',
  llm,
});

const prism = defineRole({
  role: 'Prism',
  backstory: 'Growth strategist who turns insight into customer-facing messaging.',
  goal: 'Turn the analytics summary into a clear launch recommendation.',
  llm,
});

const analyze = defineTask({
  name: 'Analyze metrics',
  description: 'Review the input and identify the most important business signal.',
  expectedOutput: 'A concise analytics summary.',
  agent: sage,
});

const recommend = defineTask({
  name: 'Recommend launch plan',
  description: 'Convert the analytics summary into a launch recommendation.',
  expectedOutput: 'A short recommendation memo.',
  agent: prism,
  context: [analyze],
});

const team = createTeam({
  name: 'Meridian',
  agents: [sage, prism],
  tasks: [analyze, recommend],
});

const result = await team.run('Store traffic is up 18%, but conversion dropped 6% after the new landing page launch.');
console.log(result.output);
```

## What to layer on top

- Add `planning: true` when teams need a shared pre-run plan.
- Add `allowDelegation: true` on roles that should hand off work dynamically.
- Move to `createSupervisor()` when one coordinating agent should explicitly delegate to sub-agents.