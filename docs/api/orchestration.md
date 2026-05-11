---
title: Orchestration API
description: Complete reference for createTeam(), createSupervisor(), defineRole(), defineTask(), createRole(), createRunnableAgent(), and CoordinationType.
outline: [2, 3]
---

# Orchestration API

`confused-ai/orchestration` is the multi-agent coordination layer. Use it when a single agent is no longer sufficient — when work needs to be split across specialists, delegated explicitly, routed by capability, or supervised by a coordinator.

```ts
import {
  createTeam,
  createSupervisor,
  defineRole,
  defineTask,
  createRole,
  createRunnableAgent,
  AgentState,
  CoordinationType,
} from 'confused-ai/orchestration';
```

---

## `defineRole()` — define a specialist

A role is an agent with a clear identity: what it knows, what it's for, and how it generates text.

```ts
import { defineRole } from 'confused-ai/orchestration';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const researcher = defineRole({
  role: 'Researcher',
  backstory: 'You gather accurate facts and cite sources.',
  goal: 'Collect the key facts needed to answer the request.',
  llm: {
    async generateText(messages) {
      const res = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: String(m.content),
        })),
      });
      const block = res.content[0];
      return { text: block.type === 'text' ? block.text : '', finishReason: 'stop' as const };
    },
  },
  allowDelegation: false,  // prevent this role from handing off work
  planning: false,
});
```

**`defineRole()` options:**

| Field | Type | Required | Description |
|---|---|---|---|
| `role` | `string` | ✓ | Role name — shown in team outputs |
| `backstory` | `string` | ✓ | Who this role is — shapes its answer style |
| `goal` | `string` | ✓ | What this role is trying to accomplish |
| `llm` | `LlmAdapter` | ✓ | Object with `generateText(messages)` method |
| `allowDelegation` | `boolean` | — | Allow this role to hand off to others (default: false) |
| `planning` | `boolean` | — | Include this role in pre-run planning (default: false) |

---

## `defineTask()` — define a unit of work

A task describes what should be done, what the expected output is, which role handles it, and optionally which previous tasks it depends on.

```ts
import { defineTask } from 'confused-ai/orchestration';

const researchTask = defineTask({
  name: 'Research',
  description: 'Find the key facts about the user request.',
  expectedOutput: 'A short bullet list of verified facts.',
  agent: researcher,
});

const writeTask = defineTask({
  name: 'Write Response',
  description: 'Write the final response using the research findings.',
  expectedOutput: 'A concise, helpful response in plain English.',
  agent: writer,
  context: [researchTask],  // writer sees research output before executing
});
```

**`defineTask()` options:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✓ | Task identifier |
| `description` | `string` | ✓ | What this task should accomplish |
| `expectedOutput` | `string` | ✓ | Describes the expected format and content of the output |
| `agent` | `Role` | ✓ | The role responsible for this task |
| `context` | `Task[]` | — | Tasks whose outputs are passed to this task as additional context |

---

## `createTeam()` — run a team of agents

`createTeam()` coordinates roles and tasks into a runnable workflow.

```ts
import { createTeam } from 'confused-ai/orchestration';

const team = createTeam({
  name: 'SupportTeam',
  agents: [researcher, writer],
  tasks: [researchTask, writeTask],
  mode: 'sequential',   // 'sequential' | 'route' | 'parallel'
  planning: false,
});

const result = await team.run('Explain the difference between the Pro and Enterprise plans.');

console.log(result.output);          // final output (last task result)
console.log(result.taskOutputs);     // { 'Research': '...', 'Write Response': '...' }
```

**`createTeam()` options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Team identifier |
| `agents` | `Role[]` | ✓ | Roles participating in the team |
| `tasks` | `Task[]` | ✓ | Tasks to execute (in sequential mode) |
| `mode` | `'sequential' \| 'route' \| 'parallel'` | `'sequential'` | Execution strategy |
| `planning` | `boolean` | `false` | Generate a shared plan before executing tasks |
| `capabilities` | `string[][]` | — | Per-agent capability tags for `route` mode |

### Route mode

In `route` mode, each request is directed to the single most capable role. Define capability tags per agent:

```ts
const routerTeam = createTeam({
  name: 'RouterTeam',
  mode: 'route',
  agents: [billingAgent, techAgent, generalAgent],
  capabilities: [
    ['billing', 'refunds', 'invoices', 'payment'],
    ['api', 'technical', 'integration', 'sdk'],
    ['general', 'account', 'other'],
  ],
});

const result = await routerTeam.run('I need help with an invoice refund.');
// → routed to billingAgent
```

---

## `createSupervisor()` — explicit delegation

`createSupervisor()` uses a coordinator agent that explicitly decides which worker handles each step.

```ts
import {
  createSupervisor,
  createRole,
  createRunnableAgent,
  AgentState,
  CoordinationType,
} from 'confused-ai/orchestration';

// Create runnable worker agents
const researchWorker = createRunnableAgent({
  name: 'research-worker',
  description: 'Collects market data and statistics.',
  run: async (input) => ({
    result: { findings: `Research for: ${input.prompt}` },
    state: AgentState.COMPLETED,
    metadata: {
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 100,
      iterations: 1,
    },
  }),
});

const analysisWorker = createRunnableAgent({
  name: 'analysis-worker',
  description: 'Interprets data and identifies key trends.',
  run: async (input) => ({
    result: { analysis: `Analysis for: ${input.prompt}` },
    state: AgentState.COMPLETED,
    metadata: {
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 150,
      iterations: 1,
    },
  }),
});

// Create the supervisor
const supervisor = createSupervisor({
  name: 'report-supervisor',
  coordinationType: CoordinationType.PARALLEL,  // run workers concurrently
  subAgents: [
    {
      agent: researchWorker,
      role: createRole('Researcher', ['Collect market facts', 'Find supporting data']),
    },
    {
      agent: analysisWorker,
      role: createRole('Analyst', ['Interpret data', 'Identify key trends']),
    },
  ],
});

const outcome = await supervisor.run(
  { prompt: 'Prepare an EV market summary for Q1 2026.' },
  { agentId: 'report-supervisor', metadata: {} },
);

console.log(outcome.result);
```

---

## `CoordinationType` enum

| Value | Behaviour |
|---|---|
| `CoordinationType.SEQUENTIAL` | Run workers one after another, in order |
| `CoordinationType.PARALLEL` | Run all workers concurrently and merge results |
| `CoordinationType.CONSENSUS` | Run workers and synthesise a consensus answer |

---

## `AgentState` enum

Returned in every worker's run response:

| Value | Meaning |
|---|---|
| `AgentState.COMPLETED` | Worker finished successfully |
| `AgentState.FAILED` | Worker encountered an unrecoverable error |
| `AgentState.DELEGATED` | Worker handed off to another agent |

---

## When to use `createTeam` vs `createSupervisor`

| Scenario | Use |
|---|---|
| Fixed pipeline of specialised roles with task dependencies | `createTeam()` with `mode: 'sequential'` |
| Route each request to the best-suited specialist | `createTeam()` with `mode: 'route'` |
| One coordinator decides how to split work among workers | `createSupervisor()` |
| Workers run in parallel and results are merged | `createSupervisor()` with `CoordinationType.PARALLEL` |

When a linear `compose()` or `pipe()` pipeline is sufficient, prefer that — it is simpler and easier to test.

---

## Where to go next

- [Orchestration guide](../guide/orchestration) — rollout advice and patterns
- [08 · Multi-Agent Team](../examples/08-team) — runnable team example
- [09 · Supervisor Workflow](../examples/09-supervisor) — runnable supervisor example
- [Compose guide](../guide/compose) — simpler sequential pipelines without orchestration
