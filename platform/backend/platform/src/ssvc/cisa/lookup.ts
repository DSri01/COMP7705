import { z } from 'zod';

import { normalizeLookupInputs } from './normalize.js';
import { CISA_COORDINATOR_2_0_3_TABLE } from './table.js';
import { SsvcLookupInputSchema } from './types.js';

/** Thrown when no decision-table row matches normalized inputs (should not occur for valid tuples). */
export class SsvcLookupNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SsvcLookupNotFoundError';
    }
}

function findRow(inputs: z.output<typeof SsvcLookupInputSchema>) {
    return CISA_COORDINATOR_2_0_3_TABLE.find(
        (row) =>
            row.exploitation === inputs.exploitation &&
            row.automatable === inputs.automatable &&
            row.technicalImpact === inputs.technicalImpact &&
            row.missionImpact === inputs.missionImpact,
    );
}

/**
 * Deterministic CISA outcome lookup from four normalized inputs.
 * Accepts raw agent strings; normalizes synonyms before matching.
 */
export function lookupCisaOutcome(raw: {
    exploitation: string;
    automatable: string;
    technicalImpact: string;
    missionImpact: string;
}) {
    const normalizedInputs = normalizeLookupInputs(raw);
    const row = findRow(normalizedInputs);
    if (row === undefined) {
        throw new SsvcLookupNotFoundError(
            `No cisa_coordinator_2_0_3 row for exploitation=${normalizedInputs.exploitation}, ` +
                `automatable=${normalizedInputs.automatable}, technicalImpact=${normalizedInputs.technicalImpact}, ` +
                `missionImpact=${normalizedInputs.missionImpact}`,
        );
    }

    return {
        rowIndex: row.rowIndex,
        outcome: row.outcome,
        normalizedInputs,
    };
}

/**
 * Same as {@link lookupCisaOutcome} but inputs are already normalized CSV column values.
 */
export function lookupCisaOutcomeNormalized(inputs: z.output<typeof SsvcLookupInputSchema>) {
    const parsed = SsvcLookupInputSchema.parse(inputs);
    const row = findRow(parsed);
    if (row === undefined) {
        throw new SsvcLookupNotFoundError(
            `No cisa_coordinator_2_0_3 row for exploitation=${parsed.exploitation}, ` +
                `automatable=${parsed.automatable}, technicalImpact=${parsed.technicalImpact}, ` +
                `missionImpact=${parsed.missionImpact}`,
        );
    }

    return {
        rowIndex: row.rowIndex,
        outcome: row.outcome,
        normalizedInputs: parsed,
    };
}
