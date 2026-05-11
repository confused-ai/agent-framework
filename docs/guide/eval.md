---
title: Evaluation
description: Measure quality with explicit datasets and regression checks instead of relying on intuition about whether the agent seems better than before.
outline: [2, 3]
---

# Evaluation

Evaluation is how you make quality visible. It turns “this feels better” into a measurable statement about whether the system actually improved, regressed, or just changed shape.

## Why evaluation matters

Agent systems often fail gradually. A prompt tweak, tool change, or routing decision can shift behavior in ways that are hard to notice without structured checks.

## Recommended rollout

1. Start with a small deterministic dataset.
2. Use clear success criteria.
3. Run evaluations regularly enough to catch regressions.
4. Expand the dataset only after the first checks are already useful.

## Design guideline

Evaluation should answer a real product question. If the metric is easy to compute but unrelated to user value, it will not help you make better decisions.

## Where to go next

- Read `observability.md` for run-level visibility.
- Use the eval example for a concrete regression-oriented workflow.