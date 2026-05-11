---
title: Custom Tools
description: Author small, reliable tools that expose application capabilities to agents without leaking unnecessary complexity into prompts.
outline: [2, 3]
---

# Custom Tools

Custom tools are usually the first place where your application logic meets the agent runtime. This is where the framework stops being generic and starts becoming your actual product.

## What a custom tool should do

A custom tool should give the agent access to one clear capability, for example:

- look up a record
- search a system
- create or update something
- perform a deterministic computation

The tool should not become a mini application with several unrelated branches. If that happens, split it.

## How to keep custom tools clean

The easiest way to keep tool authoring sane is to separate the layers:

- keep validation in the schema
- keep business logic in the tool body or a plain helper
- keep runtime policies such as approval or rate control outside the base logic when possible

That split makes the tool easier to test and easier to reuse.

## Recommended authoring path

1. Define the smallest input shape that solves the use case.
2. Return the simplest useful result shape.
3. Verify the tool on its own before involving the model.
4. Add wrappers only after the base tool contract is stable.

## What to avoid

Avoid vague tool names, catch-all inputs, and outputs that force the model to parse large unstructured text blobs unless that output shape is truly necessary.

The clearer the contract, the more predictable the agent behavior will be.

## Where to go next

- Read `tools.md` for the broader tool model.
- Read `tool-composition.md` when you want to add reusable wrappers or versioned behavior.