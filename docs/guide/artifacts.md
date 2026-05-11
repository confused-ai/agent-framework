---
title: Artifacts
description: Treat generated files, reports, and durable outputs as explicit runtime products instead of loose side effects hidden inside a model response.
outline: [2, 3]
---

# Artifacts

Artifacts are the durable outputs a run produces beyond plain text. They might be reports, files, structured exports, or other generated assets that should be stored, retrieved, or passed to another system explicitly.

## When artifacts matter

Artifacts become important when:

- a run produces something that must persist beyond one response
- downstream systems depend on a file or structured deliverable
- the user experience includes downloading, reviewing, or reusing generated outputs

## Design guideline

Treat artifacts as first-class outputs with clear storage and ownership boundaries. If a generated asset matters, it should not exist only as an incidental side effect buried in logs or prompt text.

## Where to go next

- Read `storage.md` for durable persistence patterns.
- Read `production.md` when artifacts become part of a larger operational workflow.