---
title: Admin API
description: Mount operational endpoints for health, agent listing, audit logs, approvals, and stats via createHttpService({ adminApi }). Bearer-token secured. Eight read-only endpoints.
outline: [2, 3]
---

# Admin API

The Admin API is an operational overlay mounted inside `createHttpService`. It exposes read-only visibility into agent health, audit logs, active sessions, pending approvals, and throughput statistics.

```ts
import { createHttpService } from 'confused-ai/serve';
import { createSqliteAuditStore, createSqliteCheckpointStore } from 'confused-ai/production';
```

---

## Enable the Admin API

```ts
import { createHttpService } from 'confused-ai/serve';
import { apiKeyAuth } from 'confused-ai/serve';
import { createSqliteAuditStore, createSqliteCheckpointStore } from 'confused-ai/production';

const svc = createHttpService({
  agents: { assistant },
  adminApi: {
    enabled: true,
    prefix: '/admin',               // default: /admin
    bearerToken: process.env.ADMIN_BEARER_TOKEN!,
    auditStore: createSqliteAuditStore('./agent.db'),
    checkpointStore: createSqliteCheckpointStore('./agent.db'),
  },
});

await listenService(svc, 8787);
// Admin endpoints now live at http://localhost:8787/admin/*
```

> **Warning:** If `bearerToken` is omitted the Admin API is unprotected. A warning is logged. Never deploy without `bearerToken` in production.

---

## Endpoints

All endpoints are under the configured prefix (default `/admin`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/health` | Deep health check — uptime, memory, process info |
| `GET` | `/admin/agents` | List registered agents + metadata |
| `GET` | `/admin/audit` | Paginated audit log (from `auditStore`) |
| `GET` | `/admin/sessions` | Active session listing |
| `GET` | `/admin/approvals` | Pending HITL approvals |
| `GET` | `/admin/checkpoints` | Active resumable run checkpoints |
| `GET` | `/admin/stats` | Aggregated request + error + token counts |

Authentication is `Authorization: Bearer <token>` on every request.

---

## Sample responses

```bash
# Health check
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8787/admin/health

# Audit log (last 20 entries)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8787/admin/audit?limit=20"

# Pending approvals
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8787/admin/approvals

# Throughput stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8787/admin/stats
```

---

## `AdminApiOptions`

```ts
interface AdminApiOptions {
  /** Enable the admin API (default: false) */
  enabled?: boolean;
  /** URL prefix (default: /admin). Must start with /. */
  prefix?: string;
  /** Bearer token required for all admin requests. */
  bearerToken?: string;
  /** Durable audit store. Falls back to 500-entry in-memory ring buffer. */
  auditStore?: AuditStore;
  /** Checkpoint store for active resumable runs. */
  checkpointStore?: AgentCheckpointStore;
}
```

---

## Full `createHttpService` example

```ts
import { createHttpService, listenService, apiKeyAuth } from 'confused-ai/serve';
import {
  createSqliteAuditStore,
  createSqliteIdempotencyStore,
  createOpenAIRateLimiter,
} from 'confused-ai/production';

const svc = createHttpService({
  agents: { assistant, coder },

  // CORS (allow local UI)
  cors: process.env.CORS_ORIGIN ?? '*',

  // Auth
  auth: { strategy: 'api-key', keys: [process.env.API_KEY!] },

  // Rate limiting
  rateLimit: createOpenAIRateLimiter({ maxRequests: 60, intervalMs: 60_000 }),

  // Idempotency
  idempotency: {
    store: createSqliteIdempotencyStore('./agent.db'),
    ttlMs: 24 * 60 * 60_000,
  },

  // Audit log
  auditStore: createSqliteAuditStore('./agent.db'),

  // WebSocket streaming
  websocket: true,

  // Admin API
  adminApi: {
    enabled: true,
    bearerToken: process.env.ADMIN_BEARER_TOKEN!,
    auditStore: createSqliteAuditStore('./agent.db'),
  },
});

await listenService(svc, 8787);
```

---

## Where to go next

- [Production](./production) — circuit breakers, audit stores, graceful shutdown.
- [Observability](./observability) — OpenTelemetry traces for deeper inspection.
- [HITL](./hitl) — manage approvals exposed under `/admin/approvals`.
