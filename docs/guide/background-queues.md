---
title: Background Queues
description: Use queues when agent work should run asynchronously, survive transient failures, or be processed away from the request path.
outline: [2, 3]
---

# Background Queues

Background queues are the right runtime when an agent job should not block an interactive request. They move work out of the foreground path and make retries, delayed processing, and worker-based execution possible.

## Good fits for queues

Use a queue when:

- the task may take longer than a user request should wait
- the work should be retried independently of the caller
- the system should process many jobs through one or more workers
- the caller only needs to know that work was accepted, not completed immediately

## Queue versus scheduler

Use a queue for event-driven or externally triggered async work.

Use the scheduler for time-based recurring work.

## Recommended rollout

1. Start with one job type and one worker boundary.
2. Keep the payload shape explicit.
3. Make retries and failure handling observable.
4. Add concurrency or more job types after the first path is stable.

## Where to go next

- Read `scheduler.md` for recurring, time-based execution.
- Read `production.md` for operational runtime guidance.