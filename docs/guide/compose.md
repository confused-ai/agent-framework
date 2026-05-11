---
title: Compose
description: Chain deterministic agent stages together when the problem is a sequence, not a team or graph.
outline: [2, 3]
---

# Compose

Composition is the simplest workflow model in the framework. It is what you use when several steps should always run in the same order and each step produces input for the next one.

## Why compose first

Many problems that initially look like orchestration are really just fixed pipelines. Composition is easier to test, easier to explain, and usually cheaper to operate.

Examples include:

- summarize, then review, then format
- classify, then enrich, then write
- analyze, then recommend, then produce final output

## Recommended rollout

1. Make each stage runnable on its own.
2. Compose the stages only after each one is understandable in isolation.
3. Keep the output boundary between stages explicit.
4. Escalate to orchestration only when a fixed chain stops being enough.

## Design guideline

Composition works best when each stage has one clear job and the entire sequence can be described in one sentence.

## Where to go next

- Read `workflows.md` for the broader control-flow model.
- Read `orchestration.md` when the problem is no longer just a fixed sequence.