import { describe, it, expect } from '@jest/globals';

import {
    createGetSsvcCisaFrameworkTool,
    getSsvcCisaFrameworkHandler,
} from '../../../../src/agents/tool-registry/ssvc/get-ssvc-cisa-framework.js';

describe('get_ssvc_cisa_framework', () => {
    it('returns JSON with deployer stakeholder and 36-row table', () => {
        const raw = getSsvcCisaFrameworkHandler();
        const payload = JSON.parse(raw) as {
            stakeholder: string;
            source: string;
            outcomes: { label: string }[];
            table: unknown[];
        };

        expect(payload.stakeholder).toBe('deployer');
        expect(payload.source).toBe('cisa_coordinator_2_0_3');
        expect(payload.outcomes.map((o) => o.label)).toEqual(['Track', 'Track*', 'Attend', 'Act']);
        expect(payload.table).toHaveLength(36);
    });

    it('createGetSsvcCisaFrameworkTool invokes handler via LangChain', async () => {
        const tool = createGetSsvcCisaFrameworkTool();
        const result = await tool.invoke({});
        const payload = JSON.parse(result) as { table: { rowIndex: number; outcome: string }[] };
        expect(payload.table[24]?.outcome).toBe('Track');
    });
});
