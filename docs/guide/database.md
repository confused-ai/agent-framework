---
title: Database
description: Connect agents to relational or structured data safely by keeping database access behind explicit application boundaries.
outline: [2, 3]
---

# Database

Most agents should not talk to a database as an unrestricted open-ended capability. The safer and more maintainable pattern is to expose database access through explicit tools, storage layers, or application helpers.

## Why database boundaries matter

Databases usually carry business-critical data, security requirements, and operational constraints. If the agent can reach them only through narrow interfaces, the system is easier to secure, test, and debug.

## Recommended pattern

The clean path is:

1. decide what the agent actually needs from the database
2. expose that need through a tool or narrow abstraction
3. validate the query or action independently from the agent
4. add caching, indexing, or tenancy only when the access pattern is stable

## What to avoid

Avoid giving the agent a vague “database access” capability if the use case is actually just a handful of focused lookups or writes. Broad access increases both risk and debugging cost.

## Where to go next

- Use `custom-tools.md` when the database interaction should be tool-driven.
- Use `storage.md` when the persistence need is application state rather than ad hoc querying.