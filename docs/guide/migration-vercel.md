---
title: Migrate From Vercel AI SDK
description: Move from response-centric AI app code to a fuller agent runtime without losing the simplicity that made the original setup productive.
outline: [2, 3]
---

# Migrate From Vercel AI SDK

Migrating from the Vercel AI SDK is usually about widening the runtime model. The original app often already has a good request-response path. The migration adds tools, sessions, retrieval, orchestration, and runtime controls around that path.

## What usually changes

Typical changes include:

- moving from direct generation calls to explicit agents
- turning application actions into tools
- adding sessions, retrieval, or scheduling where the app grows beyond chat completion
- introducing serving and observability layers for larger systems

## Recommended migration path

1. Port the simplest successful request path first.
2. Add tools and context layers only where they are clearly needed.
3. Keep transport and UI concerns separate from the agent boundary.
4. Expand toward orchestration or runtime controls only after the base path is stable.

## Where to go next

- Read `getting-started.md` for the simplest new runtime path.
- Read `production.md` when the migrated app is becoming operationally significant.