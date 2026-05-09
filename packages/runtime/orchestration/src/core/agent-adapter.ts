/**
 * Agent adapter for orchestration
 *
 * Wraps a run function as an OrchestrableAgent so it can be registered
 * with the Orchestrator. Use OrchestrableAgent (not the public Agent) for
 * orchestration-internal wiring.
 */

import type { AgentInput, AgentOutput, AgentContext, EntityId } from '@confused-ai/core';
import type { OrchestrableAgent } from './types.js';
import { newId } from '@confused-ai/contracts';

export interface RunnableAgentConfig {
    readonly id?: EntityId;
    readonly name: string;
    readonly description?: string;
    readonly run: (input: AgentInput, ctx: AgentContext) => Promise<AgentOutput>;
}

/**
 * Creates an OrchestrableAgent from a plain run function.
 */
export function createRunnableAgent(config: RunnableAgentConfig): OrchestrableAgent {
    return {
        id: config.id ?? newId('agent'),
        name: config.name,
        description: config.description,
        run: config.run,
    };
}

export type { OrchestrableAgent };
