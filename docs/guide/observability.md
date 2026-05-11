---
title: Observability
description: Make agent behavior inspectable with traces, metrics, and evaluation so model issues do not disappear into a black box.
outline: [2, 3]
---

# Observability

Observability is how you stop guessing why an agent behaved the way it did. It covers the traces, metrics, evaluation signals, and runtime context that let you inspect what happened during a run.

## Why it matters early

Agent systems fail in ways that ordinary application logs do not fully explain. A good observability setup helps you answer questions such as:

- what prompt and context were used
- which tool calls happened
- where time or cost was spent
- whether behavior is improving or regressing over time

## Recommended rollout

1. Start with run-level logging and trace visibility.
2. Add metrics where latency, error rate, or cost matter.
3. Add deterministic evaluation before relying on intuition about quality.
4. Keep observability close to the agent boundary so the signals stay interpretable.

## Design guideline

The best observability setups are boring and consistent. If every run can be traced back to a clear request, tool sequence, and result, debugging becomes far faster.

## Where to go next

- Read `eval.md` for regression-oriented quality validation.
- Read `hooks.md` if you want to attach custom behavior at lifecycle boundaries.