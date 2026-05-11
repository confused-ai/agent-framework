# 20 · Scheduled Agents

The current scheduler surface is `confused-ai/scheduler`: register handlers, create cron schedules, and inspect run history.

## Example

```ts
import { bare } from 'confused-ai';
import {
  InMemoryScheduleRunStore,
  InMemoryScheduleStore,
  ScheduleManager,
} from 'confused-ai/scheduler';

const llm = {
  async generateText(messages: Array<{ role: string; content: unknown }>) {
    return {
      text: `Digest: ${String(messages.at(-1)?.content ?? '')}`,
      finishReason: 'stop' as const,
    };
  },
};

const digestAgent = bare({
  name: 'market-digest',
  instructions: 'Turn raw market payloads into short status summaries.',
  llm,
  tools: false,
  maxSteps: 1,
});

const manager = new ScheduleManager({
  store: new InMemoryScheduleStore(),
  runStore: new InMemoryScheduleRunStore(),
  pollIntervalMs: 60_000,
});

manager.register('market-digest', async (payload) => {
  const result = await digestAgent.run(JSON.stringify(payload ?? {}));
  return { delivered: true, summary: result.text };
});

const scheduleId = await manager.create({
  name: 'weekday digest',
  cronExpr: '0 9 * * 1-5',
  endpoint: 'market-digest',
  enabled: true,
  payload: { symbol: 'MSFT', close: 412.15, changePct: 1.8 },
});

const run = await manager.trigger(scheduleId);
console.log(run.status);
console.log(await manager.getRuns(scheduleId, 5));
```

## Notes

- Use `start()` only when you want the polling loop to run continuously.
- Use `trigger()` for tests, backfills, and one-off verification.
- The built-in store is for development; add your own persistence when schedules must survive restarts.