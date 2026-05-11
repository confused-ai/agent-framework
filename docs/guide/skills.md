---
title: Skills
description: Package reusable capabilities so they can be applied consistently without rewriting the same prompt or tool strategy across several agents.
outline: [2, 3]
---

# Skills

Skills are the reusable capability layer of the framework. They let you capture a repeatable pattern of behavior instead of copying the same prompt logic or tool setup from agent to agent.

## When to use a skill

Use a skill when:

- a capability should be reused across several agents
- a common pattern deserves a named abstraction
- you want consistency in how a class of tasks is handled

## Design guideline

The best skills are specific enough to be predictable and broad enough to be worth reusing. If a skill is too vague, it becomes another place where behavior drifts.

## Where to go next

- Read `tools.md` and `custom-tools.md` when the reusable capability should be expressed as tools.
- Read `plugins.md` when the extension point belongs at the framework layer.