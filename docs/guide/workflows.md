---
title: Workflows
description: Design structured execution paths when the order, branching, or staged shape of the task matters as much as the model output.
outline: [2, 3]
---

# Workflows

Workflows are for problems where control flow is part of the solution. They help when the task should move through explicit stages, branches, retries, or checkpoints instead of being left entirely to one free-form agent run.

## When to use a workflow

Reach for workflows when:

- the task has a clear sequence of stages
- some steps should only run after earlier steps succeed
- the path may branch based on results
- you want deterministic structure around model calls

If the task is still just “ask the model and optionally call tools,” a single agent is usually enough.

## Workflow versus orchestration

Use workflows when the main challenge is the structure of execution.

Use orchestration when the main challenge is distributing responsibilities across roles or specialists.

Many systems eventually use both, but the distinction is useful because it tells you what to design first.

## Recommended rollout

1. Start with the smallest useful sequence.
2. Make the handoff between stages explicit.
3. Add branching only when the simple path is already solid.
4. Keep the workflow inspectable so you can tell which stage caused a failure.

## Design guideline

The best workflows make the runtime easier to explain. If the graph or stage layout feels harder to understand than the original task, the workflow is probably too complicated.

## Where to go next

- Read `compose.md` for fixed sequential composition.
- Read `workflow-branching.md` for conditional paths.
- Read `graph.md` for graph-shaped execution.