---
title: Secret Manager
description: Handle secrets and credentials as runtime configuration, not as prompt content or hard-coded application state.
outline: [2, 3]
---

# Secret Manager

Secrets belong at the runtime boundary. They should be injected through configuration and infrastructure, not embedded in prompts, examples, or agent code.

## What this means in practice

Keep these rules simple:

- secrets should enter through environment or runtime configuration
- tools and integrations should receive only the credentials they need
- prompts should never contain raw secrets
- failures to load required secrets should be visible early

## Design guideline

The safest secret-handling model is explicit and boring. If a credential path is hard to explain, it is probably too easy to misuse.

## Where to go next

- Read `production.md` for the broader runtime and deployment story.
- Read `custom-adapter.md` when secret access is tied to infrastructure bindings.