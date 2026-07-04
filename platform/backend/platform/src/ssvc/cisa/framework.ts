import { CISA_COORDINATOR_2_0_3_TABLE } from './table.js';
import { CisaFrameworkPayloadSchema } from './types.js';

const OUTCOME_DEFINITIONS = [
    {
        label: 'Track' as const,
        description:
            'Address on the organisation standard patching schedule for this deployed image. ' +
            'Not a synonym for ignore — baseline patching obligations still apply.',
    },
    {
        label: 'Track*' as const,
        description:
            'Same timeline as Track with elevated monitoring; watch for exploitation-status changes on this deployment.',
    },
    {
        label: 'Attend' as const,
        description:
            'Notify management and accelerate remediation for this deployment; engage vendor PSIRT if no patch exists.',
    },
    {
        label: 'Act' as const,
        description:
            'Immediate remediation for this deployment; coordinate internal and external communications as needed.',
    },
];

/**
 * Structured CISA SSVC framework payload for `get_ssvc_cisa_framework`.
 * Includes input definitions and the full 36-row decision table.
 */
export function buildCisaFrameworkPayload() {
    const payload = {
        stakeholder: 'deployer' as const,
        source: 'cisa_coordinator_2_0_3' as const,
        outcomes: OUTCOME_DEFINITIONS,
        inputs: {
            exploitation: {
                description:
                    'Observed or inferred exploitation status for this CVE (deployer view). ' +
                    'KEV listing is a prompt-level signal for Active; not applied in lookup normalization.',
                values: ['none', 'public poc', 'active'] as const,
                displayLabels: {
                    none: 'None',
                    'public poc': 'PoC',
                    active: 'Active',
                },
            },
            automatable: {
                description:
                    'Whether exploitation can be automated at scale against this deployment (SSVC Automatable v2.0.0).',
                values: ['no', 'yes'] as const,
                displayLabels: {
                    no: 'No',
                    yes: 'Yes',
                },
            },
            technicalImpact: {
                description:
                    'Technical impact if exploited against this deployment (SSVC Technical Impact v1.0.0).',
                values: ['partial', 'total'] as const,
                displayLabels: {
                    partial: 'Partial',
                    total: 'Total',
                },
            },
            missionImpact: {
                description:
                    'Combined mission and public well-being impact for this deployment ' +
                    '(SSVC Mission and Well-Being Impact v1.0.0).',
                values: ['low', 'medium', 'high'] as const,
                displayLabels: {
                    low: 'Low',
                    medium: 'Medium',
                    high: 'High',
                },
            },
        },
        table: [...CISA_COORDINATOR_2_0_3_TABLE],
    };

    return CisaFrameworkPayloadSchema.parse(payload);
}
