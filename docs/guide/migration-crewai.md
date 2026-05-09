---
title: Migrate from CrewAI
description: Map CrewAI agents, tasks, and crews to confused-ai equivalents with side-by-side code examples.
outline: [2, 3]
---

# Migrate from CrewAI

<p class="lead">
CrewAI models work as <strong>Crews → Tasks → Agents</strong>. confused-ai uses a composable builder API. This guide maps every CrewAI concept to its confused-ai equivalent.
</p>

## Core concept mapping

| CrewAI concept | confused-ai equivalent |
|---|---|
| `Agent` (with role/goal/backstory) | `defineAgent(name).instructions(rolePrompt).build()` |
| `Task` (description + expected output) | A workflow step — `createWorkflow().step(name, fn)` |
| `Crew` (list of agents + tasks + process) | `createWorkflow().build()` |
| `Process.sequential` | Default `createWorkflow()` step execution |
| `Process.hierarchical` | `defineAgent` with `.tools([otherAgent.asTool()])` |
| `Tool` | `tool()` helper from `confused-ai` |
| `Memory` (short-term / long-term) | `@confused-ai/memory` with `.memory(store)` |
| `Kickoff` | `workflow.run(input)` |
| `Delegation` | Pass one agent as a tool to another |
| `Verbose` / callbacks | `@confused-ai/observe` span subscriber |

---

## Installation comparison

::: code-group
```bash [CrewAI]
pip install crewai crewai-tools
```
```bash [confused-ai]
npm install confused-ai
```
:::

> **Note:** confused-ai is TypeScript-first. The patterns below assume you are migrating a Python CrewAI project to a Node.js / TypeScript service.

---

## Single agent

::: code-group
```python [CrewAI]
from crewai import Agent, Task, Crew
from crewai_tools import SerperDevTool

researcher = Agent(
    role="Senior Researcher",
    goal="Uncover groundbreaking technologies",
    backstory="You are a veteran tech researcher with 20 years of experience.",
    tools=[SerperDevTool()],
    verbose=True,
)

task = Task(
    description="Research the latest AI chip architectures",
    expected_output="A bullet-point summary of 5 key developments",
    agent=researcher,
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
```
```typescript [confused-ai]
import { defineAgent, tool } from 'confused-ai';
import { z } from 'zod';

const searchTool = tool({
  name: 'web_search',
  description: 'Search the web for current information',
  input: z.object({ query: z.string() }),
  async execute({ query }) {
    // integrate your search API here
    return `Search results for: ${query}`;
  },
});

const researcher = defineAgent('senior-researcher')
  .model('openai:gpt-4o')
  .instructions(`
    You are a Senior Researcher with 20 years of experience.
    Your goal is to uncover groundbreaking technologies.
  `)
  .tools([searchTool])
  .build();

const result = await researcher.run(
  'Research the latest AI chip architectures and provide a 5-point bullet summary.'
);
console.log(result);
```
:::

---

## Sequential crew → workflow

::: code-group
```python [CrewAI]
from crewai import Agent, Task, Crew, Process

researcher = Agent(role="Researcher", goal="Find facts", backstory="...")
writer    = Agent(role="Writer",     goal="Write clearly", backstory="...")

research_task = Task(
    description="Research quantum computing advances",
    expected_output="Key facts and citations",
    agent=researcher,
)
writing_task = Task(
    description="Write an article based on the research",
    expected_output="A 500-word article",
    agent=writer,
    context=[research_task],          # waits for research_task output
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,
)
result = crew.kickoff()
```
```typescript [confused-ai]
import { defineAgent, createWorkflow } from 'confused-ai';
import { z } from 'zod';

const researcher = defineAgent('researcher')
  .model('openai:gpt-4o')
  .input(z.object({ topic: z.string() }))
  .output(z.object({ facts: z.string() }))
  .instructions('Research the topic thoroughly and list key facts with citations.')
  .build();

const writer = defineAgent('writer')
  .model('openai:gpt-4o')
  .input(z.object({ facts: z.string() }))
  .output(z.object({ article: z.string() }))
  .instructions('Write a clear, engaging 500-word article based on the provided facts.')
  .build();

const pipeline = createWorkflow()
  .step('research', ({ topic }: { topic: string }) => researcher.run({ topic }))
  .step('write',    ({ facts })                     => writer.run({ facts }))
  .build();

const result = await pipeline.run({ topic: 'Quantum computing advances' });
console.log(result.article);
```
:::

---

## Hierarchical crew → manager agent with delegation

In CrewAI's hierarchical process, a manager LLM decides which agent handles each task. In confused-ai you give the orchestrator agent the sub-agents as tools.

::: code-group
```python [CrewAI]
from crewai import Agent, Task, Crew, Process

manager  = Agent(role="Project Manager", goal="Coordinate team", backstory="...")
analyst  = Agent(role="Data Analyst",    goal="Analyse data",    backstory="...")
engineer = Agent(role="Engineer",        goal="Build features",  backstory="...")

crew = Crew(
    agents=[manager, analyst, engineer],
    tasks=[...],
    process=Process.hierarchical,
    manager_llm="gpt-4o",
)
result = crew.kickoff(inputs={"project": "Build a recommender system"})
```
```typescript [confused-ai]
import { defineAgent, tool } from 'confused-ai';
import { z } from 'zod';

const analyst = defineAgent('data-analyst')
  .model('openai:gpt-4o')
  .input(z.object({ request: z.string() }))
  .output(z.object({ analysis: z.string() }))
  .instructions('You are a data analyst. Produce structured analysis reports.')
  .build();

const engineer = defineAgent('engineer')
  .model('openai:gpt-4o')
  .input(z.object({ spec: z.string() }))
  .output(z.object({ implementation: z.string() }))
  .instructions('You are a software engineer. Design and describe implementations.')
  .build();

// Expose sub-agents as tools for the manager
const analyseTool = tool({
  name: 'analyse',
  description: 'Delegate data analysis work to the data analyst',
  input: z.object({ request: z.string() }),
  execute: ({ request }) => analyst.run({ request }).then(r => r.analysis),
});

const engineerTool = tool({
  name: 'engineer',
  description: 'Delegate implementation work to the software engineer',
  input: z.object({ spec: z.string() }),
  execute: ({ spec }) => engineer.run({ spec }).then(r => r.implementation),
});

const manager = defineAgent('project-manager')
  .model('openai:gpt-4o')
  .instructions('You are a project manager. Coordinate the analyst and engineer to complete projects.')
  .tools([analyseTool, engineerTool])
  .build();

const result = await manager.run('Build a recommender system');
```
:::

---

## Memory

::: code-group
```python [CrewAI]
from crewai import Agent, Crew

agent = Agent(
    role="Assistant",
    goal="Remember user context",
    backstory="...",
    memory=True,          # enables short-term + long-term memory
)

crew = Crew(agents=[agent], tasks=[...], memory=True)
```
```typescript [confused-ai]
import { defineAgent } from 'confused-ai';
import { InMemoryStore } from '@confused-ai/memory';
import { InMemoryStore as SessionStore } from '@confused-ai/session';

const agent = defineAgent('assistant')
  .model('openai:gpt-4o')
  .instructions('Remember and use context from previous turns.')
  .memory(new InMemoryStore())    // semantic / vector memory
  .session(new SessionStore())    // conversation history
  .build();

const { sessionId } = await agent.run('My favourite colour is blue.');
const r2 = await agent.run('What is my favourite colour?', { sessionId });
console.log(r2); // "Your favourite colour is blue."
```
:::

---

## Custom tools

::: code-group
```python [CrewAI]
from crewai_tools import BaseTool

class WeatherTool(BaseTool):
    name: str = "weather"
    description: str = "Get the current weather for a city"

    def _run(self, city: str) -> str:
        return f"The weather in {city} is sunny, 22°C."

agent = Agent(role="Assistant", tools=[WeatherTool()], ...)
```
```typescript [confused-ai]
import { defineAgent, tool } from 'confused-ai';
import { z } from 'zod';

const weatherTool = tool({
  name: 'weather',
  description: 'Get the current weather for a city',
  input: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny, 22°C.`;
  },
});

const agent = defineAgent('assistant')
  .model('openai:gpt-4o')
  .tools([weatherTool])
  .build();
```
:::

---

## Observability (verbose mode)

::: code-group
```python [CrewAI]
agent = Agent(role="Researcher", verbose=True, ...)
crew  = Crew(agents=[agent], tasks=[...], verbose=2)
```
```typescript [confused-ai]
import { createSpanObserver } from '@confused-ai/observe';

// Subscribe once — all agents emit spans automatically
const unsub = createSpanObserver((span) => {
  console.log(`[${span.type}]`, span.name ?? '', span.durationMs != null ? `${span.durationMs}ms` : '');
});

const result = await agent.run('Research quantum computing');
unsub();
```
:::

---

## Key differences

| Topic | CrewAI | confused-ai |
|---|---|---|
| **Language** | Python | TypeScript (Node.js / Bun / Deno) |
| **Schema** | Pydantic models (optional) | Zod schemas — validated at every `run()` |
| **Delegation** | `Process.hierarchical` + manager LLM | Explicit — sub-agents exposed as `tool()` |
| **Memory** | `memory=True` flag | `.memory(store)` + `.session(store)` — swap any backend |
| **Streaming** | `crew.kickoff(stream=True)` | `agent.stream(input)` — `AsyncIterable<AgentStreamEvent>` |
| **Resume** | Not built-in | `agent.resume(runId)` from checkpoint |
| **Testing** | Python unittest / pytest | Vitest + `@confused-ai/test-utils` conformance suite |
