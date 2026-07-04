import { NotFoundException } from '@nestjs/common';
import type { ThreadedAgent } from './threaded-agent.js';

/** One LangGraph agent mounted under `/agents/:agentId/threads`. */
export interface AgentMount {
    /** Must match an entry in `src/agents/manifest.ts` `AGENT_IDS`. */
    agentId: string;
    agent: ThreadedAgent;
}

/**
 * In-memory map from `agentId` to {@link ThreadedAgent}.
 * Built at startup via {@link buildAgentRegistry} / {@link ../../agents/manifest.js!buildPlatformAgentRegistry}.
 */
export class AgentRegistry {
    private readonly agents: Map<string, ThreadedAgent>;

    constructor(mounts: readonly AgentMount[]) {
        this.agents = new Map(mounts.map((m) => [m.agentId, m.agent]));
    }

    /** Registered HTTP agent ids (order not guaranteed). */
    getAgentIds(): readonly string[] {
        return Array.from(this.agents.keys());
    }

    /**
     * @throws {NotFoundException} when `agentId` is not mounted
     */
    resolve(agentId: string): ThreadedAgent {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new NotFoundException('Agent not found');
        }
        return agent;
    }

    has(agentId: string): boolean {
        return this.agents.has(agentId);
    }
}

/**
 * Builds a registry, rejecting duplicate `agentId` values at startup.
 * @throws {Error} when the same `agentId` appears twice in `mounts`
 */
export function buildAgentRegistry(mounts: readonly AgentMount[]): AgentRegistry {
    const seen = new Set<string>();
    for (const { agentId } of mounts) {
        if (seen.has(agentId)) {
            throw new Error(`Duplicate agentId in registry: ${agentId}`);
        }
        seen.add(agentId);
    }
    return new AgentRegistry(mounts);
}

/** NestJS injection token for {@link AgentRegistry}. */
export const AGENT_REGISTRY = Symbol('AGENT_REGISTRY');
