---
title: LLM Router
description: Route requests across models only when the task mix, cost profile, or latency requirements make one-model-for-everything the wrong choice.
outline: [2, 3]
---

# LLM Router

An LLM router chooses among models at runtime. It is useful when one model is no longer the best answer for every request.

## When to add routing

Routing becomes valuable when:

- some requests need speed while others need higher reasoning quality
- the cost profile varies meaningfully by task type
- you want fallback or specialization across providers or models

## Start with one model first

The cleanest route to a good router is to begin with one known-good model. Only add routing after you understand the task categories well enough to justify it.

## Design guideline

Route decisions should be observable. If the system is choosing models dynamically, you should be able to explain why a particular model was selected for a particular request.

## Where to go next

- Read `providers.md` for the broader model-selection story.
- Use the LLM router example when you want a concrete implementation pattern.