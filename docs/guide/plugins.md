---
title: Plugins
description: Add reusable extension behavior to the framework without baking every concern directly into the agent or application core.
outline: [2, 3]
---

# Plugins

Plugins are the extension surface for behavior that should be reusable, modular, and separate from the core agent logic. They are useful when a capability belongs to the framework boundary rather than to one specific agent.

## When a plugin makes sense

Use a plugin when:

- the behavior should be shared across several agents or services
- the capability is cross-cutting rather than task-specific
- you want to extend the framework without rewriting application code everywhere

## Design guideline

Keep plugins focused. If a plugin tries to own several unrelated concerns, it becomes harder to reason about than the code it was supposed to simplify.

## Where to go next

- Read `hooks.md` when the extension should attach to lifecycle events.
- Read `custom-adapter.md` when the concern is infrastructure binding rather than framework behavior.