import { describe, it, expect } from '@jest/globals';

import {
    createLookupSsvcCisaOutcomeTool,
    lookupSsvcCisaOutcomeHandler,
} from '../../../../src/agents/tool-registry/ssvc/lookup-ssvc-cisa-outcome.js';

describe('lookup_ssvc_cisa_outcome', () => {
    it('returns JSON outcome for normalized CSV values', () => {
        const raw = lookupSsvcCisaOutcomeHandler({
            exploitation: 'active',
            automatable: 'no',
            technicalImpact: 'partial',
            missionImpact: 'low',
        });
        const result = JSON.parse(raw) as {
            rowIndex: number;
            outcome: string;
            normalizedInputs: { exploitation: string };
        };
        expect(result.rowIndex).toBe(24);
        expect(result.outcome).toBe('Track');
        expect(result.normalizedInputs.exploitation).toBe('active');
    });

    it('normalizes title-case and alias inputs', () => {
        const raw = lookupSsvcCisaOutcomeHandler({
            exploitation: 'PoC',
            automatable: 'Yes',
            technicalImpact: 'Total',
            missionImpact: 'High',
        });
        const result = JSON.parse(raw) as { rowIndex: number; outcome: string };
        expect(result.rowIndex).toBe(23);
        expect(result.outcome).toBe('Attend');
    });

    it('returns ERROR for unrecognized exploitation', () => {
        expect(
            lookupSsvcCisaOutcomeHandler({
                exploitation: 'maybe',
                automatable: 'no',
                technicalImpact: 'partial',
                missionImpact: 'low',
            }),
        ).toMatch(/^ERROR:/);
    });

    it('createLookupSsvcCisaOutcomeTool invokes handler via LangChain', async () => {
        const tool = createLookupSsvcCisaOutcomeTool();
        const result = await tool.invoke({
            exploitation: 'none',
            automatable: 'no',
            technicalImpact: 'total',
            missionImpact: 'high',
        });
        const parsed = JSON.parse(result) as { rowIndex: number; outcome: string };
        expect(parsed.rowIndex).toBe(5);
        expect(parsed.outcome).toBe('Track*');
    });
});
