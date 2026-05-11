---
title: Human In The Loop
description: Add review or approval checkpoints when an agent should pause for a person instead of acting automatically.
outline: [2, 3]
---

# Human In The Loop

Human-in-the-loop design is about deciding when the system should stop and ask for a person instead of continuing automatically. It is most valuable where errors are expensive, irreversible, or sensitive.

## When to use it

Add a human checkpoint for cases such as:

- external messages or actions that could affect users
- high-impact updates to systems of record
- approvals involving security, compliance, or financial risk
- workflows where expert review is part of the process by design

## Start simple

The cleanest path is to begin with one approval gate and one clear decision point. Do not build a complicated review network before you know where the true human checkpoint belongs.

## Recommended rollout

1. Identify the exact action that should pause.
2. Add one approval store or review path for that action.
3. Make the pending state explicit so resume behavior is easy to inspect.
4. Expand only after the first checkpoint is working clearly.

## Design guideline

Human review should improve safety and clarity, not create hidden workflow complexity. The person reviewing should understand what they are approving and why the system asked for it.

## Where to go next

- Read `guardrails.md` for policy-driven blocking and validation.
- Read `production.md` when you are assembling the broader runtime safety stack.