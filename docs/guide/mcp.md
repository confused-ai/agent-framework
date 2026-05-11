---
title: MCP
description: Use Model Context Protocol integrations when you want agent tools to come from external MCP servers instead of being authored locally in the app.
outline: [2, 3]
---

# MCP

Model Context Protocol support lets the framework load tools from external MCP-compatible servers. It is useful when the capabilities should be provided by another runtime instead of being implemented directly inside the application.

## When MCP is a good fit

Use MCP when:

- a tool capability already exists behind an MCP server
- the application should consume remote tools instead of maintaining local wrappers
- you want a cleaner separation between the agent app and the tool provider runtime

## Recommended rollout

1. Start with one MCP integration.
2. Validate the tool loading and execution path clearly.
3. Observe latency and failure behavior before layering orchestration on top.
4. Add more MCP sources only when the first one is already stable.

## Design guideline

MCP should reduce duplicated tool code, not hide complexity. Keep the integration surface explicit so failures are easy to trace back to either the agent runtime or the MCP server.

## Where to go next

- Read `tools.md` for the broader tool model.
- Use the MCP example for a concrete remote-tool pattern.