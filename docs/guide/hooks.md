---
title: Hooks
description: Extend the agent lifecycle with targeted custom behavior without turning hooks into an uncontrolled second application framework.
outline: [2, 3]
---

# Hooks

Hooks let you attach behavior around key lifecycle events in an agent run. They are useful when you need targeted runtime customization without rewriting the underlying agent flow.

## What hooks are for

Hooks are a good fit for things such as:

- logging and tracing enrichment
- prompt construction or augmentation
- tool-call observation
- error handling and reporting
- request-scoped metadata injection

## What hooks are not for

Hooks should not become the main place where business logic lives. If the behavior is central to the application rather than cross-cutting, it usually belongs in the agent, the tool, or the workflow itself.

## Recommended rollout

1. Add one focused hook at a time.
2. Verify the behavior with a real run.
3. Keep the hook side effects explicit and observable.
4. Avoid stacking several hooks until you understand the interaction between them.

## Design guideline

Hooks work best when they stay narrow. If a hook becomes hard to explain, it is usually doing too much.

## Where to go next

- Read `observability.md` when the goal is tracing or metrics.
- Read `tools.md` when the behavior belongs at the system boundary instead of in the lifecycle.