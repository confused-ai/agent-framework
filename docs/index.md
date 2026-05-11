---
layout: home

hero:
  name: "confused-ai"
  text: "Build agents, teams, and workflows in TypeScript"
  tagline: "Start with one useful agent. Add tools, sessions, retrieval, orchestration, serving, and production controls without changing frameworks."
  actions:
    - theme: brand
      text: Read the Introduction
      link: /guide/introduction
    - theme: alt
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: Examples
      link: /examples/
---

## One quick example

```ts
import { agent, tool } from 'confused-ai';
import { z } from 'zod/v3';

const getQuote = tool({
  name: 'get_quote',
  description: 'Return a stock quote for a ticker symbol.',
  parameters: z.object({ symbol: z.string() }),
  execute: async ({ symbol }) => ({ symbol, price: 927.5, changePct: 1.4 }),
});

const financeAgent = agent({
  name: 'finance-agent',
  model: 'gpt-4o-mini',
  instructions: 'Use the tool to answer market questions in one sentence.',
  tools: [getQuote],
});

const result = await financeAgent.run("What's NVDA trading at today?");
console.log(result.text);
```

<div class="af-shell af-home-shell">
  <section class="af-section">
    <div class="af-proof-grid">
      <article class="af-proof-card">
        <p class="af-proof-label">Single install</p>
        <p class="af-proof-value">One package, clear public subpaths, no consumer-facing monorepo imports</p>
      </article>
      <article class="af-proof-card">
        <p class="af-proof-label">Layered growth</p>
        <p class="af-proof-value">Start small and add runtime features in the order real systems need them</p>
      </article>
      <article class="af-proof-card">
        <p class="af-proof-label">Runtime ready</p>
        <p class="af-proof-value">Serve, schedule, observe, and harden agents without leaving the framework</p>
      </article>
      <article class="af-proof-card">
        <p class="af-proof-label">Coordination built in</p>
        <p class="af-proof-value">Move from one agent to workflows, supervisors, and teams when the task demands it</p>
      </article>
    </div>
  </section>

  <section class="af-section af-stage">
    <div class="af-stage-copy">
      <p class="af-eyebrow">Build in layers</p>
      <h2 class="af-home-section-title">The framework is designed around the order teams actually adopt it.</h2>
      <p class="af-stage-lede">The cleanest path is to prove one agent first, then add only the missing layer: tools for live access, sessions for continuity, retrieval for grounded answers, serving for delivery, orchestration for coordination, and production controls for safe operation.</p>
      <div class="af-stage-list">
        <article class="af-stage-item">
          <strong>Author</strong>
          <span>Define the agent, its instructions, its model, and the minimum capabilities it needs.</span>
        </article>
        <article class="af-stage-item">
          <strong>Connect</strong>
          <span>Add tools, sessions, retrieval, memory, and storage when the system needs real context or continuity.</span>
        </article>
        <article class="af-stage-item">
          <strong>Operate</strong>
          <span>Serve over HTTP, run scheduled jobs, observe behavior, and harden the runtime when the agent becomes a real system.</span>
        </article>
      </div>
    </div>
    <div class="af-stage-panel">
      <p class="af-stage-kicker">What the package gives you</p>
      <div class="af-code-panel" aria-label="confused-ai capability summary">
        <span class="af-code-line">author agents and typed contracts</span>
        <span class="af-code-line">add tools and MCP-based integrations</span>
        <span class="af-code-line">persist sessions, memory, and application state</span>
        <span class="af-code-line">retrieve context from indexed documents</span>
        <span class="af-code-line">serve agents over HTTP or schedule them as jobs</span>
        <span class="af-code-line">coordinate specialists with teams and supervisors</span>
        <span class="af-code-line">trace runs, evaluate quality, and apply runtime controls</span>
      </div>
    </div>
  </section>

  <section class="af-section">
    <p class="af-eyebrow">Three primitives</p>
    <div class="af-grid af-grid-3">
      <article class="af-card af-card-feature">
        <h3>Agent</h3>
        <p>The smallest useful unit. Use it when one model-backed worker can solve the task with clear instructions and explicit capabilities.</p>
      </article>
      <article class="af-card af-card-feature">
        <h3>Team</h3>
        <p>Use teams when the work benefits from specialists, routing, delegation, handoffs, or explicit supervisory control.</p>
      </article>
      <article class="af-card af-card-feature">
        <h3>Workflow</h3>
        <p>Use workflows when the sequence, branching, or structure of execution matters as much as the text the model returns.</p>
      </article>
    </div>
  </section>

  <section class="af-section">
    <p class="af-eyebrow">Start here</p>
    <div class="af-grid af-grid-3">
      <a class="af-card af-link-card" href="/guide/introduction">
        <h3>Introduction</h3>
        <p>Learn the product story, the layered mental model, and the recommended adoption order.</p>
      </a>
      <a class="af-card af-link-card" href="/guide/getting-started">
        <h3>Getting Started</h3>
        <p>Build the first successful run without pulling in advanced layers too early.</p>
      </a>
      <a class="af-card af-link-card" href="/examples/">
        <h3>Examples</h3>
        <p>Use runnable examples when you want concrete patterns for tools, retrieval, orchestration, and production hardening.</p>
      </a>
    </div>
  </section>
</div>

## How to use the docs

Read the docs in this order if you are new to the framework:

1. `guide/introduction` for the mental model.
2. `guide/getting-started` for the first implementation path.
3. `examples/` for runnable patterns.
4. topic guides when a specific capability becomes necessary.
5. `api/` when you want a compact map of the public surfaces.

## Why confused-ai

- One package and clear public subpaths instead of consumer-facing monorepo imports.
- Plain TypeScript authoring instead of a separate configuration DSL.
- A clean path from one agent to served, observable, orchestrated systems.
- Sessions, retrieval, evaluation, reasoning, approvals, and runtime controls available when you need them.

## Core capabilities

| Capability | What it gives you |
|---|---|
| Agents | model, instructions, tools, and runtime behavior in one unit |
| Teams and workflows | specialists, supervisors, routing, and structured execution |
| Tools | explicit system boundaries for live data and side effects |
| Sessions and memory | continuity and retained facts |
| Knowledge and storage | source-backed answers and durable state |
| Serve and schedule | HTTP delivery and timed execution |
| Observe and evaluate | traces, metrics, and regression checks |
| Guard and approve | validation, policies, and human checkpoints |

## Public package rule

All public docs should describe the framework as one package: `confused-ai`, plus focused public subpaths when a capability has its own runtime surface. Internal workspace packages are not the consumer-facing API story.