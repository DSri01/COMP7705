import { z } from 'zod';

import {
    CisaOutcomeSchema,
    SsvcAutomatableSchema,
    SsvcExploitationSchema,
    SsvcLookupInputSchema,
    SsvcMissionImpactSchema,
    SsvcTechnicalImpactSchema,
} from './types.js';

function normalizeToken(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const EXPLOITATION_ALIASES: Readonly<Record<string, z.output<typeof SsvcExploitationSchema>>> = {
    none: 'none',
    'public poc': 'public poc',
    poc: 'public poc',
    active: 'active',
};

const AUTOMATABLE_ALIASES: Readonly<Record<string, z.output<typeof SsvcAutomatableSchema>>> = {
    no: 'no',
    n: 'no',
    false: 'no',
    yes: 'yes',
    y: 'yes',
    true: 'yes',
};

const TECHNICAL_IMPACT_ALIASES: Readonly<Record<string, z.output<typeof SsvcTechnicalImpactSchema>>> =
    {
        partial: 'partial',
        p: 'partial',
        total: 'total',
        t: 'total',
    };

const MISSION_IMPACT_ALIASES: Readonly<Record<string, z.output<typeof SsvcMissionImpactSchema>>> = {
    low: 'low',
    l: 'low',
    medium: 'medium',
    m: 'medium',
    high: 'high',
    h: 'high',
};

const OUTCOME_ALIASES: Readonly<Record<string, z.output<typeof CisaOutcomeSchema>>> = {
    track: 'Track',
    'track*': 'Track*',
    attend: 'Attend',
    act: 'Act',
};

function mapAlias<T extends string>(
    raw: string,
    aliases: Readonly<Record<string, T>>,
    fieldName: string,
): T {
    const key = normalizeToken(raw);
    const mapped = aliases[key];
    if (mapped === undefined) {
        throw new SsvcNormalizeError(`Unrecognized ${fieldName} value: ${JSON.stringify(raw)}`);
    }
    return mapped;
}

/** Thrown when a lookup input cannot be normalized. */
export class SsvcNormalizeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SsvcNormalizeError';
    }
}

export function normalizeExploitation(raw: string): z.output<typeof SsvcExploitationSchema> {
    return mapAlias(raw, EXPLOITATION_ALIASES, 'exploitation');
}

export function normalizeAutomatable(raw: string): z.output<typeof SsvcAutomatableSchema> {
    return mapAlias(raw, AUTOMATABLE_ALIASES, 'automatable');
}

export function normalizeTechnicalImpact(raw: string): z.output<typeof SsvcTechnicalImpactSchema> {
    return mapAlias(raw, TECHNICAL_IMPACT_ALIASES, 'technical impact');
}

export function normalizeMissionImpact(raw: string): z.output<typeof SsvcMissionImpactSchema> {
    return mapAlias(raw, MISSION_IMPACT_ALIASES, 'mission impact');
}

export function normalizeCisaOutcome(raw: string): z.output<typeof CisaOutcomeSchema> {
    return mapAlias(raw, OUTCOME_ALIASES, 'CISA outcome');
}

export function normalizeLookupInputs(raw: {
    exploitation: string;
    automatable: string;
    technicalImpact: string;
    missionImpact: string;
}) {
    return SsvcLookupInputSchema.parse({
        exploitation: normalizeExploitation(raw.exploitation),
        automatable: normalizeAutomatable(raw.automatable),
        technicalImpact: normalizeTechnicalImpact(raw.technicalImpact),
        missionImpact: normalizeMissionImpact(raw.missionImpact),
    });
}
