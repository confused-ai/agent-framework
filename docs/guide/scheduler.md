---
title: Scheduler
description: Run agents on a schedule with predictable handlers, inspectable run history, and a clean path from manual testing to durable automation.
outline: [2, 3]
---

# Scheduler

Scheduling is the right runtime when the system should run on time instead of in response to an interactive request. It turns agents into predictable jobs such as digests, reports, audits, or background automation.

## Good fits for scheduled agents

Use scheduled execution for jobs such as:

- daily or weekly summaries
- periodic health or quality checks
- recurring classification or enrichment work
- batch processing that does not need a live user request

## Recommended rollout

1. Start with a clear handler boundary.
2. Validate manual triggering before relying on the clock.
3. Inspect run history and failure modes.
4. Add durable schedule storage when the schedule itself must survive restarts.

## Design guideline

Scheduled work should be idempotent or at least easy to reason about when retried. If a job cannot safely be retried or replayed, the scheduler boundary needs more thought before it goes live.

## Where to go next

- Read `production.md` when the scheduled job becomes part of a broader service runtime.
- Use the scheduled agent example when you want a concrete pattern.