/**
 * confused-ai — root entry point.
 *
 * Quick start:
 *   import { agent } from 'confused-ai';
 *   const bot = agent('You are helpful.');
 *   const { text } = await bot.run('Hello!');
 *
 * For fine-grained control, import directly from workspace packages:
 *   import { createAgent }          from '@confused-ai/core';
 *   import { InMemorySessionStore } from '@confused-ai/session';
 *   import { httpClient }           from '@confused-ai/tools';
 *   import { createSwarm }          from '@confused-ai/workflow';
 */

// ── Headline API ───────────────────────────────────────────────────────────────
// `agent()` is the one-call entry point. Use it for all new code.
export { agent, bare, compose, pipe, definePersona, buildPersonaInstructions, createDevLogger, createDevToolMiddleware } from './dx/index.js';
export type { AgentMinimalOptions, BareAgentOptions, ComposeOptions, ComposedAgent, AgentPersona } from './dx/index.js';

// ── Class-based Agent (classic DX) ─────────────────────────────────────────────
export { Agent } from './agent.js';

// ── createAgent (legacy) — use agent() instead ─────────────────────────────────
export { createAgent } from './create-agent.js';
export type { CreateAgentOptions, CreateAgentResult } from './create-agent.js';

// ── Core framework ─────────────────────────────────────────────────────────────
export * from './core/index.js';

// ── Memory ─────────────────────────────────────────────────────────────────────
export { InMemoryStore, VectorMemoryStore, InMemoryVectorStore, OpenAIEmbeddingProvider } from '@confused-ai/memory';
export type { VectorMemoryStoreConfig, EmbeddingProvider, MemoryStore, MemoryEntry, MemoryQuery, MemoryType } from '@confused-ai/memory';

// ── Tools ─────────────────────────────────────────────────────────────────────
export * from '@confused-ai/tools';

// ── Planner ───────────────────────────────────────────────────────────────────
export * from '@confused-ai/planner';

// ── Execution ─────────────────────────────────────────────────────────────────
export * from '@confused-ai/execution';

// ── Orchestration ─────────────────────────────────────────────────────────────
export type {
    OrchestrableAgent, AgentRole, AgentRegistration, AgentMessage, MessageHandler,
    MCPToolDescriptor, MCPAgentMessage, MCPAgentClient,
    A2ATask, A2ATaskState, A2AAgentCard, A2AMessage, IA2AClient, A2AStreamEvent,
    TraceContext, LoadBalancer,
} from '@confused-ai/orchestration';
export {
    CoordinationType,
    MessageBusImpl, OrchestratorImpl,
    Team, SwarmOrchestrator,
    createSupervisor, createConsensus, createPipeline,
    createHandoff, createAgentRouter,
    createRunnableAgent,
    RoundRobinLoadBalancer, LeastConnectionsLoadBalancer, WeightedResponseTimeLoadBalancer,
    createHttpA2AClient, A2AServer,
    createToolkit, toolkitsToRegistry,
    extractTraceContext, generateTraceparent, injectTraceHeaders,
} from '@confused-ai/orchestration';

// ── Observability ─────────────────────────────────────────────────────────────
export * from './observability/index.js';

// ── LLM Providers ─────────────────────────────────────────────────────────────
export * from './providers/index.js';

// ── Agentic runner ────────────────────────────────────────────────────────────
export { AgenticRunner, createAgenticAgent } from '@confused-ai/agentic';
export type { AgenticRunnerConfig, AgenticLifecycleHooks, AgenticRunResult, AgenticStreamHooks } from '@confused-ai/agentic';

// ── SDK ───────────────────────────────────────────────────────────────────────
export { defineAgent, DefinedAgent, createWorkflow, WorkflowBuilder, Workflow } from '@confused-ai/sdk';
export type { AgentDefinitionConfig, AgentRunConfig, WorkflowResult, WorkflowStep } from '@confused-ai/sdk';

// ── Session ───────────────────────────────────────────────────────────────────
export * from '@confused-ai/session';

// ── Guardrails ────────────────────────────────────────────────────────────────
export * from '@confused-ai/guardrails';

// ── Learning ──────────────────────────────────────────────────────────────────
export * from '@confused-ai/learning';

// ── Knowledge ─────────────────────────────────────────────────────────────────
export * from '@confused-ai/knowledge';

// ── Shared utilities ──────────────────────────────────────────────────────────
export { VERSION, isTelemetryEnabled, recordFrameworkStartup } from '@confused-ai/shared';