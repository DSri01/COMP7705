import { describe, it, expect, beforeEach } from '@jest/globals';

import { createAdviceGenerationTools } from '../../../../src/agents/agent-graphs/advice-generation-agent/tools.js';
import { AdviceGenerationTurnBudget } from '../../../../src/agents/agent-graphs/advice-generation-agent/turn-budget.js';
import {
    createAgentContextManager,
    PLATFORM_CONTEXT_CONFIG,
} from '../../../../src/agents/lib/context/index.js';

describe('advice-generation SSVC tool workflow', () => {
    const threadId = 'advice-ssvc-workflow-thread';
    let turnBudget: AdviceGenerationTurnBudget;

    beforeEach(() => {
        turnBudget = new AdviceGenerationTurnBudget();
        turnBudget.beginTurn(threadId);
    });

    function getTool(name: string) {
        const contextManager = createAgentContextManager(
            'advice-generation-agent-test',
            PLATFORM_CONTEXT_CONFIG,
        );
        contextManager.beginTurn(threadId);
        const tools = createAdviceGenerationTools({} as never, contextManager, turnBudget);
        const match = tools.find((t) => t.name === name);
        if (match === undefined) {
            throw new Error(`Tool not found: ${name}`);
        }
        return match;
    }

    it('get_ssvc_cisa_framework returns deployer payload with 36-row table', async () => {
        const tool = getTool('get_ssvc_cisa_framework');
        const raw = await tool.invoke({});
        const payload = JSON.parse(String(raw)) as {
            stakeholder: string;
            table: { rowIndex: number; outcome: string }[];
        };
        expect(payload.stakeholder).toBe('deployer');
        expect(payload.table).toHaveLength(36);
    });

    it('lookup_ssvc_cisa_outcome returns Track for active row 24 inputs', async () => {
        const tool = getTool('lookup_ssvc_cisa_outcome');
        const raw = await tool.invoke({
            exploitation: 'Active',
            automatable: 'No',
            technicalImpact: 'Partial',
            missionImpact: 'Low',
        });
        const result = JSON.parse(String(raw)) as { rowIndex: number; outcome: string };
        expect(result.rowIndex).toBe(24);
        expect(result.outcome).toBe('Track');
    });

    it('lookup_ssvc_cisa_outcome returns ERROR for invalid exploitation', async () => {
        const tool = getTool('lookup_ssvc_cisa_outcome');
        const raw = await tool.invoke({
            exploitation: 'unknown',
            automatable: 'no',
            technicalImpact: 'partial',
            missionImpact: 'low',
        });
        expect(String(raw)).toMatch(/^ERROR:/);
    });
});
