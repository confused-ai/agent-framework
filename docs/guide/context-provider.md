---
title: Context Providers
description: Feed external context into an agent deliberately, with clear boundaries around where the context comes from and how it affects the run.
outline: [2, 3]
---

# Context Providers

Context providers are the general pattern for bringing external information into an agent run. In practice, this can mean retrieval, computed runtime context, dependency injection, or explicit prompt augmentation.

## When this pattern matters

Use a context-provider-style design when:

- the agent depends on external information that changes by request
- some context should be injected automatically at runtime
- you want the source of context to be explicit and testable

## Keep context sources distinguishable

One of the easiest ways to make an agent opaque is to mix all context sources together. Keep it clear whether the context comes from retrieval, memory, configuration, or a live system.

## Design guideline

Context should help explain the result, not make the result harder to explain. If a run uses extra context, you should be able to say where it came from and why it was included.

## Where to go next

- Read `rag.md` for retrieval-backed source context.
- Read `hooks.md` if the context should be added through lifecycle boundaries.