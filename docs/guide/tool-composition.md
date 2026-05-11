---
title: Tool Composition
description: Layer cross-cutting behavior onto tools without turning the base tool contract into a tangled implementation.
outline: [2, 3]
---

# Tool Composition

Tool composition is how you add shared behavior to tools without rewriting the same logic everywhere. It is the right place for concerns such as wrapping, extension, sequencing, and versioned evolution.

## Why composition matters

Most real tools eventually need more than raw business logic. They need things like:

- logging or metrics
- approval or policy checks
- output shaping
- compatibility layers as the tool evolves

If all of that gets pushed into the base tool body, the contract becomes harder to understand and harder to test.

## The design rule

Keep the base tool narrow and move cross-cutting behavior outward. That is the main value of composition helpers.

In practice, that means:

- the base tool owns the core capability
- wrappers own shared runtime behavior
- composition owns sequencing or adaptation between tools

## Recommended path

1. Write the plain base tool first.
2. Validate the base input and output shape.
3. Add wrappers for behavior that should be shared across several tools.
4. Use versioning when you need to preserve compatibility while the tool evolves.

## When not to compose

If a tool only exists once and the behavior is genuinely local, composition may be unnecessary. The goal is cleaner structure, not abstraction for its own sake.

## Where to go next

- Read `custom-tools.md` for base tool authoring.
- Use the tool examples when you want concrete wrapping or extension patterns.