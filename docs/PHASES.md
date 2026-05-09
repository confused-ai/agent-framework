# Execution Phases — confused-ai Framework Remediation

> Every phase is **independently mergeable** and **independently testable**.
> Gates must stay green before the next phase starts: `bun run typecheck && bun run test`.
>
> Use the **Agent Prompt** block at the end of each phase as a single copy-paste to GitHub Copilot, Claude, or any coding agent to execute that phase end-to-end.

---

## How To Use This File

1. Open `PROGRESS.md` alongside this file.
2. Pick the next unchecked phase.
3. Copy the **Agent Prompt** block for that phase.
4. Paste it into your coding agent. The agent executes all tasks in the phase.
5. Run validation commands listed under **Gate** for the phase.
6. Tick every completed item in `PROGRESS.md`.
7. Commit, then move to the next phase.

---

## Phase 0 — Baseline Freeze (1–2 days)

**Goal**: stop the bleeding. Fix the two packaging bugs that block consumers today and freeze surface area so subsequent phases have a stable base to work from.

### Tasks

| # | File | Action | Edge Cases |
|---|---|---|---|
| 0-1 | `package.json` | Remove `"./extensions"` from `exports` map — no `src/extensions*` source exists | Check if any test or example imports `confused-ai/extensions`; if so, add a stub first |
| 0-2 | `tsup.config.ts` | Confirm there is no `extensions` entry; if stub added in 0-1, add matching entry | Keep format symmetrical with neighbouring entries |
| 0-3 | `package.json` `prepack` | Add `bun run lint:packages` to `prepack` behind a `|| true` initially so the gate is visible without blocking | Remove `|| true` once Phase 1 lands |
| 0-4 | `eslint.config.js` | Register `@typescript-eslint` plugin for the `src/**` block so existing disable comments are valid | Do not change rule severities yet — just register the plugin |
| 0-5 | `PACKAGES.md` or `docs/ARCHITECTURE-OWNERSHIP.md` | Add a one-row-per-package table: package name, domain layer, public/experimental, allowed-import domains | Mark `learning`, `compression`, `video`, `voice` as **experimental** |
| 0-6 | `vitest.config.ts` | Ensure `coverage` excludes `src/adapters`, `src/dx`, `src/runtime` (compatibility facades only) | Verify `bun run test` still exits 0 |

### Gate

```bash
bun run typecheck && bun run test
# ./extensions import must 404 cleanly (not resolve to undefined module)
node -e "import('confused-ai/extensions').catch(e => { if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED') throw e; process.exit(0); })"
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 0 of the remediation plan exactly as described below. Do not add any unrelated changes.

TASK 0-1: Open package.json. Find the "exports" object. Remove the "./extensions" key and its entire value block ({ types, import, require }). Before removing, grep the entire repo for any import of "confused-ai/extensions" — if found, note it in a comment but still remove the export (we will handle consumers in Phase 4 when the real extensions package lands).

TASK 0-2: Open tsup.config.ts. Confirm there is no "extensions" key in the entry object. If 0-1 added a stub src/extensions/index.ts, add a matching entry here. Otherwise no change needed.

TASK 0-3: Open package.json. In the "scripts" object, find "prepack". Append " && bun run lint:packages || true" to the end of the prepack command so lint is visible in CI output without failing the pack. Do not change anything else.

TASK 0-4: Open eslint.config.js. Find the config block that targets "src/**". Ensure it includes the @typescript-eslint plugin import and registers it in the plugins object. Do not change any rule severities.

TASK 0-5: Open PACKAGES.md (create it at repo root if it does not exist). Add or replace the content with a markdown table with columns: Package | Domain | Status | Allowed Imports. Fill one row per package under packages/. Mark packages/learning, packages/compression, packages/video, packages/voice as "experimental". All others are "stable" unless noted in the audit.

TASK 0-6: Open vitest.config.ts. In the coverage configuration, ensure src/adapters, src/dx, src/runtime are in the exclude list.

After all tasks: run "bun run typecheck && bun run test" and confirm exit 0. Report any failures.
```

---

## Phase 1 — Contracts as Single Source of Truth (3–5 days)

**Goal**: eliminate the 5 `SessionStore`, 3 `MemoryStore`, 3 `LLMProvider`, 3 `ToolRegistry` competing interfaces. After this phase, one definition exists in `@confused-ai/contracts`; every other package re-exports or extends it.

### Tasks

| # | File | Action | Edge Cases |
|---|---|---|---|
| 1-1 | `packages/contracts/src/interfaces.ts` (new) | Create canonical interfaces: `LLMProvider`, `Message`, `GenerateOptions`, `GenerateResult`, `Tool`, `ToolRegistry`, `SessionStore`, `SessionData`, `SessionMessage`, `MemoryStore`, `MemoryEntry`, `MemoryQuery`, `VectorStore`, `EmbeddingProvider`, `KVStore` (rename from graph's `MemoryStore`) | Keep existing `adapters.ts`; new file is additive; re-export from `contracts/src/index.ts` |
| 1-2 | `packages/contracts/src/index.ts` | Add `export * from './interfaces.js'` | Verify no name collisions with existing exports |
| 1-3 | `packages/graph/src/types.ts` | Rename local `MemoryStore` → `KVStore`. Import `LLMProvider`, `LLMMessage` from `@confused-ai/contracts`. Delete local re-declarations. | Graph engine tests must still pass. The comment block explaining the shim must be removed — the shim is no longer needed. |
| 1-4 | `packages/core/src/agent.ts` | Remove local `SessionStore` re-declaration (line 36). Import `SessionStore` from `@confused-ai/contracts`. | Check `CreateAgentOptions` still resolves — it references the local type |
| 1-5 | `packages/core/src/runner/types.ts` | Remove local `LLMProvider`, `ToolRegistry`. Import from `@confused-ai/contracts`. Keep `ITextGenerator`, `IStreamingProvider`, `IToolCallProvider`, `IEmbeddingProvider` as local ISP sub-interfaces that extend the canonical base. | These ISP sub-interfaces are additive and useful; do not delete them |
| 1-6 | `packages/agentic/src/_tool-types.ts` | Remove local `ToolRegistry`. Import from `@confused-ai/contracts`. | Verify `_tool-types.ts` is not in the public barrel — if it is, keep the re-export |
| 1-7 | `packages/session/src/types.ts` | Make `SessionStore` here `export type { SessionStore } from '@confused-ai/contracts'` — or keep the local definition as the canonical one and update contracts to re-export it. Decide: contracts owns the interface. | The `session` package `SessionStore` has `appendMessage()` which `contracts` does not — add `appendMessage` to the canonical interface |
| 1-8 | `packages/contracts/src/adapters.ts` | `SessionStore` here uses different method names (`create(userId)`, `append`, `touch`, `listByUser`). Rename: `create(userId)` → `createForUser(userId)`, keep the semantic memory `SessionStore` as the canonical one. OR consolidate into one with all methods. | Best approach: add `listByUser` and `touch` to the canonical `SessionStore`. Deprecated old `create(userId)` form behind an overload. |
| 1-9 | `packages/shared/src/try-import.ts` (new) | Implement `tryImport<T>(specifier: string): Promise<T \| null>` using dynamic `import()`. Export from `@confused-ai/shared`. | Must handle both ESM default exports and CommonJS module.exports shapes. Test with a non-existent specifier. |
| 1-10 | All 14 `require()` sites | Replace with `await tryImport<T>(specifier)` from `@confused-ai/shared`. Affected files: `packages/session/src/redis-store.ts`, `sqlite.ts`, `packages/db/src/postgres.ts`, `packages/learning/src/*-stores.ts`, `packages/config/src/secret-manager.ts`, `packages/observe/src/logger.ts`, `packages/models/src/openai-provider.ts`, `packages/core/src/runner/agent-runner.ts`, `packages/background/src/queues/bullmq.ts`, `sqs.ts`, `rabbitmq.ts`, `kafka.ts`, `packages/knowledge/src/adapters/*.ts`, `loaders/pdf-loader.ts` | Each site must call `tryImport` at the point of first use (lazy), not at module load time. Pattern: `const mod = await tryImport<PgModule>('pg'); if (!mod) throw new ConfusedAIError(...)` |

### Gate

```bash
bun run typecheck && bun run test
grep -r "interface SessionStore" packages/ | wc -l  # must be 1
grep -r "interface MemoryStore" packages/ | wc -l   # must be 1 (graph now has KVStore)
grep -r "interface LLMProvider" packages/ | wc -l   # must be 1
grep -r "interface ToolRegistry" packages/ | wc -l  # must be 1
grep -rn "= require(" packages/ | grep -v ".test." | wc -l  # must be 0
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 1 of the remediation plan. Goal: one definition of each core interface in @confused-ai/contracts; all packages import from there.

TASK 1-1: Create packages/contracts/src/interfaces.ts. Define the following canonical interfaces using the BEST of what already exists across the codebase — read packages/session/src/types.ts, packages/memory/src/types.ts, packages/core/src/runner/types.ts, packages/contracts/src/adapters.ts, and packages/graph/src/types.ts first, then write the authoritative version of each interface:
  - LLMProvider (method: generateText + optional streamText, using Message[] from this file)
  - Message (role: system|user|assistant|tool, content, name?, toolCallId?, metadata?)
  - GenerateOptions (model?, temperature?, maxTokens?, tools?, toolChoice?, signal?: AbortSignal)
  - GenerateResult (text, finishReason, toolCalls?, usage?)
  - Tool (id, name, description, parameters: JsonSchema, execute(args, ctx): Promise<unknown>, needsApproval?)
  - ToolRegistry (register, unregister, get, getByName, list, has, clear)
  - SessionStore (get, create, update, getMessages, appendMessage, delete, listByAgent?, touch?)
  - SessionData (id, agentId, userId?, messages, createdAt: number, updatedAt: number, metadata?)
  - SessionMessage (role, content, name?, tool_call_id?)
  - MemoryStore (store, retrieve, get, update, delete, clear) — semantic/vector-oriented
  - KVStore (get<T>, set<T>, delete, has, keys, clear) — rename from graph's local MemoryStore
  - VectorStore (upsert, search, delete, get?)
  - EmbeddingProvider (embed, embedBatch, getDimension)
Export all from packages/contracts/src/index.ts via: export * from './interfaces.js'

TASK 1-2: In packages/graph/src/types.ts — rename the local MemoryStore interface to KVStore everywhere in that file. Import LLMProvider and Message from '@confused-ai/contracts' instead of redeclaring them. Delete the 7-line bridge comment (the shim is no longer needed).

TASK 1-3: In packages/core/src/agent.ts — delete the local SessionStore interface (lines ~36-43). Add: import type { SessionStore } from '@confused-ai/contracts'. Fix any type errors.

TASK 1-4: In packages/core/src/runner/types.ts — delete local LLMProvider and ToolRegistry interfaces. Import them from '@confused-ai/contracts'. Keep ITextGenerator, IStreamingProvider, IToolCallProvider, IEmbeddingProvider as local ISP sub-interfaces — they extend the canonical base.

TASK 1-5: In packages/agentic/src/_tool-types.ts — delete local ToolRegistry. Import from '@confused-ai/contracts'.

TASK 1-6: Create packages/shared/src/try-import.ts:
```typescript
/**
 * Dynamically import an optional peer dependency.
 * Returns null (never throws) when the specifier is not installed.
 */
export async function tryImport<T>(specifier: string): Promise<T | null> {
  try {
    const mod = await import(specifier) as { default?: T } & T;
    // Handle both ESM default exports and CommonJS module.exports
    return (mod.default ?? mod) as T;
  } catch {
    return null;
  }
}
```
Export it from packages/shared/src/index.ts.

TASK 1-7: Replace all require() call sites with tryImport. For each file listed:
  packages/session/src/redis-store.ts — replace require('ioredis') with await tryImport
  packages/session/src/sqlite.ts — replace require('better-sqlite3')
  packages/models/src/openai-provider.ts — replace require('openai')
  packages/observe/src/logger.ts — replace require('@opentelemetry/api')
  packages/core/src/runner/agent-runner.ts — replace tryRequire helper with tryImport
  packages/knowledge/src/adapters/chroma-adapter.ts — replace @ts-ignore + require
  packages/knowledge/src/adapters/pgvector-adapter.ts — same
  packages/knowledge/src/adapters/neo4j-adapter.ts — same
  packages/knowledge/src/loaders/pdf-loader.ts — same
  packages/background/src/queues/bullmq.ts — replace @ts-ignore + implicit require
  packages/background/src/queues/sqs.ts — same
  packages/background/src/queues/rabbitmq.ts — same
  packages/background/src/queues/kafka.ts — same
  packages/config/src/secret-manager.ts — replace all require() calls

After all tasks: run "bun run typecheck && bun run test". Fix any type errors introduced. Report results.
```

---

## Phase 2 — UUID ID Factory + Branded IDs (1–2 days)

**Goal**: replace all 34 `Date.now() + Math.random()` ID sites with a single `newId()` factory backed by `crypto.randomUUID()`. Add branded TypeScript types so IDs are not accidentally swapped.

### Tasks

| # | File | Action | Edge Cases |
|---|---|---|---|
| 2-1 | `packages/contracts/src/ids.ts` (new) | Define `Brand<T,B>`, `AgentId`, `SessionId`, `RunId`, `MemoryId`, `ArtifactId`, `ToolCallId`, `TraceId`, `TaskId`, `WorkflowId`, `ExecutionId`, `ScheduleId`. Implement `newId(prefix?: string): string` using `crypto.randomUUID()`. Export `asAgentId(s: string): AgentId`, etc. for cast-free assignment in tests. | `crypto` is a Node.js built-in available in Node 18+, Bun, and Deno. No polyfill needed. |
| 2-2 | `packages/contracts/src/index.ts` | Add `export * from './ids.js'` | No collisions expected |
| 2-3 | Codemod: all 34 sites | Replace every `\`${prefix}-${Date.now()}-${Math.random().toString(36)...}\`` with `newId('prefix')`. Files: `packages/background/src/util.ts`, `packages/artifacts/src/artifact.ts`, `packages/session/src/db-store.ts`, `packages/adapter-redis/src/session-store.ts`, `packages/execution/src/engine.ts`, `packages/production/src/resumable-stream.ts`, `packages/sdk/src/orchestrator-adapter.ts`, `packages/scheduler/src/manager.ts`, `packages/graph/src/types.ts`, `packages/memory/src/vector-store.ts`, `packages/memory/src/in-memory-store.ts`, `packages/memory/src/db-store.ts`, `packages/core/src/runner/agent-runner.ts` (jitter is OK, ID generation is not), `packages/core/src/agent.ts`, `packages/learning/src/*`, `packages/planner/src/classical-planner.ts`, `packages/planner/src/llm-planner.ts`, `packages/orchestration/src/multi-agent/swarm.ts`, `packages/tools/src/core/base-tool.ts`, `packages/orchestration/src/a2a/server.ts`, `packages/orchestration/src/a2a/http-client.ts`, `packages/orchestration/src/core/agent-adapter.ts`, `packages/core/src/types.ts` | Do NOT replace `Math.random()` uses in `packages/guard/src/retry.ts` (jitter is intentional, not ID generation) |
| 2-4 | `packages/orchestration/src/multi-agent/swarm.ts` line 620 | Replace `String.prototype.substr` (deprecated) with `substring` AND replace the ID | `substr` and `substring` differ on negative arguments — verify the argument is always positive here |
| 2-5 | `packages/contracts/src/types.ts` | Replace `EntityId = string` and `generateEntityId()` with branded `AgentId` and `newId()` | Update all callers of `generateEntityId()` |

### Gate

```bash
bun run typecheck && bun run test
grep -rn "Math\.random()" packages/ | grep -v "retry\|jitter\|\.test\." | wc -l  # must be 0
grep -rn "Date\.now()" packages/ | grep -v "\.test\.\|bench\.\|timestamp\|created_at\|updated_at\|ttl\|expires\|now()" | wc -l  # should be near 0
grep -rn "\.substr(" packages/ | wc -l  # must be 0
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 2: UUID ID factory and branded IDs.

TASK 2-1: Create packages/contracts/src/ids.ts with the following content:
```typescript
/** Branded ID type. Prevents accidentally passing an AgentId where a SessionId is expected. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type AgentId     = Brand<string, 'AgentId'>;
export type SessionId   = Brand<string, 'SessionId'>;
export type RunId       = Brand<string, 'RunId'>;
export type MemoryId    = Brand<string, 'MemoryId'>;
export type ArtifactId  = Brand<string, 'ArtifactId'>;
export type ToolCallId  = Brand<string, 'ToolCallId'>;
export type TraceId     = Brand<string, 'TraceId'>;
export type TaskId      = Brand<string, 'TaskId'>;
export type WorkflowId  = Brand<string, 'WorkflowId'>;
export type ExecutionId = Brand<string, 'ExecutionId'>;
export type ScheduleId  = Brand<string, 'ScheduleId'>;

/**
 * Generate a globally unique ID. Uses crypto.randomUUID() — no Date.now(), no Math.random().
 * Prefix is for human readability only (e.g. "sess", "run", "mem").
 */
export function newId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

// Unsafe casts for tests and migration — do not use in production code paths.
export const asAgentId     = (s: string): AgentId     => s as AgentId;
export const asSessionId   = (s: string): SessionId   => s as SessionId;
export const asRunId       = (s: string): RunId       => s as RunId;
export const asMemoryId    = (s: string): MemoryId    => s as MemoryId;
export const asArtifactId  = (s: string): ArtifactId  => s as ArtifactId;
export const asToolCallId  = (s: string): ToolCallId  => s as ToolCallId;
```
Add `export * from './ids.js'` to packages/contracts/src/index.ts.

TASK 2-2: Search for every occurrence of the pattern `Date.now()` combined with `Math.random().toString(36)` across all files under packages/. For each match, replace the entire ID-generation expression with `newId('PREFIX')` where PREFIX is the logical name of what is being identified (e.g. 'sess', 'run', 'mem', 'art', 'tool', 'exec', 'sched', 'task', 'worker'). Import newId from '@confused-ai/contracts' at the top of each file.

CRITICAL: Do NOT touch Math.random() in packages/guard/src/retry.ts — that is intentional jitter, not ID generation.

TASK 2-3: In packages/orchestration/src/multi-agent/swarm.ts, replace String.prototype.substr with substring (same line as the ID). The arguments are all non-negative so behaviour is identical.

TASK 2-4: In packages/core/src/types.ts, find generateEntityId() and replace the implementation with `return newId()`. Update EntityId type to be `string` (keep it as alias for now — full branding in a later pass to avoid big migration).

After all tasks: run "bun run typecheck && bun run test". Fix any errors. Report results.
```

---

## Phase 3 — Fix Production Bugs (2–3 days)

**Goal**: fix the five verified P0 production safety bugs that can cause connection leaks, memory corruption, silent failures, or security bypass in deployed code.

### Tasks

| # | File | Action | Edge Cases |
|---|---|---|---|
| 3-1 | `packages/db/src/postgres.ts:183` | Replace `this._pool = null` with `await this._pool?.end(); this._pool = null`. Add a `close()` lifecycle test that creates a pool, calls `close()`, and asserts no open handles. | If `pool.end()` throws (e.g. already closed), catch and log — do not rethrow. |
| 3-2 | `packages/graph/src/engine.ts:512` | Wrap `setTimeout` in a variable, call `clearTimeout` after the race resolves either way. Pass `AbortSignal` through to `def.execute(ctx)` via `ctx.signal`. | Pattern: `const timer = setTimeout(...); try { result = await Promise.race([task, timeoutPromise]); } finally { clearTimeout(timer); }` |
| 3-3 | `packages/orchestration/src/multi-agent/swarm.ts` | Same fix as 3-2 for any `Promise.race` + `setTimeout` patterns in subtask dispatch. | Verify the swarm stage concurrency — add a hard cap of `Math.min(concurrency ?? 8, 32)` |
| 3-4 | `packages/agentic/src/runner.ts:560` | Add `toolConcurrency?: number` to `AgenticRunnerConfig`. Default to `8`. Replace `Promise.all(toolCalls.map(...))` with a bounded concurrency dispatcher: run at most `toolConcurrency` tools simultaneously, maintaining original result order. | Use a semaphore from `@confused-ai/guard` if one exists, else implement a simple `Promise`-based slot pool. Results must be in original call order. |
| 3-5 | `packages/serve/src/auth.ts` | Add `JwtVerifier` interface: `verify(token: string): Promise<JwtPayload>`. Add `HS256Verifier` (wraps existing `verifyJwt`, adds `nbf`, `iat` floor, clock skew tolerance option). Add stub `JwksVerifier` class with `fetch` from a JWKS URI (RS256). Keep existing `verifyJwt` as internal helper. Export `JwtVerifier`, `HS256Verifier`, `JwksVerifier`, and the `createJwtMiddleware(verifier: JwtVerifier)` factory. | Clock skew tolerance default: 60 seconds. `JwksVerifier` must cache keys with TTL. Add unit tests for expired, not-yet-valid, and wrong-algorithm tokens. |
| 3-6 | `packages/memory/src/vector-store.ts` | Fix `get(id)` to query the underlying vector store if not in cache. If the `VectorStoreAdapter` has no `get(id)` method, store a metadata index in-memory keyed by ID that survives the lifetime of the store instance and is populated on `upsert`. Document the durability limitation clearly. | This is a partial fix — full fix requires AgentDb persistence (Phase 6). Add a `// TODO(phase-6): persist to AgentDb` comment. |

### Gate

```bash
bun run typecheck && bun run test
# Specific: test that postgres close does not throw and cleans up
bun test packages/db
# Specific: test tool concurrency cap
bun test packages/agentic
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 3: fix the five verified production bugs.

TASK 3-1 (Postgres pool leak): Open packages/db/src/postgres.ts. Find the close() method. Replace:
  this._pool = null;
with:
  if (this._pool) {
    try { await this._pool.end(); } catch { /* already closed */ }
    this._pool = null;
  }
Also set this._ready = false and this._initPromise = null after the pool end.
Add a test in packages/db/src/ that instantiates PostgresAgentDb, calls close(), and asserts the method resolves without throwing.

TASK 3-2 (Graph timer leak): Open packages/graph/src/engine.ts. Find _executeTaskNode. Replace the Promise.race block with:
```typescript
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(new Error(`Node "${def.name}" timed out after ${timeoutMs}ms`)), timeoutMs);
try {
  return await def.execute({ ...ctx, signal: ac.signal });
} finally {
  clearTimeout(timer);
}
```
Ensure NodeContext type in packages/graph/src/types.ts has `signal?: AbortSignal`.

TASK 3-3 (Swarm timer leak): Open packages/orchestration/src/multi-agent/swarm.ts. Apply the same clearTimeout pattern to any Promise.race + setTimeout in subtask execution. Add a concurrency cap: find the stage fan-out and wrap it with at most Math.min(this.config.concurrency ?? 8, 32) parallel subtasks.

TASK 3-4 (Unbounded tool fan-out): Open packages/agentic/src/runner.ts.
1. Add toolConcurrency?: number to AgenticRunnerConfig (default 8).
2. Replace the _executeAllTools method:
```typescript
private async _executeAllTools(toolCalls: LLMToolCall[], ctx: RunContext): Promise<Message[]> {
  const concurrency = this.config.toolConcurrency ?? 8;
  const results: Message[] = new Array(toolCalls.length);
  const queue = toolCalls.map((tc, i) => ({ tc, i }));
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      results[item.i] = await this._executeOneTool(item.tc, ctx);
    }
  });
  await Promise.all(workers);
  return results;
}
```

TASK 3-5 (JWT verifier interface): Open packages/serve/src/auth.ts.
Add at the top:
```typescript
export interface JwtVerifier {
  verify(token: string): Promise<JwtPayload>;
}
```
Wrap the existing verifyJwt into a class:
```typescript
export class HS256Verifier implements JwtVerifier {
  constructor(private readonly secret: string, private readonly clockToleranceSecs = 60) {}
  async verify(token: string): Promise<JwtPayload> {
    const payload = verifyJwt(token, this.secret);
    const now = Date.now() / 1000;
    if (payload.nbf && now < payload.nbf - this.clockToleranceSecs)
      throw new ConfusedAIError({ code: ERROR_CODES.UNAUTHORIZED, message: 'JWT not yet valid' });
    return payload;
  }
}
```
Add a JwksVerifier stub class that fetches RS256 public keys from a JWKS URI. For now it can throw "JwksVerifier not yet implemented" — the interface contract is what matters.
Export a createJwtMiddleware(verifier: JwtVerifier) factory that replaces the existing jwtAuth(secret) function internally.

TASK 3-6 (Vector memory get): Open packages/memory/src/vector-store.ts. Find the get(id) method. Replace the cache-only lookup with: check cache first, then if not found call this.vectorStore.get(id) if that method exists on the adapter. If the adapter has no get(), log a warning and return null with a comment: // TODO(phase-6): persist metadata to AgentDb for durable get().

After all tasks: run "bun run typecheck && bun run test". Fix any errors. Report results.
```

---

## Phase 4 — Lint Gates to Zero (3–5 days)

**Goal**: make `bun run lint:packages` pass at `--max-warnings 0`. 956 errors are predominantly mechanical. This phase clears them and makes lint a real release gate.

### Tasks

| # | Category | Action | Edge Cases |
|---|---|---|---|
| 4-1 | `@typescript-eslint/no-explicit-any` in public APIs | Replace every `any` in a public method signature with the correct type or `unknown`. Use `Record<string, unknown>` for generic metadata. | Prefer `unknown` over `never`. Add type guards at parse boundaries. |
| 4-2 | `@typescript-eslint/no-unsafe-assignment` | Fix assignments from `unknown` sources: add type guards or narrow with `as Type` at verified parse points only. | JSON.parse returns `unknown` — annotate parse results explicitly. |
| 4-3 | `@typescript-eslint/restrict-template-expressions` | Wrap non-string values in template literals with `String(x)` or proper typing. | `error.message` on an `unknown` catch — use `error instanceof Error ? error.message : String(error)` pattern. |
| 4-4 | `@typescript-eslint/no-unsafe-member-access` | Fix unsafe access on `unknown` or `any` typed values. | Common in catch blocks: `catch (e: unknown)` then `(e as Error).message`. |
| 4-5 | `@typescript-eslint/no-extraneous-class` | Convert static-only classes in `packages/tools/src/utils/shell.ts` and other locations to plain exported functions. | Export names must remain the same to avoid breaking callers. |
| 4-6 | `@typescript-eslint/require-await` | Remove `async` from functions that never `await`. | If the function is part of an interface that requires async, keep `async` and add `return Promise.resolve(x)`. |
| 4-7 | `@typescript-eslint/no-misused-spread` in `packages/tools/src/utils/http.ts:152` | Fix the array spread in object position. | Likely `{ ...arrayVar }` should be `arrayVar` or a loop. |
| 4-8 | `@typescript-eslint/no-confusing-void-expression` in `packages/tools/src/utils/http.ts:159` | Wrap in braces: `=> { expr; }` | |
| 4-9 | `@typescript-eslint/no-unsafe-assignment` in `packages/workflow/src/branching.ts:186` | Fix `any[]` assignment to `AgentRunResult[]`. Add explicit type parameter. | |
| 4-10 | `eslint.config.js` | Remove `|| true` added in Phase 0 from `prepack`. Lint is now a hard gate. | Run full CI validation before removing. |

### Gate

```bash
bun run lint:packages  # must exit 0 with 0 errors 0 warnings
bun run lint           # must exit 0
bun run typecheck && bun run test
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 4: fix all 982 lint errors in packages/ so "bun run lint:packages" exits 0.

Run this first to see the full error list:
  bun run lint:packages 2>&1 | head -200

Work through the errors file by file. For each file:
1. @typescript-eslint/no-explicit-any in public signatures → use unknown or the correct type
2. @typescript-eslint/no-unsafe-* → add type guards; never use @ts-ignore
3. catch (e) blocks → annotate as catch (e: unknown), use: const msg = e instanceof Error ? e.message : String(e)
4. Template literal expressions → wrap with String() if the type is not already string
5. Static-only classes → convert to plain exported const functions with the same names
6. async functions without await → remove async keyword; if the function is part of an async interface, keep async and add return Promise.resolve(value)
7. packages/tools/src/utils/http.ts line 152: fix array spread in object — change to the correct non-spread form
8. packages/tools/src/utils/http.ts line 159: wrap arrow function body in braces
9. packages/workflow/src/branching.ts line 186: fix the unsafe any[] assignment

After fixing all errors:
1. Run "bun run lint:packages" — must show 0 problems
2. Run "bun run lint" — must show 0 problems
3. Run "bun run typecheck && bun run test" — must exit 0
4. Open package.json, find prepack, remove the " || true" appended in Phase 0

Report the final error counts.
```

---

## Phase 5 — Conformance Suites (3–4 days)

**Goal**: publish a conformance suite in `@confused-ai/test-utils` for every extension point. Zero packages currently ship one. This is what makes "easy to extend" a verified, enforceable claim.

### Tasks

| # | Conformance Helper | Tests it must include | Notes |
|---|---|---|---|
| 5-1 | `runSessionStoreConformance(store)` | create, get, update, appendMessage, getMessages, delete, missing-key returns undefined, messages round-trip | Must be provider-agnostic — only uses the `SessionStore` interface from contracts |
| 5-2 | `runMemoryStoreConformance(store)` | store, retrieve by semantic query, get by id, update, delete, expiry, filter by type, filter by tag | Pass a mock `EmbeddingProvider` that returns deterministic vectors |
| 5-3 | `runVectorStoreConformance(store)` | upsert, search returns top-k sorted by score, delete removes from search, filter works | Use fixed 3-dim vectors for test stability |
| 5-4 | `runProviderConformance(provider)` | generateText basic, tool call round-trip, streaming delta events, abort signal respected, usage populated, finish reason values | Use the mock provider from test-utils as reference |
| 5-5 | `runToolConformance(tool)` | execute succeeds, bad input rejected by schema, timeout respected, needsApproval hook called, ToolResult shape correct | |
| 5-6 | `runQueueConformance(queue)` | enqueue, dequeue in order, retry on failure, dead-letter after max retries, delay respected, cancel before processing | |
| 5-7 | `runKVStoreConformance(store)` | get/set/has/delete/keys/clear round-trips, TTL expiry, missing key returns undefined | For graph KVStore (renamed from MemoryStore) |
| 5-8 | Wire conformance to all built-in adapters in CI | Add `it.concurrent('session sqlite conformance', () => runSessionStoreConformance(new SqliteSessionStore(...)))` etc. in each package's test file | Use temp file paths for SQLite; skip Redis tests when REDIS_URL not set |
| 5-9 | Document extension recipe | Add `packages/test-utils/README.md` with "How to build a custom adapter" — 30-line custom SQLite session store example using the conformance helper | Must compile and pass conformance |

### Gate

```bash
bun run test
# All conformance suites must pass for built-in adapters
bun test packages/test-utils
bun test packages/session
bun test packages/memory
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 5: add conformance suites to @confused-ai/test-utils.

TASK 5-1: Open packages/test-utils/src/. Create conformance.ts with the following exports:

runSessionStoreConformance(factory: () => SessionStore): suite of vitest tests that:
- Creates a session, reads it back, verifies message round-trip
- Appends a message, verifies it appears in getMessages
- Deletes a session, verifies get returns undefined
- Handles a missing session ID gracefully (returns undefined, does not throw)

runMemoryStoreConformance(factory: () => MemoryStore, embedder: EmbeddingProvider): suite that:
- Stores a SHORT_TERM entry, retrieves it by semantic query (mock embedder returns same vector)
- Stores a LONG_TERM entry with tags, filters by tag
- Gets by ID, updates content, verifies update
- Deletes by ID, verifies gone

runVectorStoreConformance(factory: () => VectorStore): suite that:
- Upserts 5 vectors, searches for nearest to a query vector, verifies top-k ordering by score
- Deletes one, re-searches, verifies it is absent
- Filter: upsert with metadata { type: 'a' } and { type: 'b' }, search with filter { type: 'a' }, verify only type-a returned

runProviderConformance(provider: LLMProvider): suite that:
- Calls generateText, verifies text is non-empty string
- Calls with a tool definition, verifies toolCalls in result
- Calls with an already-aborted AbortSignal, verifies it rejects or returns early
- Verifies usage object has promptTokens and completionTokens as numbers

runToolConformance(tool: Tool): suite that:
- Calls execute with valid input, verifies success result
- Calls execute with invalid input (missing required field), verifies schema error
- Verifies tool.name and tool.description are non-empty strings

runKVStoreConformance(factory: () => KVStore): suite that:
- Set/get round-trip for string, number, object
- Has returns true for existing key, false for missing
- Delete removes key, subsequent get returns undefined
- Keys() returns all keys with a prefix
- Clear() removes all entries

Export all from packages/test-utils/src/index.ts.

TASK 5-2: Wire conformance into existing adapter packages:
- packages/session/src/in-memory.test.ts (create if missing): add runSessionStoreConformance(() => new InMemorySessionStore())
- packages/session/src/sqlite.test.ts: add runSessionStoreConformance(() => createSqliteStore(':memory:'))
- packages/memory/src/in-memory-store.test.ts: add runMemoryStoreConformance with mock embedder
- packages/memory/src/vector-store.test.ts: add runVectorStoreConformance

TASK 5-3: Create packages/test-utils/README.md explaining the 4-step recipe for building a custom adapter with the conformance test as the acceptance criteria. Include a 30-line UpstashSessionStore example.

After all tasks: run "bun run test". All conformance suites must pass. Report results.
```

---

## Phase 6 — Skills First-Class + DX Polish (3–5 days)

**Goal**: add the `Skill` concept (the missing 4th quadrant between Session/Memory/Knowledge), expose `agent.resume(runId)`, and add `memory.*` / `session.*` namespace factories to the root import. These three changes deliver the "easy to use from day one" promise.

### Tasks

| # | File | Action | Edge Cases |
|---|---|---|---|
| 6-1 | `packages/contracts/src/skills.ts` (new) | Define `Skill`, `SkillContext`, `SkillRef`, `KnowledgeRef` interfaces | `autoActivate` must handle async without blocking the run start |
| 6-2 | `packages/contracts/src/index.ts` | Add `export * from './skills.js'` | |
| 6-3 | `src/create-agent/factory.ts` | Add `skills?: Skill[]` to `CreateAgentOptions`. In `createAgent`, merge skill instructions into system prompt, add skill tools to tool registry, register skill memory namespaces. | Skill instructions are prepended, not appended — agents see most specific context last |
| 6-4 | `packages/agentic/src/runner.ts` | Add `skills?: Skill[]` to `AgenticRunnerConfig`. Apply skill autoActivate check before each run. | Skills with `autoActivate` must not block the critical path — time-box to 100ms |
| 6-5 | `packages/agentic/src/types.ts` | Add `resume(runId: string): Promise<AgenticRunResult>` and `streamResume(runId: string): AsyncIterable<AgentEvent>` to `AgenticRunResult` (or to a new `AgenticAgent` interface) | `resume` returns same shape as `run()`. If no checkpoint exists, replay from session messages. |
| 6-6 | `src/create-agent/factory.ts` | Add `resume(runId: string)` to `CreateAgentResult`. Wire through to agentic runner's checkpoint restore. | Must return `{ sessionId, runId, text, ... }` — same type as `run()` result |
| 6-7 | `src/index.ts` | Add `memory` namespace export: `memory.inMemory()`, `memory.sqlite(path)`, `memory.postgres(url)`, `memory.redis(url)`. Add `session` namespace: `session.inMemory()`, `session.sqlite(path)`, `session.postgres(url)`, `session.redis(url)`. | Each factory returns the canonical interface type, not the concrete class. Use `tryImport` internally for optional backends. |
| 6-8 | `examples/quickstart/` (new folder) | Add 5 quickstart examples: `01-hello.ts`, `02-tool.ts`, `03-memory.ts`, `04-session.ts`, `05-resume.ts`. Each must run with `bun` and a single env var. | These are the "5-minute onboarding" test from the audit. |
| 6-9 | `packages/skills/` (new package, optional) | Scaffold `@confused-ai/skills` with 3 reference skills: `webResearch`, `pdfSummarizer`, `codeReviewer`. Each uses `tool()`, has instructions, and passes `runSkillConformance`. | Mark package as `"private": false` only after Phase 7 lint gate is green |

### Gate

```bash
bun run typecheck && bun run test
bun examples/quickstart/01-hello.ts      # needs OPENAI_API_KEY
bun examples/quickstart/05-resume.ts     # must resume a killed run
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 6: add Skills, agent.resume(), and memory/session namespace factories.

TASK 6-1: Create packages/contracts/src/skills.ts:
```typescript
import type { Tool } from './interfaces.js';

export interface KnowledgeRef {
  readonly engineId: string;
  readonly namespace?: string;
  readonly topK?: number;
}

export interface SkillContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly input: string;
}

export interface Skill {
  readonly id: string;
  readonly version: `${number}.${number}.${number}`;
  readonly name: string;
  readonly description: string;
  readonly instructions?: string;
  readonly tools?: readonly Tool[];
  readonly examples?: readonly { readonly input: string; readonly output: string }[];
  readonly knowledge?: KnowledgeRef;
  readonly memoryNamespace?: string;
  readonly autoActivate?: (input: string, ctx: SkillContext) => boolean | Promise<boolean>;
}
```
Add export to packages/contracts/src/index.ts.

TASK 6-2: In src/create-agent/factory.ts (or the CreateAgentOptions type file):
- Add skills?: readonly Skill[] to CreateAgentOptions
- In createAgent(), after resolving tools, merge skills:
  - Concatenate all skill.instructions into the system prompt (prepend each with "\n\n## Skill: {name}\n{instructions}")
  - Add all skill.tools to the tool registry
  - (Note for later) register skill.memoryNamespace in the memory store if provided

TASK 6-3: Add resume(runId: string): Promise<AgenticRunResult> to the CreateAgentResult interface in src/create-agent/types.ts. Implement it in the factory: look up checkpoint via agentDb.getCheckpoint(runId), call AgenticRunner.run() with the checkpoint state restored. If no checkpoint, replay from session messages.

TASK 6-4: In src/index.ts add these namespace factory exports:
```typescript
import { InMemoryStore } from '@confused-ai/memory';
import { InMemorySessionStore } from '@confused-ai/session';

export const memory = {
  inMemory: () => new InMemoryStore(),
  sqlite: (path: string) => { /* dynamic import of DbMemoryStore with sqlite */ },
  postgres: (url: string) => { /* dynamic import of DbMemoryStore with postgres */ },
  redis: (url: string) => { /* dynamic import from @confused-ai/adapter-redis */ },
} as const;

export const session = {
  inMemory: () => new InMemorySessionStore(),
  sqlite: (path: string) => { /* dynamic import of createSqliteStore */ },
  postgres: (url: string) => { /* dynamic import of DbSessionStore with postgres */ },
  redis: (url: string) => { /* dynamic import of createRedisStore */ },
} as const;
```
Return types must be the canonical interface, not the concrete class.

TASK 6-5: Create examples/quickstart/ with 5 files:
- 01-hello.ts: agent('You are helpful.').run('What is 2+2?') — print result
- 02-tool.ts: define a tool() with z.object, attach to agent, run a prompt that invokes it
- 03-memory.ts: attach memory.sqlite('./mem.db'), run twice with same sessionId, show second run remembers first
- 04-session.ts: attach session.sqlite('./sess.db'), show conversation continues across two run() calls with same sessionId
- 05-resume.ts: start a run, simulate interrupt with process.exit in a tool, restart, call agent.resume(runId)

After all tasks: run "bun run typecheck && bun run test". Report results.
```

---

## Phase 7 — Folder Restructure + Boundary Enforcement (1 week)

**Goal**: move packages into domain-grouped folders without renaming any npm package. Enforce import boundaries with ESLint. The public API stays stable; the repo becomes navigable.

### Tasks

| # | Action | Edge Cases |
|---|---|---|
| 7-1 | Update `package.json` workspaces to `["packages/*", "packages/*/*"]` and mirror in `pnpm-workspace.yaml` | Run `bun install` after to verify resolution |
| 7-2 | Update `turbo.json` to not assume flat packages/ — use `"filter": "./packages/**"` | Verify `bun run build:packages` still works |
| 7-3 | Move low-risk packages: `contracts` → `packages/foundation/contracts`, `shared` → `packages/foundation/shared`, `guard` → `packages/platform/guard`, `observe` → `packages/platform/observe`, `serve` → `packages/platform/serve`, `test-utils` → `packages/developer/test-utils` | Each move: `git mv`, then `bun run typecheck` before the next |
| 7-4 | Move state packages: `db`, `session`, `memory`, `knowledge`, `storage`, `artifacts` → `packages/state/*` | Same git-mv + typecheck cycle |
| 7-5 | Move runtime packages: `core`, `agentic`, `graph`, `workflow`, `orchestration`, `execution`, `scheduler`, `background` → `packages/runtime/*` | |
| 7-6 | Move provider packages: `models`, `router` → `packages/providers/*` | |
| 7-7 | Move tool packages: `tools`, `adapter-redis`, `plugins` → `packages/tools/*` | |
| 7-8 | Move platform packages: `guardrails`, `production`, `config` → `packages/platform/*` | |
| 7-9 | Move developer packages: `sdk`, `cli`, `playground`, `eval` → `packages/developer/*` | |
| 7-10 | Move extension packages: `voice`, `video` → `packages/extensions/*` | |
| 7-11 | Update `eslint-plugin-boundaries` to enforce domain rules | |
| 7-12 | Add CI check: `src/**` must not contain implementation files beyond approved facades | |

### Gate

```bash
bun run typecheck && bun run test && bun run lint && bun run lint:packages
bun run build:packages
# Verify no package name changed
cat packages/foundation/contracts/package.json | jq .name  # must be @confused-ai/contracts
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 7: folder restructure without renaming npm packages.

STEP 1: Update package.json workspaces array to: ["packages/*", "packages/*/*"]
Update pnpm-workspace.yaml packages list to include both "packages/*" and "packages/*/*"
Update turbo.json: change any filter that says "./packages/*" to "./packages/**"

STEP 2: Run "bun install" and "bun run typecheck" to confirm the baseline still passes before any moves.

STEP 3: Move packages in this exact order, running "bun run typecheck && bun run test" after each group:

Group A (foundation):
  git mv packages/contracts packages/foundation/contracts
  git mv packages/shared packages/foundation/shared

Group B (platform):
  git mv packages/guard packages/platform/guard
  git mv packages/observe packages/platform/observe
  git mv packages/serve packages/platform/serve
  git mv packages/guardrails packages/platform/guardrails
  git mv packages/production packages/platform/production
  git mv packages/config packages/platform/config

Group C (state):
  git mv packages/db packages/state/db
  git mv packages/session packages/state/session
  git mv packages/memory packages/state/memory
  git mv packages/knowledge packages/state/knowledge
  git mv packages/storage packages/state/storage
  git mv packages/artifacts packages/state/artifacts

Group D (runtime):
  git mv packages/core packages/runtime/core
  git mv packages/agentic packages/runtime/agentic
  git mv packages/graph packages/runtime/graph
  git mv packages/workflow packages/runtime/workflow
  git mv packages/orchestration packages/runtime/orchestration
  git mv packages/execution packages/runtime/execution
  git mv packages/scheduler packages/runtime/scheduler
  git mv packages/background packages/runtime/background

Group E (providers):
  git mv packages/models packages/providers/models
  git mv packages/router packages/providers/router

Group F (tools):
  git mv packages/tools packages/tools/tools
  git mv packages/adapter-redis packages/tools/adapter-redis
  git mv packages/plugins packages/tools/plugins

Group G (developer):
  git mv packages/sdk packages/developer/sdk
  git mv packages/cli packages/developer/cli
  git mv packages/playground packages/developer/playground
  git mv packages/eval packages/developer/eval
  git mv packages/test-utils packages/developer/test-utils

Group H (extensions):
  git mv packages/voice packages/extensions/voice
  git mv packages/video packages/extensions/video

After ALL moves: run "bun run typecheck && bun run test && bun run lint:packages"
Verify each package.json still has the original @confused-ai/* name.
Report any failures.
```

---

## Phase 8 — Enterprise Hardening (1–2 weeks)

**Goal**: close the security, observability, and reliability gaps that block enterprise adoption.

### Tasks

| # | Area | Action | Edge Cases |
|---|---|---|---|
| 8-1 | HTTP SSRF | `packages/tools/src/utils/http.ts`: add DNS resolution check — resolve hostname to IP before making request, block RFC 1918 / loopback / link-local IPs. Revalidate after each redirect. | DNS resolution requires `dns.promises.lookup`. Must not cache DNS results (TOCTOU risk). Timeout DNS lookup separately. |
| 8-2 | Shell tool consolidation | Merge `packages/tools/src/shell.ts` and `packages/tools/src/utils/shell.ts` into one implementation using `execFile` (not `exec`). Remove static-only class. Export same surface as both. | Must preserve default-deny allow-list behavior. Add an `allowedCommands` option. |
| 8-3 | DB migrations | Add `packages/db/src/migrations/` directory with versioned SQL files. `AgentDb.init()` must run pending migrations in order using a `schema_version` table. | Migration runner must be idempotent. Test: run init twice, verify no duplicate migration errors. |
| 8-4 | Redis conformance | In `packages/tools/adapter-redis/` and `packages/session/src/redis-store.ts`: add `SKIP_REDIS_TESTS=true` env guard. When `REDIS_URL` is set, run against real Redis; otherwise use `fakeredis` or `ioredis-mock`. | Add testcontainer support as optional: if `TESTCONTAINERS=true`, spin up Redis container. |
| 8-5 | Eval concurrency | `packages/eval/src/`: add `concurrency?: number` to eval config (default 4). Replace `Promise.all(batch)` with bounded concurrency matching Phase 3-4's tool dispatcher. | |
| 8-6 | Span taxonomy | `packages/observe/src/`: define a stable `SpanName` enum or const object for all span names (`agent.run`, `llm.generate`, `tool.execute`, `memory.store`, `memory.retrieve`, `session.get`, `graph.node.execute`, etc.). Use everywhere. | This fixes trace correlation when a span name changes — callers use the constant. |
| 8-7 | Secret rotation | `packages/config/src/secret-manager.ts`: add `watch(key, callback)` method that polls (or subscribes via provider SDK) and calls callback when the secret value changes. | Polling interval must be configurable. Default: 5 minutes. Add unit test with a mock provider. |
| 8-8 | Background queue conformance | Run `runQueueConformance` against BullMQ, in-memory, and optionally SQS/Kafka/RabbitMQ. Remove all `@ts-ignore` — replace with the typed adapter shim pattern from Phase 1. | |
| 8-9 | Bundle size gate | Add `scripts/check-bundle-size.mjs` that bundles `{ agent, tool }` from `confused-ai` using `esbuild`, measures gzip size, and fails if over 80 kB. Add to CI. | Playwright, pg, aws-sdk must not appear in the bundle. Use `--bundle --analyze` to detect. |
| 8-10 | Docs freshness gate | Add `scripts/check-docs-claims.mjs` that reads all roadmap claims in docs/ and verifies each has a matching test file or implementation file link. Fail CI if a claim has no evidence. | |

### Gate

```bash
bun run typecheck && bun run test && bun run lint && bun run lint:packages
node scripts/check-bundle-size.mjs   # must pass
# security tests
bun test tests/security/
```

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 8: enterprise hardening.

TASK 8-1 (DNS SSRF): Open packages/tools/src/utils/http.ts (or wherever the HTTP tool lives after Phase 7 restructure).
Find the isPrivateHost function that checks hostname patterns.
REPLACE it with an async version that resolves the hostname to IP addresses using dns.promises.lookup(), then checks each resolved IP against RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.0/8, ::1), and link-local (169.254.0.0/16).
Apply this check: (1) before making the request, (2) after each redirect (check the redirect target URL the same way).
Add a 2-second timeout to DNS resolution via AbortSignal.timeout(2000).

TASK 8-2 (Shell consolidation): Read both packages/tools/src/shell.ts and packages/tools/src/utils/shell.ts. Understand both APIs. Create a single new implementation at packages/tools/src/shell/index.ts that:
- Uses execFile (not exec or spawn with shell:true)
- Has a default-deny allowedCommands list
- Accepts allowedCommands?: string[] option
- Exports createShellTool(options) factory function (not a class)
- Exports the same tool names that both old files exported for backward compat

TASK 8-3 (DB migrations): Create packages/db/src/migrations/ with:
- 001_initial_schema.sql: the CREATE TABLE statements currently in AgentDb.init()
- migration-runner.ts: reads SQL files in order, runs each in a transaction, records in schema_version table
Modify AgentDb.init() to call the migration runner instead of raw DDL.

TASK 8-4 (Eval concurrency): Open packages/eval/src/. Find every Promise.all over a batch of eval items. Add concurrency?: number option (default 4). Use the same bounded-concurrency worker pattern from Phase 3 task 3-4.

TASK 8-5 (Span taxonomy): Create packages/observe/src/spans.ts:
```typescript
export const SpanName = {
  AGENT_RUN:         'agent.run',
  LLM_GENERATE:      'llm.generate',
  TOOL_EXECUTE:      'tool.execute',
  MEMORY_STORE:      'memory.store',
  MEMORY_RETRIEVE:   'memory.retrieve',
  SESSION_GET:       'session.get',
  SESSION_UPDATE:    'session.update',
  GRAPH_NODE:        'graph.node.execute',
  VECTOR_SEARCH:     'vector.search',
  EMBEDDING_GENERATE:'embedding.generate',
} as const;
export type SpanName = typeof SpanName[keyof typeof SpanName];
```
Replace all string literals used as span names across packages/ with SpanName.X constants.

TASK 8-6 (Bundle gate): Create scripts/check-bundle-size.mjs that:
1. Uses esbuild to bundle src/index.ts with target='node18', bundle=true, minify=true, external=['playwright','pg','better-sqlite3','openai','@anthropic-ai/sdk','ioredis']
2. Gzips the output with zlib
3. Fails (process.exit(1)) if the gzip size > 81920 bytes (80 kB)
4. Prints the size regardless

After all tasks: run "bun run typecheck && bun run test". Report results.
```

---

## Phase 9 — World-Class DX + Docs (1 week)

**Goal**: `defineAgent()` typed builder, migration guides, and a tested docs freshness gate. After this phase the framework can claim "5 minutes to first agent" with evidence.

### Tasks

| # | File | Action |
|---|---|---|
| 9-1 | `packages/sdk/src/define-agent.ts` | Implement the full fluent builder: `defineAgent().model('openai:gpt-4o').input(z.object({...})).output(z.object({...})).tools([...]).skills([...]).memory(memory.sqlite('...')).session(session.sqlite('...')).build()`. Builder is type-safe end-to-end: `build()` returns `TypedAgent<TInput, TOutput>` where `run(input: TInput): Promise<TOutput>`. |
| 9-2 | `docs/guide/migration-langchain.md` | Migration guide from LangChain with side-by-side code comparisons |
| 9-3 | `docs/guide/migration-crewai.md` | Migration guide from CrewAI with role/task/process mapping |
| 9-4 | `docs/guide/migration-vercel.md` | Migration guide from Vercel AI SDK |
| 9-5 | `docs/guide/custom-adapter.md` | "Build any adapter in 30 lines" guide for session, memory, vector, provider, queue |
| 9-6 | `scripts/check-docs-claims.mjs` | Fail CI if any roadmap claim in docs/ has no linked test file or source file |
| 9-7 | `packages/cli/src/commands/chat.ts` | `confused-ai chat` REPL — single-turn interactive agent in terminal |
| 9-8 | All examples | Update every file in `examples/` to use the canonical `agent()` / `tool()` / `memory.*` / `session.*` API from Phase 6. No direct `../src/` imports. |

### Agent Prompt

```
You are working in the monorepo at the current working directory (agent-framework).
Perform Phase 9: world-class DX, typed builder, and migration guides.

TASK 9-1: Open packages/sdk/src/. Create or update define-agent.ts to implement a fully typed fluent builder:
```typescript
type Builder<TIn, TOut, TTools extends readonly Tool[]> = {
  model(ref: `${string}:${string}`): Builder<TIn, TOut, TTools>;
  input<T>(schema: ZodType<T>): Builder<T, TOut, TTools>;
  output<T>(schema: ZodType<T>): Builder<TIn, T, TTools>;
  tools<T extends readonly Tool[]>(tools: T): Builder<TIn, TOut, T>;
  skills(skills: readonly Skill[]): Builder<TIn, TOut, TTools>;
  memory(store: MemoryStore): Builder<TIn, TOut, TTools>;
  session(store: SessionStore): Builder<TIn, TOut, TTools>;
  instructions(text: string): Builder<TIn, TOut, TTools>;
  build(): TypedAgent<TIn, TOut>;
};

export interface TypedAgent<TIn, TOut> {
  run(input: TIn, opts?: { sessionId?: string }): Promise<TOut & { sessionId: string; runId: string }>;
  stream(input: TIn, opts?: { sessionId?: string }): AsyncIterable<AgentEvent>;
  resume(runId: string): Promise<TOut & { sessionId: string; runId: string }>;
}

export function defineAgent(): Builder<string, string, readonly []>;
```

TASK 9-2: Update examples/simple-agent.ts (and all other files in examples/) to:
- Import only from 'confused-ai' or 'confused-ai/tool' or 'confused-ai/model' etc. — never from '../src/'
- Use agent() or defineAgent() — never createAgent() or createAgenticAgent()
- Use memory.sqlite() or memory.inMemory() — never new InMemoryStore() directly

TASK 9-3: Create scripts/check-docs-claims.mjs that scans docs/**/*.md for lines matching
"Action:" and checks whether the file reference (packages/X/src/Y.ts) exists on disk.
Exit 1 if any referenced file does not exist.

TASK 9-4: In packages/cli/src/commands/, create chat.ts implementing a readline REPL:
  1. Creates agent() with instructions from --system flag or default
  2. Loops: readline.question('> ') → agent.run(input, { sessionId }) → print result.text
  3. Preserves sessionId across turns (persistent conversation)
  4. Ctrl-C exits cleanly (drain session store)

After all tasks: run "bun run typecheck && bun run test". Report results.
```

---

## Summary Table

| Phase | Name | Duration | Risk | Unlocks |
|---|---|---|---|---|
| 0 | Baseline Freeze | 1–2 days | Very Low | Safe foundation for all phases |
| 1 | Contracts Source of Truth | 3–5 days | Medium | Extensible adapters, no more duplicates |
| 2 | UUID IDs | 1–2 days | Low | Distributed-safe IDs, no test collision |
| 3 | Production Bug Fixes | 2–3 days | Low | Postgres, timer, tool concurrency, JWT |
| 4 | Lint to Zero | 3–5 days | Low | Hard CI gate, type-safe public APIs |
| 5 | Conformance Suites | 3–4 days | Low | Verified "extensible to anything" claim |
| 6 | Skills + Resume + DX | 3–5 days | Medium | 5-minute onboarding, Skills concept |
| 7 | Folder Restructure | 1 week | Medium | Navigable monorepo, boundary enforcement |
| 8 | Enterprise Hardening | 1–2 weeks | Medium | SSRF, migrations, secret rotation, bundle gate |
| 9 | World-Class DX + Docs | 1 week | Low | Typed builder, migration guides, CLI chat |

**Total estimated calendar time: 5–8 weeks** (single engineer, unblocked).
