---
title: Vision
description: Add image understanding when visual inputs should become part of the agent’s reasoning or decision process.
outline: [2, 3]
---

# Vision

Vision is the multimodal layer for image understanding. It is useful when the task depends on screenshots, photos, diagrams, or other visual inputs instead of plain text alone.

## When vision belongs in the design

Use it when:

- the important signal is visual
- the system should classify, extract, or reason over images
- text alone is not a sufficient representation of the input

## Design guideline

Keep the vision boundary explicit. The clearer it is where the image enters the system and how it affects the result, the easier it is to test and improve the pipeline.

## Where to go next

- Read `video.md` for temporal visual input.
- Read `voice.md` when the multimodal input is audio-driven instead.