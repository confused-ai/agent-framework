---
layout: home

hero:
  name: "confused-ai"
  text: "Build AI agents in TypeScript"
  tagline: "A minimal, production-ready framework with smart defaults. 40+ LLM providers, 100+ built-in tools, multi-agent orchestration, and zero boilerplate."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Examples
      link: /examples/
    - theme: alt
      text: View on GitHub
      link: https://github.com/confused-ai/confused-ai

features:
  - icon: ⚡
    title: Zero to agent in 3 lines
    details: Smart defaults for LLM, session, tools, and guardrails. Override anything you need.
    link: /guide/getting-started
    linkText: Quick start
  - icon: 🏗️
    title: 40+ LLM providers
    details: OpenAI, Anthropic, Google, Azure, Groq, Ollama, vLLM, Deepseek, Mistral, Cohere, AWS Bedrock, and 30+ more — all auto-detected from env vars.
    link: /guide/providers
    linkText: All providers
  - icon: 🔧
    title: 100+ built-in tools
    details: HTTP, browser, email, Slack, GitHub, PostgreSQL, Redis, Stripe and more — all Zod-validated.
    link: /guide/tools
    linkText: Browse tools
  - icon: 🧩
    title: Tool composition
    details: composeTool, parallelTools, fallbackTool, retryTool, timeoutTool, mapTool, filterTool — build powerful tool pipelines without modifying originals.
    link: /guide/tool-composition
    linkText: Compose tools
  - icon: 🔀
    title: Multi-agent orchestration
    details: compose(), pipe(), AgentRouter, HandoffProtocol, supervisor, swarm — any topology, any strategy.
    link: /guide/orchestration
    linkText: Orchestration
  - icon: 🌿
    title: Workflow branching
    details: branch, loopUntil, forEach, race, retry — add conditional logic, fan-out, and loops to any workflow.
    link: /guide/workflow-branching
    linkText: Control flow
  - icon: 🧠
    title: RAG in one call
    details: KnowledgeEngine with text, JSON, CSV and URL loaders plus vector search baked in.
    link: /guide/rag
    linkText: RAG guide
  - icon: 🎯
    title: Pre-built skills
    details: webResearchSkill, pdfSummarizerSkill, codeReviewerSkill — drop-in capability bundles you can stack on any agent.
    link: /guide/skills
    linkText: Browse skills
  - icon: 📊
    title: Evaluation & benchmarking
    details: exactMatch, contains, ROUGE-L, LLM-as-judge scorers. runBenchmark, runEvalSuite, CI regression guard.
    link: /guide/eval
    linkText: Eval guide
  - icon: 🚀
    title: Production-hardened
    details: Circuit breakers, budget caps, rate limiting, OTLP tracing, graceful shutdown, and secret manager.
    link: /guide/production
    linkText: Production
  - icon: 🌊
    title: Stream utilities
    details: streamToSSE, streamTee, streamMap, streamFilter, streamMerge, streamWithBudget — composable stream transformers.
    link: /guide/stream-utils
    linkText: Stream utils
  - icon: 🔌
    title: MCP client + server
    details: Connect to any Model Context Protocol server or expose your own tools as an MCP server.
    link: /guide/mcp
    linkText: MCP guide
