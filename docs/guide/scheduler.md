---
title: Scheduler
description: Run agents on a cron schedule with ScheduleManager, in-memory and SQLite schedule stores, run history, and durable persistence.
outline: [2, 3]
---

# Scheduler

The scheduler module lets you register cron-based jobs that invoke agents or custom handlers automatically. Use `ScheduleManager` for in-process scheduling and `DbScheduleStore` for durable schedule persistence.

```ts
import {
  ScheduleManager,
  InMemoryScheduleStore,
  InMemoryScheduleRunStore,
  DbScheduleStore,
  validateCronExpr,
  computeNextRun,
} from 'confused-ai';
```

---

## Quick start

```ts
import { createAgent } from 'confused-ai';
import { ScheduleManager } from 'confused-ai';

const agent = createAgent({
  name: 'daily-reporter',
  instructions: 'Generate a concise daily business summary.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
});

const scheduler = new ScheduleManager();

// Register a handler function by key
scheduler.register('daily-report', async () => {
  const result = await agent.run('Generate the daily business summary for today.');
  await saveReport(result.text);
  console.log('Daily report saved.');
});

// Create a schedule
const schedule = await scheduler.create({
  name: 'Daily Business Report',
  cronExpr: '0 8 * * *',        // 08:00 UTC every day
  endpoint: 'daily-report',     // matches the registered handler key
  enabled: true,
  timezone: 'America/New_York', // IANA timezone
  maxRetries: 3,
  retryDelaySeconds: 300,
});

// Start the schedule runner (poll-based)
scheduler.start();

// Later, stop cleanly
process.on('SIGTERM', () => scheduler.stop());
```

---

## Cron expression examples

```ts
import { validateCronExpr, computeNextRun } from 'confused-ai';

// Standard 5-field cron (min hour dom mon dow)
validateCronExpr('*/5 * * * *');    // every 5 minutes — valid
validateCronExpr('0 8 * * 1-5');    // weekdays at 08:00 — valid

// Compute next run time
const next = computeNextRun('0 9 * * MON', 'Europe/London');
console.log(next.toISOString());
```

Common patterns:

| Expression | Description |
|---|---|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 8 * * *` | Daily at 08:00 UTC |
| `0 8 * * 1-5` | Weekdays at 08:00 |
| `0 0 1 * *` | First day of every month |
| `0 0 * * 0` | Every Sunday at midnight |

---

## Schedule management

```ts
const scheduler = new ScheduleManager();

// Create
const id = await scheduler.create({
  name: 'Health check',
  cronExpr: '*/15 * * * *',
  endpoint: 'health-check',
  enabled: true,
});

// List all schedules
const all = await scheduler.list();

// List only enabled
const enabled = await scheduler.list({ enabledOnly: true });

// Get one
const schedule = await scheduler.get(id);

// Update
await scheduler.update(id, { cronExpr: '*/30 * * * *', enabled: false });

// Enable / disable
await scheduler.enable(id);
await scheduler.disable(id);

// Delete
await scheduler.delete(id);
```

---

## Run history

```ts
// Get last 20 runs for a schedule
const runs = await scheduler.getRuns(id, 20);

for (const run of runs) {
  console.log(run.status, run.triggeredAt, run.completedAt, run.error);
}
// { status: 'success', triggeredAt: '2026-05-11T08:00:00Z', completedAt: '...', error: null }
```

---

## Durable schedule store (survives restarts)

```ts
import { DbScheduleStore } from 'confused-ai';
import { SqliteAgentDb } from 'confused-ai';

const db = new SqliteAgentDb({ path: './agent.db' });
const scheduleStore = new DbScheduleStore(db);

const scheduler = new ScheduleManager({ store: scheduleStore });
```

---

## Manual trigger (testing and backfill)

```ts
// Fire a schedule immediately without waiting for the cron
await scheduler.trigger(id);
```

---

## Where to go next

- [Background Queues](./background-queues) — process jobs from a queue rather than a cron.
- [Production](./production) — graceful shutdown and health checks for scheduled services.
- [Example 20: Scheduled agents](../examples/20-scheduled-agents) — full scheduled agent example.
