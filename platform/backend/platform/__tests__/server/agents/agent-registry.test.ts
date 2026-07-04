import { describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { buildAgentRegistry } from '../../../src/server/agents/agent-registry.js';
import type { ThreadedAgent } from '../../../src/server/agents/threaded-agent.js';

const stubAgent: ThreadedAgent = {
    runTurn: async () => '',
    getMessages: async () => [],
};

describe('buildAgentRegistry', () => {
    it('resolves registered agents', () => {
        const registry = buildAgentRegistry([
            { agentId: 'platform-assistant', agent: stubAgent },
        ]);
        expect(registry.resolve('platform-assistant')).toBe(stubAgent);
        expect(registry.has('platform-assistant')).toBe(true);
        expect(registry.getAgentIds()).toEqual(['platform-assistant']);
    });

    it('throws NotFoundException for unknown agentId', () => {
        const registry = buildAgentRegistry([
            { agentId: 'platform-assistant', agent: stubAgent },
        ]);
        expect(() => registry.resolve('missing')).toThrow(NotFoundException);
    });

    it('rejects duplicate agentIds at construction', () => {
        expect(() =>
            buildAgentRegistry([
                { agentId: 'platform-assistant', agent: stubAgent },
                { agentId: 'platform-assistant', agent: stubAgent },
            ]),
        ).toThrow('Duplicate agentId');
    });
});
