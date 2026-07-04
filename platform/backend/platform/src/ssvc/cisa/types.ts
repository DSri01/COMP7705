import { z } from 'zod';

/** Normalized exploitation values (CERT `cisa_coordinator_2_0_3` column). */
export const SsvcExploitationSchema = z.enum(['none', 'public poc', 'active']);

/** Normalized automatable values. */
export const SsvcAutomatableSchema = z.enum(['no', 'yes']);

/** Normalized technical impact values. */
export const SsvcTechnicalImpactSchema = z.enum(['partial', 'total']);

/** Normalized mission and well-being impact values. */
export const SsvcMissionImpactSchema = z.enum(['low', 'medium', 'high']);

/** CISA outcome labels (title case). */
export const CisaOutcomeSchema = z.enum(['Track', 'Track*', 'Attend', 'Act']);

export const CisaDecisionTableRowSchema = z.object({
    rowIndex: z.number().int().min(0).max(35),
    exploitation: SsvcExploitationSchema,
    automatable: SsvcAutomatableSchema,
    technicalImpact: SsvcTechnicalImpactSchema,
    missionImpact: SsvcMissionImpactSchema,
    outcome: CisaOutcomeSchema,
});

export const SsvcLookupInputSchema = z.object({
    exploitation: SsvcExploitationSchema,
    automatable: SsvcAutomatableSchema,
    technicalImpact: SsvcTechnicalImpactSchema,
    missionImpact: SsvcMissionImpactSchema,
});

export const SsvcLookupRawInputSchema = z.object({
    exploitation: z.string().min(1),
    automatable: z.string().min(1),
    technicalImpact: z.string().min(1),
    missionImpact: z.string().min(1),
});

export const CisaFrameworkPayloadSchema = z.object({
    stakeholder: z.literal('deployer'),
    source: z.literal('cisa_coordinator_2_0_3'),
    outcomes: z.array(
        z.object({
            label: CisaOutcomeSchema,
            description: z.string(),
        }),
    ),
    inputs: z.object({
        exploitation: z.object({
            description: z.string(),
            values: z.array(SsvcExploitationSchema),
            displayLabels: z.record(z.string(), z.string()),
        }),
        automatable: z.object({
            description: z.string(),
            values: z.array(SsvcAutomatableSchema),
            displayLabels: z.record(z.string(), z.string()),
        }),
        technicalImpact: z.object({
            description: z.string(),
            values: z.array(SsvcTechnicalImpactSchema),
            displayLabels: z.record(z.string(), z.string()),
        }),
        missionImpact: z.object({
            description: z.string(),
            values: z.array(SsvcMissionImpactSchema),
            displayLabels: z.record(z.string(), z.string()),
        }),
    }),
    table: z.array(CisaDecisionTableRowSchema),
});
