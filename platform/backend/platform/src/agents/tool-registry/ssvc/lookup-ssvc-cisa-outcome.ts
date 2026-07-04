import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { lookupCisaOutcome, SsvcLookupNotFoundError } from '../../../ssvc/cisa/lookup.js';
import { SsvcNormalizeError } from '../../../ssvc/cisa/normalize.js';

const LookupSsvcCisaOutcomeInputSchema = z.object({
    exploitation: z
        .string()
        .min(1)
        .describe(
            'Exploitation status: None/none, PoC/public poc, or Active/active (KEV→Active is a prompt rule, not applied here)',
        ),
    automatable: z.string().min(1).describe('Automatable: No/no or Yes/yes'),
    technicalImpact: z
        .string()
        .min(1)
        .describe('Technical impact: Partial/partial or Total/total'),
    missionImpact: z
        .string()
        .min(1)
        .describe('Mission and well-being impact: Low/low, Medium/medium, or High/high'),
});

/**
 * Deterministic CISA outcome from four SSVC inputs.
 * Normalizes synonyms; returns JSON or `ERROR: …`.
 */
export function lookupSsvcCisaOutcomeHandler(
    args: z.output<typeof LookupSsvcCisaOutcomeInputSchema>,
): string {
    try {
        const result = lookupCisaOutcome(args);
        return JSON.stringify(result, null, 2);
    } catch (e) {
        if (e instanceof SsvcNormalizeError || e instanceof SsvcLookupNotFoundError) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `lookup_ssvc_cisa_outcome` tool — advice-generation agent only. */
export function createLookupSsvcCisaOutcomeTool(): StructuredTool<
    typeof LookupSsvcCisaOutcomeInputSchema
> {
    return tool(lookupSsvcCisaOutcomeHandler, {
        name: 'lookup_ssvc_cisa_outcome',
        description:
            'Look up the deterministic CISA outcome (Track, Track*, Attend, Act) from four SSVC inputs ' +
            'using the cisa_coordinator_2_0_3 table. Required before finish on every advice task. ' +
            'Returns rowIndex, outcome, and normalizedInputs JSON.',
        schema: LookupSsvcCisaOutcomeInputSchema,
    });
}
