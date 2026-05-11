---
title: Agents
description: Understand the main agent authoring surfaces and how to grow from a simple agent to a production-shaped runtime.
outline: [2, 3]
---

# Agents

Agents are the center of the framework. They own instructions, model selection, tool access, and the runtime behavior that turns a prompt into a result.

## Which surface to start with

For most new code, start with the standard agent authoring path. Move to more explicit surfaces only when the boundary or execution model needs tighter control.

The practical rule is:

- use `agent()` or `createAgent()` for the normal path
- use typed builders when the input and output contract matters
- use lower-level surfaces such as `bare()` only when you need direct execution control

## What belongs in an agent

An agent should describe:

- the job it is responsible for
- the model or provider it uses
- the tools it can call
- the runtime features it needs, such as sessions, knowledge, or guardrails

An agent should not try to hide the entire application architecture inside one configuration object. Keep the responsibility clear.

## Recommended build path

1. Start with one small agent and clear instructions.
2. Validate the base response behavior.
3. Add one tool or one context layer only when needed.
4. Add resilience, serving, or orchestration after the basic shape has proven itself.

## Good agent boundaries

The best agent boundaries are task-based, not vague. “Answer support questions from policy” is a better boundary than “do everything for support.”

That clarity matters even more when you later introduce teams or supervisors, because each agent should have a reason to exist separately.

## Where to go next

- Read the API agent page for the exact authoring surfaces.
- Read `tools.md` when the agent needs system access.
- Read `session.md` and `memory.md` when continuity becomes important.