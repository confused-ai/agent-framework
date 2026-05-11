---
title: Learning Machine
description: Build feedback loops deliberately so the system improves in understandable ways instead of becoming a black box that mutates without clear control.
outline: [2, 3]
---

# Learning Machine

The learning layer is about using feedback, retained signals, or evaluation outcomes to improve the system over time. It is most useful when the system should adapt, but still remain inspectable.

## When learning is worth it

Learning becomes valuable when:

- the same class of task repeats often enough to justify adaptation
- feedback can be captured in a structured way
- there is a reliable signal for what counts as improvement

## Start with explicit feedback loops

Do not begin with broad automatic adaptation. Start with one narrow loop where you can explain:

- what feedback is collected
- what changes because of that feedback
- how you know the change helped

## Design guideline

Learning should improve the system without making it mysterious. If a behavior changed and the team cannot explain why, the learning loop is too opaque.

## Where to go next

- Read `eval.md` for measuring improvement.
- Read `memory.md` when the main need is retention rather than adaptation.