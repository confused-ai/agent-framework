---
title: Storage
description: Persist application state around the agent without confusing storage, sessions, memory, and retrieval into one undifferentiated layer.
outline: [2, 3]
---

# Storage

Storage is the general persistence layer for agent-adjacent application state. Use it when data should live beyond one run, but does not naturally belong in sessions or retrieval.

## What belongs in storage

Typical storage use cases include:

- cached results
- durable run metadata
- configuration and application state
- generated outputs that should survive beyond a single call

Storage is the surrounding application memory, not the conversational memory of the agent.

## Keep the boundaries clean

The most common mistake is collapsing several concerns together. A cleaner system keeps these layers distinct:

- sessions for conversation continuity
- memory for retained facts
- knowledge for indexed source material
- storage for broader persistent state

## Recommended rollout

1. Start with the smallest storage shape that proves the use case.
2. Keep read and write boundaries explicit.
3. Add caching or more advanced durability only after correctness is verified.
4. Make persistence observable so state bugs do not get blamed on the model.

## Where to go next

- Read `database.md` when storage should sit on top of relational or queryable data.
- Read `session.md` or `memory.md` if the problem is actually conversational continuity or recall.