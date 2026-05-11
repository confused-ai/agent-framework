---
title: Admin API
description: Expose operational or supervisory agent controls carefully, with explicit boundaries around who can do what and why.
outline: [2, 3]
---

# Admin API

An admin API is not just another endpoint. It is the operational surface for inspecting, managing, or controlling agent systems at runtime. That makes it higher risk than ordinary user-facing traffic.

## What belongs in an admin API

Typical admin operations include:

- health and runtime inspection
- replay, resume, or operational diagnostics
- viewing schedules, evaluations, or recent runs
- controlled administrative actions around configuration or workflows

## Design guideline

Keep admin endpoints explicit, authenticated, and auditable. If an action would feel dangerous in a shell, it should feel dangerous in the admin API too.

## Recommended rollout

1. Start with read-only visibility endpoints.
2. Add state-changing operations only when they are clearly justified.
3. Make every administrative action observable and reviewable.
4. Keep the admin surface separate from public user traffic.

## Where to go next

- Read `production.md` for the broader operational model.
- Read `observability.md` when the main need is visibility rather than control.