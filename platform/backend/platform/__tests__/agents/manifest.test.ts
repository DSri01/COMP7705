import { describe, it, expect } from '@jest/globals';
import { AGENT_IDS } from '../../src/agents/manifest.js';
import { buildAgentRegistry } from '../../src/server/agents/agent-registry.js';
import type { ThreadedAgent } from '../../src/server/agents/threaded-agent.js';

const stubAgent: ThreadedAgent = {
    runTurn: async () => 'ok',
    getMessages: async () => [],
};

describe('AGENT_IDS', () => {
    it('lists HTTP-mounted agents (platform-assistant only)', () => {
        expect(AGENT_IDS).toEqual(['platform-assistant']);
    });

    it('aligns with a registry built from the same ids', () => {
        const registry = buildAgentRegistry(
            AGENT_IDS.map((agentId) => ({ agentId, agent: stubAgent })),
        );
        expect([...registry.getAgentIds()].sort()).toEqual([...AGENT_IDS].sort());
        for (const id of AGENT_IDS) {
            expect(registry.resolve(id)).toBe(stubAgent);
        }
    });
});
