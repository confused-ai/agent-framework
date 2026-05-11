---
title: Migrate From LangChain
description: Move LangChain-style systems onto confused-ai by translating chains and agents into clearer public runtime layers and narrower execution boundaries.
outline: [2, 3]
---

# Migrate From LangChain

LangChain migrations are usually about removing unnecessary abstraction layers while keeping the useful execution boundaries. The goal is not to reproduce every old concept one-for-one. The goal is to express the real system more directly.

## Typical translation pattern

In most migrations:

- simple chains become composition or workflows
- tool-based agents remain agents with explicit tools
- retrieval layers map to the knowledge and storage surfaces
- operational concerns move into serving, observability, and production modules

## Recommended migration path

1. Start with one narrow use case.
2. Rebuild the working path on the public `confused-ai` surface.
3. Replace broad chain abstractions with clearer agent or workflow boundaries.
4. Validate the migrated behavior before touching the next path.

## Where to go next

- Read `compose.md` and `workflows.md` if the original code was chain-shaped.
- Read `tools.md` if the migration is mainly about tool runtime boundaries.