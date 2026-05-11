---
title: Tools API
description: Understand the public tool surface, when to author custom tools, and how tools fit into the agent runtime.
outline: [2, 3]
---

# Tools API

Tools are how an agent stops guessing and starts interacting with real systems. They provide explicit execution contracts for live data access, state changes, and controlled side effects.

## What the tool surface covers

The public tool story has two main entry points:

- the common authoring path for normal custom tools
- the broader tooling surface under `confused-ai/tool` for MCP and related infrastructure

The important idea is that tools are explicit application boundaries. A tool should describe what it needs, what it does, and what it returns.

## When to write a tool

Write a tool when the model needs one of these:

- live data from your systems
- a controlled side effect such as sending, updating, or creating something
- a reusable capability that should stay outside prompt text

If the capability is just static explanation, it usually belongs in instructions or retrieval, not in a tool.

## Recommended authoring path

1. Start with one small tool that solves a real gap.
2. Keep the input schema narrow and explicit.
3. Make the return value easy for the agent to reason about.
4. Add wrappers, composition, or MCP only when the base tool shape is stable.

## Design guideline

Good tools are boring. They are named clearly, validated strictly, and easy to test without involving the model at all.

That matters because the more predictable a tool is, the easier it is for the agent to use it reliably.

## Where to go next

- Read the tools, custom-tools, and tool-composition guides for authoring guidance.
- Use the examples when you want runnable patterns for tool-backed agents.