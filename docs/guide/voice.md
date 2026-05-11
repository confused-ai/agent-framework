---
title: Voice
description: Build voice experiences by treating speech, transcription, and downstream agent behavior as distinct runtime stages instead of one opaque interaction.
outline: [2, 3]
---

# Voice

Voice systems are useful when the user experience should begin with speech instead of typed text. They combine capture, transcription, agent execution, and often speech synthesis into one interaction path.

## What makes voice different

Voice systems carry timing, latency, and transcription constraints that ordinary text chat does not. That means the runtime design matters as much as the model response.

## Recommended rollout

1. Validate transcription quality first.
2. Keep the agent step independent from the audio transport.
3. Add streaming or low-latency runtime behavior only after the core path is already working.

## Design guideline

Treat voice as a pipeline, not a single feature toggle. The clearer the boundaries are between speech input, agent reasoning, and spoken output, the easier the system is to improve.

## Where to go next

- Read `websocket.md` when the voice experience depends on a live transport.
- Read `production.md` when latency and runtime controls become operational concerns.