# 21 · Code Review Pipeline

The simplest reliable pipeline in this repo is `bare()` plus `compose()` or `pipe()`. Each stage is just a normal agent.

## Example

```ts
import { bare, compose, pipe } from 'confused-ai';

const llm = {
  async generateText(messages: Array<{ role: string; content: unknown }>) {
    const prompt = String(messages.at(-1)?.content ?? '');
    return {
      text: `Processed: ${prompt.slice(0, 120)}`,
      finishReason: 'stop' as const,
    };
  },
};

const diffAnalyser = bare({
  name: 'DiffAnalyser',
  instructions: 'Summarize what changed in the diff.',
  llm,
  tools: false,
  maxSteps: 1,
});

const securityReviewer = bare({
  name: 'SecurityReviewer',
  instructions: 'Review the summary for security and auth risks.',
  llm,
  tools: false,
  maxSteps: 1,
});

const reportWriter = bare({
  name: 'ReportWriter',
  instructions: 'Turn findings into a concise review comment.',
  llm,
  tools: false,
  maxSteps: 1,
});

const reviewPipeline = compose(diffAnalyser, securityReviewer, reportWriter);
const firstResult = await reviewPipeline.run('diff --git a/src/auth.ts b/src/auth.ts');

const secondResult = await pipe(diffAnalyser)
  .then(securityReviewer)
  .then(reportWriter)
  .run('diff --git a/src/payments.ts b/src/payments.ts');

console.log(firstResult.text);
console.log(secondResult.text);
```

## Use this pattern when

- Each step should always run in a fixed order.
- You want simple stage boundaries without a full orchestration graph.
- You only need the last stage output, not a supervisor or voting protocol.