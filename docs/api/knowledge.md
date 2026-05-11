---
title: Knowledge API
description: Understand where retrieval and document-backed context fit into confused-ai and when to add the knowledge layer.
outline: [2, 3]
---

# Knowledge API

The knowledge layer is for cases where the model should answer from indexed content instead of relying only on prompt text or short-term conversation state.

## What the knowledge layer is responsible for

Use the knowledge surface when you need to:

- ingest documents or structured content into a searchable index
- retrieve relevant context at run time
- ground answers in policies, manuals, knowledge bases, or domain documents

This is different from sessions and memory. Sessions preserve conversation continuity. Memory preserves selected facts or history. Knowledge is the retrieval-backed context layer for source material.

## When to add it

Add the knowledge layer when the model needs access to information that is too large, too dynamic, or too sensitive to paste directly into the prompt.

Typical examples are:

- customer support against product policies
- internal copilots answering from engineering docs
- document Q and A over handbooks, contracts, or onboarding material

## Recommended path

The clean rollout is:

1. Prove the base agent behavior first.
2. Add a small document set and verify retrieval quality.
3. Inspect the retrieved context before trusting the final answer.
4. Only then add memory, orchestration, or larger ingestion pipelines.

## What to keep separate

Keep these concerns distinct when designing the system:

- knowledge for external source material
- memory for selected learned facts or history
- tools for live data access and side effects

That separation makes failures easier to diagnose because you can tell whether the problem came from retrieval, missing memory, or an unavailable external tool.

## Where to go next

- Read the RAG guides and examples for end-to-end retrieval workflows.
- Use the examples when you need a runnable ingestion-to-answer pattern.