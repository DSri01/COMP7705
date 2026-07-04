import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from '@jest/globals';

import {
    buildCisaFrameworkPayload,
    CISA_COORDINATOR_2_0_3_TABLE,
    lookupCisaOutcome,
    normalizeCisaOutcome,
    normalizeExploitation,
    normalizeLookupInputs,
    SsvcNormalizeError,
} from '../../../src/ssvc/cisa/index.js';

const CSV_PATH = join('__testResources__', 'ssvc', 'cisa_coordinator_2_0_3.csv');

function parseCsvOutcome(raw: string): 'Track' | 'Track*' | 'Attend' | 'Act' {
    return normalizeCisaOutcome(raw);
}

function loadCsvRows(): Array<{
    rowIndex: number;
    exploitation: string;
    automatable: string;
    technicalImpact: string;
    missionImpact: string;
    outcome: string;
}> {
    const text = readFileSync(CSV_PATH, 'utf8');
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const dataLines = lines.slice(1);
    return dataLines.map((line) => {
        const [
            rowIndex,
            exploitation,
            automatable,
            technicalImpact,
            missionImpact,
            outcome,
        ] = line.split(',');
        return {
            rowIndex: Number(rowIndex),
            exploitation,
            automatable,
            technicalImpact,
            missionImpact,
            outcome,
        };
    });
}

describe('CISA_COORDINATOR_2_0_3_TABLE', () => {
    it('has 36 rows with contiguous rowIndex 0..35', () => {
        expect(CISA_COORDINATOR_2_0_3_TABLE).toHaveLength(36);
        expect(CISA_COORDINATOR_2_0_3_TABLE.map((row) => row.rowIndex)).toEqual(
            Array.from({ length: 36 }, (_, i) => i),
        );
    });
});

describe('cisa_coordinator_2_0_3.csv parity', () => {
    const csvRows = loadCsvRows();

    it('fixture has 36 data rows', () => {
        expect(csvRows).toHaveLength(36);
    });

    it.each(csvRows.map((row) => [row.rowIndex, row] as const))(
        'row %i matches embedded table and lookup',
        (rowIndex, csvRow) => {
            const embedded = CISA_COORDINATOR_2_0_3_TABLE[rowIndex];
            expect(embedded.exploitation).toBe(csvRow.exploitation);
            expect(embedded.automatable).toBe(csvRow.automatable);
            expect(embedded.technicalImpact).toBe(csvRow.technicalImpact);
            expect(embedded.missionImpact).toBe(csvRow.missionImpact);
            expect(embedded.outcome).toBe(parseCsvOutcome(csvRow.outcome));

            const result = lookupCisaOutcome({
                exploitation: csvRow.exploitation,
                automatable: csvRow.automatable,
                technicalImpact: csvRow.technicalImpact,
                missionImpact: csvRow.missionImpact,
            });
            expect(result.rowIndex).toBe(rowIndex);
            expect(result.outcome).toBe(parseCsvOutcome(csvRow.outcome));
        },
    );
});

describe('normalizeLookupInputs', () => {
    it('accepts title-case and alias synonyms', () => {
        expect(
            normalizeLookupInputs({
                exploitation: 'PoC',
                automatable: 'Yes',
                technicalImpact: 'Partial',
                missionImpact: 'High',
            }),
        ).toEqual({
            exploitation: 'public poc',
            automatable: 'yes',
            technicalImpact: 'partial',
            missionImpact: 'high',
        });
    });

    it('throws SsvcNormalizeError for unknown exploitation', () => {
        expect(() =>
            normalizeLookupInputs({
                exploitation: 'maybe',
                automatable: 'no',
                technicalImpact: 'partial',
                missionImpact: 'low',
            }),
        ).toThrow(SsvcNormalizeError);
    });
});

describe('lookupCisaOutcome', () => {
    it('normalizes raw strings before matching', () => {
        const result = lookupCisaOutcome({
            exploitation: 'Active',
            automatable: 'No',
            technicalImpact: 'Partial',
            missionImpact: 'Low',
        });
        expect(result.rowIndex).toBe(24);
        expect(result.outcome).toBe('Track');
        expect(result.normalizedInputs.exploitation).toBe('active');
    });

    it('returns Track* for row 5', () => {
        const result = lookupCisaOutcome({
            exploitation: 'none',
            automatable: 'no',
            technicalImpact: 'total',
            missionImpact: 'high',
        });
        expect(result.rowIndex).toBe(5);
        expect(result.outcome).toBe('Track*');
    });

    it('returns Act for row 35', () => {
        const result = lookupCisaOutcome({
            exploitation: 'active',
            automatable: 'yes',
            technicalImpact: 'total',
            missionImpact: 'high',
        });
        expect(result.rowIndex).toBe(35);
        expect(result.outcome).toBe('Act');
    });

    it('allows active→track (row 24)', () => {
        const result = lookupCisaOutcome({
            exploitation: 'active',
            automatable: 'no',
            technicalImpact: 'partial',
            missionImpact: 'low',
        });
        expect(result.rowIndex).toBe(24);
        expect(result.outcome).toBe('Track');
    });

    it('throws SsvcLookupNotFoundError after normalization failure surfaces as normalize error', () => {
        expect(() =>
            lookupCisaOutcome({
                exploitation: 'unknown',
                automatable: 'no',
                technicalImpact: 'partial',
                missionImpact: 'low',
            }),
        ).toThrow(SsvcNormalizeError);
    });
});

describe('normalizeExploitation', () => {
    it('maps None and PoC aliases', () => {
        expect(normalizeExploitation('None')).toBe('none');
        expect(normalizeExploitation('public poc')).toBe('public poc');
        expect(normalizeExploitation('PoC')).toBe('public poc');
    });
});

describe('buildCisaFrameworkPayload', () => {
    it('returns deployer stakeholder, definitions, and full 36-row table', () => {
        const payload = buildCisaFrameworkPayload();
        expect(payload.stakeholder).toBe('deployer');
        expect(payload.source).toBe('cisa_coordinator_2_0_3');
        expect(payload.outcomes).toHaveLength(4);
        expect(payload.outcomes.map((o) => o.label)).toEqual(['Track', 'Track*', 'Attend', 'Act']);
        expect(payload.table).toHaveLength(36);
        expect(payload.table[24]?.outcome).toBe('Track');
        expect(payload.inputs.exploitation.values).toEqual(['none', 'public poc', 'active']);
    });
});
