---
title: Reasoning
description: Use explicit reasoning steps when the task benefits from inspectable intermediate thinking instead of one opaque final answer.
outline: [2, 3]
---

# Reasoning

Reasoning is useful when the system should expose intermediate steps instead of returning only a final answer. This is especially helpful when the reasoning process itself should be rendered, audited, or validated.

## When reasoning adds value

Use explicit reasoning when:

- you want to inspect how a result was reached
- the task naturally proceeds through staged analysis
- the UI should render intermediate steps
- you need event-driven reasoning output instead of one final response blob

## Recommended rollout

1. Start with a deterministic reasoning loop.
2. Validate the event and step contract first.
3. Add model-driven reasoning after the structure is clear.
4. Keep the step output easy to inspect and store.

## Design guideline

Explicit reasoning should increase clarity. If the intermediate steps are not actually more useful than the final answer, the extra complexity may not be worth it.

## Where to go next

- Use the reasoning example for a concrete event-driven loop.
- Read `planner.md` if the main need is an execution plan rather than exposed reasoning steps.