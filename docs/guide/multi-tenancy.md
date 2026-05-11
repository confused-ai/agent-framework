---
title: Multi Tenancy
description: Isolate agent state, context, and runtime behavior by tenant so one customer or workspace does not bleed into another.
outline: [2, 3]
---

# Multi Tenancy

Multi-tenant systems need more than separate prompts. They need clear isolation boundaries around state, context, credentials, and operational controls.

## What should be tenant-scoped

Typical tenant boundaries include:

- session state
- memory and retrieved context
- storage and generated outputs
- credentials, approvals, and runtime permissions

## Start with explicit boundaries

The cleanest approach is to decide which layers are tenant-scoped before the system grows. If tenancy is added late and implicitly, data leakage risk increases sharply.

## Design guideline

Every time the runtime touches data, ask which tenant owns it. If the answer is not explicit, the design is probably too loose for multi-tenant use.

## Where to go next

- Read `session.md`, `memory.md`, and `storage.md` for the layers that most often need tenant separation.
- Read `production.md` for the broader runtime-control story.