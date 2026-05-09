/**
 * Core module exports.
 *
 * @deprecated This implementation folder will be merged into `@confused-ai/core` in the
 *   next major version. Imports will continue to work via this re-export shim.
 *   Migrate new code to import from `@confused-ai/core` directly.
 */

export * from './types.js';
export * from './schemas.js';
export { BaseAgent } from './base-agent.js';
export { AgentContextBuilder } from './context-builder.js';