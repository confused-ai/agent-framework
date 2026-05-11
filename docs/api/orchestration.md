---
title: Orchestration API
description: Understand when to move from single-agent composition to teams, supervisors, roles, and delegated execution.
outline: [2, 3]
---

# Orchestration API

The orchestration surface is for systems where one agent is no longer the right unit of execution. Use it when work needs to be split across specialists, handed off, routed, or supervised explicitly.

## What lives here

`confused-ai/orchestration` is the public module for concepts such as:

- roles and specialized agents
- tasks and handoff boundaries
- supervisors and coordinators
- team-level execution and delegated work

## When you actually need orchestration

Move here only when a simpler pattern has clearly stopped being enough.

Good reasons include:

- one agent should plan while another executes
- different roles need distinct instructions or tool access
- tasks need explicit delegation or routing
- you want a system that can explain which specialist handled which part of the work

If the work is still a fixed sequence of steps, `compose()` or `pipe()` is usually simpler.

## Recommended adoption path

1. Start with a single agent and fixed composition.
2. Identify the point where responsibilities should split.
3. Create roles around those boundaries, not around vague job titles.
4. Add supervisors or routing only when the delegation decision itself matters.

## Design guideline

The most stable orchestrated systems have explicit responsibilities. Each role should have a clear goal, clear tool access, and a reason to exist separately from the others.

If two roles always do the same work in the same order, they usually belong in a simpler workflow rather than in a team abstraction.

## Where to go next

- Read the orchestration and workflow guides for rollout advice.
- Use the team and supervisor examples for runnable patterns.