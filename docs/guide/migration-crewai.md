---
title: Migrate From CrewAI
description: Move CrewAI-style systems onto confused-ai by preserving the useful role boundaries while simplifying the public package and runtime story.
outline: [2, 3]
---

# Migrate From CrewAI

Migrating from CrewAI is usually less about rewriting agent concepts and more about simplifying how those concepts are expressed. The main translation is from a role-heavy framework style to a clearer single-package runtime with explicit public modules.

## What usually maps cleanly

Typical mappings are:

- agents and specialists to agent or orchestration roles
- coordinated tasks to workflows or supervisors
- shared capabilities to tools, retrieval, sessions, or runtime layers

## Recommended migration path

1. Port one working use case instead of the entire system at once.
2. Keep the original role boundaries only where they still add value.
3. Rebuild the runtime on the public `confused-ai` surface instead of mirroring old package structure.
4. Validate behavior with examples and evaluation as you migrate.

## Where to go next

- Read `orchestration.md` for role and team design.
- Read `workflows.md` when the original CrewAI setup was really a staged workflow in disguise.