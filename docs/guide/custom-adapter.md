---
title: Custom Adapter
description: Extend the runtime with your own infrastructure bindings when the built-in adapters are not the right fit for your environment.
outline: [2, 3]
---

# Custom Adapter

Custom adapters let you connect the framework to the infrastructure choices that are specific to your environment. They are useful when a runtime concern should plug into the framework cleanly without leaking infrastructure details into the agent logic.

## Good fits for a custom adapter

Use a custom adapter when:

- the built-in adapter does not match your storage or runtime system
- the deployment environment has a specific integration requirement
- you want a consistent way to bind infrastructure across several agents or services

## Recommended rollout

1. Start with one adapter slot and one clear responsibility.
2. Validate connect, health, and cleanup behavior independently from the agent.
3. Keep infrastructure-specific concerns inside the adapter, not inside prompts or tools.

## Where to go next

- Read `adapters.md` for the broader adapter model.
- Read `storage.md` or `session.md` when the adapter exists to back one of those layers.