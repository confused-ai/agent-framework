---
title: Planner
description: Separate planning from execution when the task benefits from an explicit intermediate plan rather than one direct agent response.
outline: [2, 3]
---

# Planner

Planning is useful when the system should think in terms of explicit intermediate steps before execution begins. It is most valuable when the task is large enough that the plan itself is worth inspecting.

## When explicit planning helps

Use a planner when:

- the task spans several steps and should be decomposed clearly
- the execution path benefits from an inspectable plan artifact
- you want to review or validate the plan before proceeding
- downstream stages depend on a structured plan, not just free-form text

## Recommended rollout

1. Start with direct execution first.
2. Introduce planning only when the task repeatedly benefits from decomposition.
3. Keep the plan artifact easy to inspect and reason about.
4. Validate whether the plan actually improves results instead of assuming it does.

## Design guideline

Planning should reduce ambiguity, not add ceremony. If the plan is longer or harder to reason about than the task itself, the boundary may need to be simplified.

## Where to go next

- Read `workflows.md` if the plan should drive a structured execution flow.
- Read `reasoning.md` if the main need is explicit step-by-step reasoning rather than an execution plan.