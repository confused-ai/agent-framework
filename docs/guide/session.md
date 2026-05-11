---
title: Sessions
description: Keep conversations continuous across runs and choose the right moment to add session persistence to an agent workflow.
outline: [2, 3]
---

# Sessions

Sessions are the continuity layer for conversational systems. They let an agent recognize that multiple runs belong to the same ongoing interaction instead of treating every prompt as a brand-new request.

## When sessions matter

Add sessions when the agent needs to remember the flow of a conversation across turns, such as:

- chat interfaces
- support flows that span several steps
- review or approval loops that resume later
- systems where the user expects the agent to know what just happened

If every request is independent, you may not need sessions at all.

## What sessions are responsible for

Sessions track conversation continuity. They are not the same as retrieval, memory, or generic storage.

- sessions preserve the thread of the interaction
- memory preserves selected facts or history beyond a single conversation shape
- knowledge provides retrieval-backed source material
- storage handles broader application state

Keeping those boundaries clear makes the runtime much easier to reason about.

## Recommended rollout

1. Start with an in-memory session store while the conversation design is still changing.
2. Decide how session identifiers are created and passed through the application.
3. Add persistence only after the continuity model is behaving the way you expect.
4. Make sure session identifiers are easy to inspect during debugging.

## Design guideline

Treat the session boundary as part of the user experience. If the session model is vague, the conversation will feel inconsistent even when the agent itself is otherwise good.

## Where to go next

- Read `memory.md` if the system should retain facts beyond ordinary conversation flow.
- Read `storage.md` if you also need durable application state around the agent.