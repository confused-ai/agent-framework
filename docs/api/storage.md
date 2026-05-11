---
title: Storage API
description: Use storage for durable application state that does not belong in sessions, memory, or transient prompt context.
outline: [2, 3]
---

# Storage API

The storage surface is the generic persistence layer in the framework. It is where application state lives when that state is not naturally part of a session or a retrieval index.

## What storage is for

Use storage when you need durable data for things such as:

- caches and precomputed values
- configuration and application state
- run metadata or durable outputs
- agent-adjacent data that should survive beyond one call

## What storage is not for

Keep these boundaries clear:

- sessions are for conversation continuity
- memory is for retained facts and agent recall patterns
- knowledge is for indexed document retrieval
- storage is for broader persistence that supports the application around the agent

That distinction keeps the runtime understandable and makes it easier to choose the right backing system.

## Recommended path

1. Start with the simplest storage shape that proves the flow.
2. Keep read and write boundaries explicit.
3. Add caching or replication only after correctness is verified.
4. Avoid hiding core business data inside prompt assembly logic.

## Design guideline

Treat storage as an application boundary, not just an implementation detail. The clearer that boundary is, the easier it is to test agent behavior independently from persistence behavior.

## Where to go next

- Read the storage guide for design advice.
- Use the storage example when you need a concrete pattern around cached or durable state.