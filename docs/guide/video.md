---
title: Video
description: Use video workflows when the system should process, summarize, or reason over time-based visual content instead of static text alone.
outline: [2, 3]
---

# Video

Video workflows are useful when the input is temporal and visual, not just textual. They typically involve extraction, transformation, and model reasoning stages rather than one direct prompt.

## Good fits for video workflows

Use them when:

- the source is recorded or streamed video
- the system should summarize or classify video content
- downstream tasks depend on time-based observations rather than static snapshots

## Design guideline

Break video handling into explicit stages. Extraction, summarization, and downstream decisions should stay separable so the pipeline remains understandable and testable.

## Where to go next

- Read `workflows.md` if the pipeline is multi-stage.
- Read `vision.md` when the main need is image-like understanding rather than temporal processing.