---
title: Memory
description: Use memory when the agent should retain selected facts or learned context beyond ordinary turn-by-turn session continuity.
outline: [2, 3]
---

# Memory

Memory is the layer for information the system chooses to retain and recall later. It is useful when the agent should remember facts, preferences, or durable context instead of re-deriving everything from the current prompt.

## Memory is not the same as sessions or retrieval

It helps to separate these concerns clearly:

- sessions preserve the flow of a conversation
- memory retains selected facts or patterns for later recall
- retrieval brings in external source material from indexed content

That distinction matters because each layer fails differently and needs different validation.

## Good memory use cases

Memory is useful when the system should retain things such as:

- user preferences
- recurring organizational facts
- previously established constraints
- summaries or distilled signals from earlier interactions

If the information is static source material, retrieval is usually a better fit. If the information is only relevant inside one conversation, sessions may be enough.

## Recommended rollout

1. Start with explicit memory writes and explicit recall conditions.
2. Validate that the recalled information is actually helpful to the task.
3. Add persistence only after the memory policy is stable.
4. Evaluate recall quality with real prompts instead of relying on intuition.

## Design guideline

Memory should improve the system, not make it opaque. The more explicit the retention policy is, the easier it is to trust and debug what the agent brings back into context.

## Where to go next

- Read `session.md` for ordinary conversational continuity.
- Read `rag.md` when the context should come from documents instead of learned facts.