---
title: WebSocket
description: Use WebSockets when the runtime should maintain a live connection instead of relying only on request-response HTTP calls.
outline: [2, 3]
---

# WebSocket

WebSockets are useful when the application needs an open connection for streaming, live updates, or interactive back-and-forth beyond ordinary HTTP request-response patterns.

## When WebSockets are the right transport

Use them when:

- the client should receive updates continuously
- the interaction benefits from a live connection
- streaming or event delivery is part of the experience

## Keep transport separate from behavior

The transport should carry the runtime interaction, not define the business logic. The cleaner that boundary is, the easier it is to swap or extend the delivery layer later.

## Design guideline

Treat WebSockets as a runtime choice, not as an excuse to hide stateful complexity inside the transport. Connection state and agent state should still be understandable independently.

## Where to go next

- Read `production.md` for broader runtime guidance.
- Read `observability.md` when live transport behavior should be traced and inspected.