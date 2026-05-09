# Execution Progress

> Tick each item as completed. Run the Gate command at the bottom of each phase before moving on.
> Cross-reference: [PHASES.md](./PHASES.md) has the agent prompt for each phase.

---

## Phase 0 — Baseline Freeze

- [ ] **0-1** Remove `"./extensions"` from `package.json` exports (or add stub source)
- [ ] **0-2** Confirm no `extensions` entry in `tsup.config.ts`
- [ ] **0-3** Add `bun run lint:packages || true` to `prepack`
- [ ] **0-4** Register `@typescript-eslint` plugin in `eslint.config.js` for `src/**` block
- [ ] **0-5** Create/update `PACKAGES.md` table with domain + experimental flags
- [ ] **0-6** Exclude compatibility facades from vitest coverage

**Gate**: `bun run typecheck && bun run test`

---

## Phase 1 — Contracts as Single Source of Truth

- [ ] **1-1** Create `packages/contracts/src/interfaces.ts` with canonical interfaces
- [ ] **1-2** Export from `packages/contracts/src/index.ts`
- [ ] **1-3** `packages/graph/src/types.ts`: rename `MemoryStore` → `KVStore`, import from contracts
- [ ] **1-4** `packages/core/src/agent.ts`: remove local `SessionStore`, import from contracts
- [ ] **1-5** `packages/core/src/runner/types.ts`: remove local `LLMProvider`/`ToolRegistry`, import from contracts
- [ ] **1-6** `packages/agentic/src/_tool-types.ts`: remove local `ToolRegistry`, import from contracts
- [ ] **1-7** Resolve `SessionStore` across `session/types.ts` and `contracts/adapters.ts` (unify)
- [ ] **1-8** Resolve `contracts/adapters.ts` SessionStore method name drift
- [ ] **1-9** Create `packages/shared/src/try-import.ts` with async `tryImport<T>()`
- [ ] **1-10** Replace all 14 `require()` sites with `tryImport` (session, db, models, observe, core, knowledge, background, config)

**Gate**:
```bash
bun run typecheck && bun run test
grep -r "interface SessionStore" packages/ | wc -l  # → 1
grep -r "interface MemoryStore" packages/ | wc -l   # → 1
grep -r "interface LLMProvider" packages/ | wc -l   # → 1
grep -r "interface ToolRegistry" packages/ | wc -l  # → 1
grep -rn "= require(" packages/ | grep -v ".test." | wc -l  # → 0
```

---

## Phase 2 — UUID ID Factory + Branded IDs

- [ ] **2-1** Create `packages/contracts/src/ids.ts` with `Brand<T,B>`, `newId()`, branded ID types
- [ ] **2-2** Export from `packages/contracts/src/index.ts`
- [ ] **2-3** Replace all 34 `Date.now() + Math.random()` ID sites with `newId(prefix)`
- [ ] **2-4** Fix `String.prototype.substr` → `substring` in `packages/orchestration/src/multi-agent/swarm.ts:620`
- [ ] **2-5** Update `packages/core/src/types.ts`: `generateEntityId()` uses `newId()`

**Gate**:
```bash
bun run typecheck && bun run test
grep -rn "Math\.random()" packages/ | grep -v "retry\|jitter\|\.test\." | wc -l  # → 0
grep -rn "\.substr(" packages/ | wc -l  # → 0
```

---

## Phase 3 — Fix Production Bugs

- [ ] **3-1** `packages/db/src/postgres.ts:183`: `close()` awaits `pool.end()` before nulling
- [ ] **3-2** `packages/graph/src/engine.ts:512`: `clearTimeout` after race, `AbortSignal` in `NodeContext`
- [ ] **3-3** `packages/orchestration/src/multi-agent/swarm.ts`: timer cleanup + stage concurrency cap
- [ ] **3-4** `packages/agentic/src/runner.ts:560`: `toolConcurrency` option + bounded worker pool
- [ ] **3-5** `packages/serve/src/auth.ts`: `JwtVerifier` interface, `HS256Verifier`, `JwksVerifier` stub, `nbf`/clock-skew
- [ ] **3-6** `packages/memory/src/vector-store.ts`: `get(id)` queries adapter if not in cache

**Gate**: `bun run typecheck && bun run test`

---

## Phase 4 — Lint Gates to Zero

- [ ] **4-1** Fix `no-explicit-any` in public API surfaces → use `unknown`
- [ ] **4-2** Fix `no-unsafe-assignment` → add type guards at parse boundaries
- [ ] **4-3** Fix `restrict-template-expressions` → wrap non-strings with `String(x)`
- [ ] **4-4** Fix `no-unsafe-member-access` → annotate catch blocks `(e: unknown)`
- [ ] **4-5** Fix `no-extraneous-class` → convert static-only classes to plain functions
- [ ] **4-6** Fix `require-await` → remove spurious `async` keywords
- [ ] **4-7** Fix `packages/tools/src/utils/http.ts:152` array spread in object
- [ ] **4-8** Fix `packages/tools/src/utils/http.ts:159` confusing void arrow
- [ ] **4-9** Fix `packages/workflow/src/branching.ts:186` unsafe `any[]` assignment
- [ ] **4-10** Remove `|| true` from `prepack` — lint is now a hard gate

**Gate**:
```bash
bun run lint:packages   # → 0 problems
bun run lint            # → 0 problems
bun run typecheck && bun run test
```

---

## Phase 5 — Conformance Suites

- [ ] **5-1** `runSessionStoreConformance(factory)` in `@confused-ai/test-utils`
- [ ] **5-2** `runMemoryStoreConformance(factory, embedder)` in `@confused-ai/test-utils`
- [ ] **5-3** `runVectorStoreConformance(factory)` in `@confused-ai/test-utils`
- [ ] **5-4** `runProviderConformance(provider)` in `@confused-ai/test-utils`
- [ ] **5-5** `runToolConformance(tool)` in `@confused-ai/test-utils`
- [ ] **5-6** `runQueueConformance(queue)` in `@confused-ai/test-utils`
- [ ] **5-7** `runKVStoreConformance(factory)` in `@confused-ai/test-utils`
- [ ] **5-8** Wire conformance into CI for all built-in adapters (session, memory, vector)
- [ ] **5-9** Add `packages/test-utils/README.md` with extension recipe + 30-line example

**Gate**: `bun run test` — all conformance suites green

---

## Phase 6 — Skills + Resume + DX

- [ ] **6-1** Create `packages/contracts/src/skills.ts` with `Skill`, `SkillContext`, `KnowledgeRef`
- [ ] **6-2** Export from contracts
- [ ] **6-3** `createAgent()` accepts `skills?: Skill[]` — merges instructions + tools
- [ ] **6-4** `AgenticRunnerConfig` accepts `skills?: Skill[]` with `autoActivate` guard
- [ ] **6-5** Add `resume(runId)` and `streamResume(runId)` to agentic runner
- [ ] **6-6** Add `resume(runId)` to `CreateAgentResult` (public API)
- [ ] **6-7** Add `memory.*` and `session.*` namespace factories to `src/index.ts`
- [ ] **6-8** Create `examples/quickstart/` with 5 numbered examples (hello → resume)
- [ ] **6-9** Scaffold `packages/skills/` with `webResearch`, `pdfSummarizer`, `codeReviewer`

**Gate**:
```bash
bun run typecheck && bun run test
bun examples/quickstart/01-hello.ts   # needs OPENAI_API_KEY
bun examples/quickstart/05-resume.ts
```

---

## Phase 7 — Folder Restructure + Boundary Enforcement

- [ ] **7-1** Update `package.json` workspaces + `pnpm-workspace.yaml` for nested packages
- [ ] **7-2** Update `turbo.json` for `packages/**`
- [ ] **7-3** Move Group A: `contracts`, `shared` → `packages/foundation/`
- [ ] **7-4** Move Group B: `guard`, `observe`, `serve`, `guardrails`, `production`, `config` → `packages/platform/`
- [ ] **7-5** Move Group C: `db`, `session`, `memory`, `knowledge`, `storage`, `artifacts` → `packages/state/`
- [ ] **7-6** Move Group D: `core`, `agentic`, `graph`, `workflow`, `orchestration`, `execution`, `scheduler`, `background` → `packages/runtime/`
- [ ] **7-7** Move Group E: `models`, `router` → `packages/providers/`
- [ ] **7-8** Move Group F: `tools`, `adapter-redis`, `plugins` → `packages/tools/`
- [ ] **7-9** Move Group G: `sdk`, `cli`, `playground`, `eval`, `test-utils` → `packages/developer/`
- [ ] **7-10** Move Group H: `voice`, `video` → `packages/extensions/`
- [ ] **7-11** Update `eslint-plugin-boundaries` domain rules
- [ ] **7-12** Add CI check: `src/**` may only contain facade files

**Gate**:
```bash
bun run typecheck && bun run test && bun run lint && bun run lint:packages
bun run build:packages
# All package names unchanged:
for d in packages/**; do [ -f "$d/package.json" ] && jq .name "$d/package.json"; done
```

---

## Phase 8 — Enterprise Hardening

- [ ] **8-1** HTTP tool: DNS resolution SSRF check + redirect revalidation
- [ ] **8-2** Shell tool: consolidate into one `execFile`-based factory function
- [ ] **8-3** DB migrations: versioned SQL files + `schema_version` table
- [ ] **8-4** Redis: `ioredis-mock` fallback for CI when `REDIS_URL` not set
- [ ] **8-5** Eval: bounded `concurrency` option (default 4)
- [ ] **8-6** Observe: `SpanName` const object, replace all string literals
- [ ] **8-7** Config: `SecretProvider.watch(key, cb)` with polling
- [ ] **8-8** Background queues: remove all `@ts-ignore`, run `runQueueConformance`
- [ ] **8-9** Bundle size gate: `scripts/check-bundle-size.mjs` < 80 kB gzipped
- [ ] **8-10** Docs freshness gate: `scripts/check-docs-claims.mjs`

**Gate**:
```bash
bun run typecheck && bun run test && bun run lint && bun run lint:packages
node scripts/check-bundle-size.mjs   # must pass
bun test tests/security/
```

---

## Phase 9 — World-Class DX + Docs

- [ ] **9-1** `packages/sdk/src/define-agent.ts`: fully typed fluent builder returning `TypedAgent<TIn, TOut>`
- [ ] **9-2** Update all `examples/` files to use canonical `agent()` / `tool()` / `memory.*` / `session.*` — no `../src/` imports
- [ ] **9-3** `scripts/check-docs-claims.mjs`: fail CI on stale docs references
- [ ] **9-4** `packages/cli/src/commands/chat.ts`: `confused-ai chat` REPL with persistent session
- [ ] **9-5** `docs/guide/migration-langchain.md`
- [ ] **9-6** `docs/guide/migration-crewai.md`
- [ ] **9-7** `docs/guide/migration-vercel.md`
- [ ] **9-8** `docs/guide/custom-adapter.md`

**Gate**:
```bash
bun run typecheck && bun run test && bun run lint && bun run lint:packages
node scripts/check-docs-claims.mjs   # must pass
node scripts/check-bundle-size.mjs   # must pass
```

---

## Overall Status

| Phase | Status | Gate |
|---|---|---|
| 0 — Baseline Freeze | ⬜ Not started | — |
| 1 — Contracts Source of Truth | ⬜ Not started | — |
| 2 — UUID IDs | ⬜ Not started | — |
| 3 — Production Bug Fixes | ⬜ Not started | — |
| 4 — Lint to Zero | ⬜ Not started | — |
| 5 — Conformance Suites | ⬜ Not started | — |
| 6 — Skills + Resume + DX | ⬜ Not started | — |
| 7 — Folder Restructure | ⬜ Not started | — |
| 8 — Enterprise Hardening | ⬜ Not started | — |
| 9 — World-Class DX + Docs | ⬜ Not started | — |

Update status to `🔄 In progress` when a phase starts and `✅ Done` when gate passes.
