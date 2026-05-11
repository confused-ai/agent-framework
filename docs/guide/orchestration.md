---
title: Orchestration
description: Move from one-agent execution to explicit teams, supervisors, roles, and delegated work when the task really needs coordination.
outline: [2, 3]
---

# Orchestration

Orchestration is the layer you reach for when one agent is no longer the right unit of work. It lets you coordinate specialists, introduce supervisors, route responsibilities, and make delegation a first-class part of the runtime.

## When orchestration is the right move

Use orchestration when the system needs one or more of these:

- specialists with different instructions or tool access
- explicit handoffs between roles
- a coordinator or supervisor that decides who should act next
- a task structure that is clearer as several focused workers instead of one general worker

If the flow is still a fixed sequence, start with composition before introducing a team.

## The core idea

Good orchestration is not about adding more agents. It is about creating better boundaries. Each role should exist for a reason that is easy to explain.

Typical reasons include:

- one agent plans while another executes
- one role gathers facts while another writes the final result
- one coordinator chooses among specialists based on the request

## Recommended rollout

1. Start with a working single-agent or fixed-pipeline version.
2. Split only the responsibility that is actually causing friction.
3. Give each role clear instructions and clear tool access.
4. Add a supervisor only when the delegation decision itself matters.

## Design guideline

When orchestration works well, the system is easier to reason about than the equivalent monolithic agent. If it becomes harder to explain, the split is probably not clean enough yet.

## Where to go next

- Read `workflows.md` for control-flow-first design.
- Read `reasoning.md` if the system needs explicit step-by-step reasoning.
- Use the team and supervisor examples for runnable patterns.