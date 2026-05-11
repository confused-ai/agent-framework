---
title: Compression
description: Manage context size when conversations or intermediate state become too large to send to the model directly on every run.
outline: [2, 3]
---

# Compression

Compression is the context-management layer for situations where the raw conversation or working set is too large to fit comfortably inside the model window.

## When compression helps

Use it when:

- sessions become long and expensive to resend verbatim
- intermediate results are larger than the model should receive directly
- you need summaries or reduced context windows to preserve cost and latency

## Start after the base flow is clear

Compression should be introduced after you understand the successful context shape. If you compress too early, it becomes harder to tell whether failures come from the prompt, the model, or the reduced context.

## Design guideline

Compression should preserve the information the task actually depends on. The point is not just to make data smaller. The point is to make the right data smaller without losing the task-critical signal.

## Where to go next

- Read `session.md` when the main problem is continuity rather than context size.
- Read `memory.md` when selected facts should be retained instead of repeatedly summarized.