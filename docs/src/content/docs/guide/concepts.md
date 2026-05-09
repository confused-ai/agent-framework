---
title: "Core Concepts"
---

# Core Concepts

## Agent

An agent is an LLM with a system prompt, tools, memory, and a run loop. Each `run()` call may involve multiple LLM steps until the agent produces a final response.

```
agent.run(input)
  │
  ├── build context (memory + session + knowledge)
  ├── step 1: LLM call → response
  │     ├── if tool calls → execute tools → next step
  │     └── if final answer → return
  ├── step N: ... (up to maxSteps)
  └── return { output, steps, tokens, cost }
```

## Tools

Tools are functions the LLM can call. The framework handles:
- Describing tools to the LLM (JSON Schema)
- Parsing the LLM's tool call arguments (Zod validation)
- Executing the tool function
- Returning results to the LLM

See [Custom Tools](/guide/custom-tools).

## Memory

Memory feeds past context into each LLM call. Two types:

- **Short-term (session):** Conversation messages for the current session
- **Long-term (vector):** Semantically similar past memories injected into system prompt

See [Memory](/guide/memory).

## Knowledge (RAG)

A `KnowledgeEngine` lets agents query documents using natural language. Before each run, the agent retrieves the most relevant chunks and injects them as context.

See [RAG / Knowledge](/guide/rag).

## Session

Sessions persist conversation history across runs. Without a session store, each `run()` starts fresh.

See [Session Management](/guide/session).

## Lifecycle Hooks

Hooks intercept the agent's run at well-defined points (before run, before step, before tool call, etc.) for logging, tracing, approval gates, and dynamic prompt injection.

See [Lifecycle Hooks](/guide/hooks).

## Orchestration

Multiple agents working together:

- **Router** — one of N agents handles the request
- **Handoff** — agent A delegates to agent B mid-conversation
- **Supervisor** — one agent manages a team of workers
- **Swarm** — agents pass control peer-to-peer
- **Team** — agents run in parallel, results merged

See [Orchestration](/guide/orchestration).

## Guardrails

Input/output validators that run before and after each LLM call. Used to enforce topic restrictions, content safety, and custom business rules.

See [Production](/guide/production).

## Plugins

Reusable middleware that can be attached to any agent via `.use()`:

```ts
const agent = defineAgent({ ... }).use(myPlugin);
```

See [Plugins](/guide/plugins).
