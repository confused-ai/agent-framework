---
title: Guardrails
description: Apply validation and policy controls where they actually reduce risk without turning the whole system into a wall of defensive configuration.
outline: [2, 3]
---

# Guardrails

Guardrails are the rules and validation layers that keep agent behavior inside acceptable boundaries. They matter most when incorrect output is costly, unsafe, or operationally disruptive.

## What guardrails are good at

Use guardrails for concerns such as:

- input and output validation
- policy checks
- moderation or sensitive-content handling
- enforcing constraints before the result leaves the agent boundary

## When to add them

Add guardrails after the base flow is already working. That order matters because guardrails are easiest to design when you already understand the successful path and the failure cases you actually care about.

## Recommended rollout

1. Identify the specific failure you want to prevent.
2. Add the narrowest rule that blocks that failure.
3. Validate the rule against real edge cases.
4. Expand gradually instead of installing a broad policy layer that nobody understands.

## Design guideline

The best guardrails are explicit and reviewable. If a rule exists, the team should be able to explain what it protects and what tradeoff it introduces.

## Where to go next

- Read `hitl.md` when a failure should escalate to a human rather than just fail automatically.
- Read `production.md` when you are assembling the broader runtime control stack.