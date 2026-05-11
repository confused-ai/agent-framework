---
title: Tools
description: Learn when to use tools, how to keep them reliable, and how they fit into the public confused-ai runtime model.
outline: [2, 3]
---

# Tools

Tools are how an agent interacts with the real world. They let the model read live data, call application services, or trigger side effects through explicit execution contracts.

## When a tool is the right answer

Use a tool when the model needs something it cannot safely infer from prompt text alone, such as:

- account data or application records
- search, retrieval, or lookup against live systems
- sending, updating, creating, or mutating something in your environment

If the information is static and document-like, retrieval is usually a better fit than a tool.

## What good tools look like

Good tools share a few traits:

- the name tells the model exactly what the tool does
- the input schema is narrow and explicit
- the result is structured enough to reason about
- the tool can be tested independently from the model

That last point is important. A tool should be understandable as plain application code, not just as part of an agent run.

## Recommended rollout

1. Start with one tool that closes a real gap.
2. Keep the first version simple and synchronous if possible.
3. Validate the tool in isolation.
4. Only then add wrappers, caching, approvals, or MCP integration.

## Tool surfaces in the framework

For the common case, author tools directly in the public API. Use the dedicated `confused-ai/tool` surface when the problem expands into broader tool infrastructure such as MCP or advanced tool loading flows.

## Where to go next

- Read `custom-tools.md` for authoring guidance.
- Read `tool-composition.md` for wrappers and reusable behavior.
- Read the tool examples when you want runnable patterns instead of design advice.