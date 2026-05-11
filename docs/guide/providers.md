---
title: Providers
description: Choose models and providers in a way that keeps the rest of the application stable as cost, latency, or quality requirements evolve.
outline: [2, 3]
---

# Providers

Provider choice should be an implementation decision at the model boundary, not a force that leaks through the entire codebase. The cleaner that boundary is, the easier it is to change models later without rewriting the system around them.

## Start with one known-good path

The best default is to choose one provider and one model that are good enough for the first use case, then validate behavior there before adding fallbacks or routers.

This matters because many early failures that look like “provider problems” are actually prompt, tool, or context problems.

## When to expand beyond one provider

Move beyond a single provider when there is a clear operational reason, such as:

- cost optimization
- latency optimization
- model capability differences across task types
- availability or fallback requirements

## Recommended rollout

1. Pick one provider and validate the task.
2. Make the application provider-agnostic outside the model boundary.
3. Add routing or fallbacks only after the single-path behavior is stable.
4. Observe provider behavior with real traces and evaluation, not just intuition.

## Where to go next

- Read `llm-router.md` when model routing becomes necessary.
- Read `production.md` when provider choice starts to affect runtime controls.