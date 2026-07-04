import { describe, it, expect, beforeEach } from '@jest/globals';

import { createAdviceGenerationTools } from '../../../../src/agents/agent-graphs/advice-generation-agent/tools.js';
import { AdviceGenerationTurnBudget } from '../../../../src/agents/agent-graphs/advice-generation-agent/turn-budget.js';
import {
    createAgentContextManager,
    PLATFORM_CONTEXT_CONFIG,
} from '../../../../src/agents/lib/context/index.js';

describe('createAdviceGenerationTools', () => {
    let toolNames: string[];

    beforeEach(() => {
        const contextManager = createAgentContextManager(
            'advice-generation-agent-test',
            PLATFORM_CONTEXT_CONFIG,
        );
        const turnBudget = new AdviceGenerationTurnBudget();
        const tools = createAdviceGenerationTools(
            {} as never,
            contextManager,
            turnBudget,
        );
        toolNames = tools.map((t) => t.name);
    });

    it('includes CISA SSVC tools on the allowlist', () => {
        expect(toolNames).toContain('get_ssvc_cisa_framework');
        expect(toolNames).toContain('lookup_ssvc_cisa_outcome');
    });

    it('places SSVC tools before finish', () => {
        const finishIndex = toolNames.indexOf('finish');
        const frameworkIndex = toolNames.indexOf('get_ssvc_cisa_framework');
        const lookupIndex = toolNames.indexOf('lookup_ssvc_cisa_outcome');
        expect(frameworkIndex).toBeGreaterThan(-1);
        expect(lookupIndex).toBeGreaterThan(-1);
        expect(frameworkIndex).toBeLessThan(finishIndex);
        expect(lookupIndex).toBeLessThan(finishIndex);
    });
});
