/**
 * confused-ai/lite — modern minimal entry point.
 *
 * Use this when you want the cleanest import surface and the smallest
 * runtime bundle. Pull in optional capabilities from focused subpaths such as
 * `confused-ai/tool`, `confused-ai/session`, or `confused-ai/knowledge` only
 * when you need them.
 */

export { agent, bare, defineAgent, compose, pipe } from './dx/index.js';
export type {
    AgentMinimalOptions,
    BareAgentOptions,
    DefineAgentOptions,
    ComposeOptions,
    ComposedAgent,
} from './dx/index.js';

export { createAgent } from './create-agent.js';
export type {
    CreateAgentOptions,
    AgentRunOptions,
    CreateAgentResult,
    StreamChunk,
} from './create-agent.js';