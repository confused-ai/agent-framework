---
title: Orchestration
description: Build multi-agent teams, supervisors, swarms, handoffs, consensus protocols, and A2A communication with the orchestration primitives.
outline: [2, 3]
---

# Orchestration

The framework ships a full orchestration layer for coordinating multiple agents. Import from `confused-ai/workflow` or `confused-ai`.

```ts
import {
  Team, SwarmOrchestrator, createSupervisor, createHandoff,
  createAgentRouter, createConsensus, createPipeline,
  compose, pipe,
} from 'confused-ai/workflow';
```

---

## `compose` — sequential pipeline

Chain agents sequentially. Each agent's output becomes the next agent's input.

```ts
import { compose, createAgent } from 'confused-ai';

const researcher = createAgent({ name: 'researcher', instructions: 'Research the topic.', model: 'gpt-4o', apiKey: '...' });
const writer     = createAgent({ name: 'writer',     instructions: 'Write a clear report from the research.', model: 'gpt-4o-mini', apiKey: '...' });
const editor     = createAgent({ name: 'editor',     instructions: 'Edit and polish the report.', model: 'gpt-4o-mini', apiKey: '...' });

const pipeline = compose(researcher, writer, editor);

const result = await pipeline.run('Write a report on the state of quantum computing in 2026.');
console.log(result.text);
```

### `pipe` — functional style

```ts
import { pipe } from 'confused-ai/workflow';

const process = pipe(
  (input: string) => researcher.run(input),
  (r) => writer.run(r.text),
  (r) => editor.run(r.text),
);

const result = await process('Quantum computing 2026');
```

---

## `Team` — role-based coordination

Coordinate a team of specialist agents under a named team identity:

```ts
import { Team, createAgent } from 'confused-ai';

const codeAgent   = createAgent({ name: 'coder',    instructions: 'Write production-quality TypeScript.', model: 'gpt-4o', apiKey: '...' });
const reviewAgent = createAgent({ name: 'reviewer', instructions: 'Review code for bugs and style.', model: 'gpt-4o-mini', apiKey: '...' });
const docsAgent   = createAgent({ name: 'docs',     instructions: 'Write API documentation.', model: 'gpt-4o-mini', apiKey: '...' });

const engineeringTeam = new Team({
  name: 'engineering',
  members: [codeAgent, reviewAgent, docsAgent],
  coordinator: 'round-robin',  // 'round-robin' | 'least-loaded' | 'capability'
});

const result = await engineeringTeam.run('Implement a rate-limiter class with tests and docs.');
console.log(result.text);
```

---

## `createSupervisor` — delegating coordinator

A supervisor agent decides which specialist to delegate each task to:

```ts
import { createSupervisor, createAgent } from 'confused-ai';

const supervisor = createSupervisor({
  name: 'triage',
  instructions: `
    You are a triage coordinator. Route each request to the right specialist:
    - billing questions → billing agent
    - technical issues → tech support agent
    - general questions → general agent
  `,
  llm: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' }),
  agents: {
    billing: createAgent({ name: 'billing', instructions: 'Handle billing and payment questions.', model: 'gpt-4o-mini', apiKey: '...' }),
    tech:    createAgent({ name: 'tech',    instructions: 'Solve technical product issues.', model: 'gpt-4o', apiKey: '...' }),
    general: createAgent({ name: 'general', instructions: 'Answer general questions.', model: 'gpt-4o-mini', apiKey: '...' }),
  },
});

const result = await supervisor.run('My invoice shows the wrong amount.');
// Supervisor routes this to the billing agent automatically
console.log(result.text);
```

---

## `createHandoff` — explicit handoff protocol

Define explicit handoff conditions so agents can transfer control at runtime:

```ts
import { createHandoff, createAgent } from 'confused-ai';

const triageAgent = createAgent({
  name: 'triage',
  instructions: 'Triage the request. Hand off to specialists when needed.',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
});

const specialistAgent = createAgent({
  name: 'specialist',
  instructions: 'Handle complex technical escalations.',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
});

const handoff = createHandoff({
  source: triageAgent,
  targets: { specialist: specialistAgent },
  condition: (result) => result.text.includes('[ESCALATE]'),
  // or: condition: 'always'
});

const result = await handoff.run('My database is returning corrupted data after the migration.');
console.log(result.text);  // answered by the specialist if escalated
```

---

## `createAgentRouter` — capability-based routing

Route requests to agents based on declared capabilities:

```ts
import { createAgentRouter, createAgent } from 'confused-ai';

const router = createAgentRouter({
  strategy: 'capability',  // 'capability' | 'round-robin' | 'least-loaded'
  agents: [
    { agent: createAgent({ name: 'code-agent', instructions: '...', model: 'gpt-4o', apiKey: '...' }), capabilities: ['coding', 'debugging'] },
    { agent: createAgent({ name: 'data-agent', instructions: '...', model: 'gpt-4o', apiKey: '...' }), capabilities: ['data-analysis', 'sql'] },
    { agent: createAgent({ name: 'write-agent', instructions: '...', model: 'gpt-4o-mini', apiKey: '...' }), capabilities: ['writing', 'editing'] },
  ],
});

const result = await router.run({ prompt: 'Fix the SQL query performance issue.', capability: 'sql' });
```

---

## `createConsensus` — multi-agent voting

Run multiple agents on the same prompt and pick the best answer by consensus:

```ts
import { createConsensus, createAgent } from 'confused-ai';

const consensus = createConsensus({
  agents: [
    createAgent({ name: 'agent-a', instructions: 'Answer carefully.', model: 'gpt-4o', apiKey: '...' }),
    createAgent({ name: 'agent-b', instructions: 'Answer carefully.', model: 'claude-sonnet-4-20250514', apiKey: '...' }),
    createAgent({ name: 'agent-c', instructions: 'Answer carefully.', model: 'gpt-4o-mini', apiKey: '...' }),
  ],
  strategy: 'majority',  // 'majority' | 'best-of' | 'synthesise'
  judge: createAgent({ name: 'judge', instructions: 'Pick the most accurate answer.', model: 'gpt-4o', apiKey: '...' }),
});

const result = await consensus.run('What is the most efficient sorting algorithm for nearly-sorted data?');
console.log(result.text);
```

---

## `SwarmOrchestrator` — dynamic agent swarm

A self-organising swarm where agents spawn sub-agents and hand off dynamically:

```ts
import { SwarmOrchestrator, createRunnableAgent } from 'confused-ai';

const swarm = new SwarmOrchestrator({
  agents: [
    createRunnableAgent(plannerAgent),
    createRunnableAgent(researchAgent),
    createRunnableAgent(writerAgent),
  ],
  entryAgent: 'planner',
  maxHandoffs: 10,
});

const result = await swarm.run('Produce a detailed market analysis report for the EV charging industry.');
```

---

## `createPipeline` — typed data pipeline

Chain agents with typed input/output contracts:

```ts
import { createPipeline } from 'confused-ai';

const pipeline = createPipeline([
  { agent: extractAgent, transform: (r) => ({ rawData: r.text }) },
  { agent: enrichAgent,  transform: (r) => ({ enriched: r.text }) },
  { agent: reportAgent,  transform: (r) => r.text },
]);

const report = await pipeline.run('Extract, enrich, and report on the sales data.');
```

---

## A2A (agent-to-agent) HTTP communication

Expose an agent as an HTTP service and connect to it from another process:

```ts
import { A2AServer, createHttpA2AClient } from 'confused-ai/workflow';

// Server side
const server = new A2AServer({ agent: myAgent, port: 3100 });
await server.start();

// Client side (different process / container)
const client = createHttpA2AClient({ url: 'http://agent-service:3100' });
const result = await client.run({ prompt: 'Analyse the data.' });
```

---

## Load balancers

```ts
import {
  RoundRobinLoadBalancer,
  LeastConnectionsLoadBalancer,
  WeightedResponseTimeLoadBalancer,
} from 'confused-ai/workflow';

const balancer = new LeastConnectionsLoadBalancer([agentA, agentB, agentC]);
const agent = balancer.pick();
```

---

## Where to go next

- [Workflows](./workflows) — DAG-based graph workflows with branching and retries.
- [Reasoning](./reasoning) — step-by-step reasoning loops inside an agent.
- [Production](./production) — circuit breakers and health checks for distributed agent systems.
