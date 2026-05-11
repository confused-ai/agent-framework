---
title: Graph Workflows
description: Use graph-shaped execution when the workflow is no longer a straight line and the state transitions should be explicit.
outline: [2, 3]
---

# Graph Workflows

Graphs are the richer workflow model for problems where the runtime should move among several nodes with explicit transitions instead of following a single chain.

## When a graph is justified

Use a graph when:

- the workflow has several possible routes
- the system may revisit earlier stages
- state transitions need to be explicit and inspectable
- a simple linear pipeline is no longer expressive enough

## Keep the graph small first

The easiest mistake is to design a large graph before the core transitions are proven. Start with the smallest graph that captures the actual control problem.

## Design guideline

Every node and edge should correspond to a real decision or state transition you can explain without referring to implementation details.

## Where to go next

- Read `workflows.md` for the broader workflow model.
- Read `workflow-branching.md` if the graph is still just a small conditional extension of a pipeline.