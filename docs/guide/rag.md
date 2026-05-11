---
title: Retrieval Augmented Generation
description: Add document-backed context to an agent without bloating prompts or relying on the model to remember large source material on its own.
outline: [2, 3]
---

# Retrieval Augmented Generation

Retrieval augmented generation is the right pattern when an agent should answer from your source material instead of guessing from general model knowledge or from whatever happens to be in the current conversation.

## What RAG adds

A retrieval-backed system usually has three clear steps:

1. ingest and index source material
2. retrieve relevant context for the current question
3. generate an answer grounded in that retrieved context

The quality of the result depends on retrieval quality as much as model quality.

## Good fits for RAG

Use it for cases such as:

- product and support documentation
- policy or compliance knowledge
- onboarding and internal knowledge portals
- document-backed assistants where traceability matters

## Recommended rollout

1. Start with a small document set you can inspect manually.
2. Validate retrieval quality before tuning the answer style.
3. Keep the first pipeline deterministic enough to evaluate with a real dataset.
4. Add memory, orchestration, or larger ingestion flows only after retrieval is already trustworthy.

## Design guideline

Do not treat RAG as a magic fix for weak prompting. If the retrieval step is poor, the answer step will not rescue it consistently. Inspect what was retrieved and whether it deserved to be there.

## Where to go next

- Read the knowledge API page for the retrieval surface.
- Use the RAG examples when you want a full ingestion-to-answer pattern.