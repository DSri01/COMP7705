import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { buildCisaFrameworkPayload } from '../../../ssvc/cisa/framework.js';

const GetSsvcCisaFrameworkInputSchema = z.object({});

/**
 * Returns the CISA SSVC deployer framework: outcome definitions, four input dimensions,
 * and the full 36-row `cisa_coordinator_2_0_3` table.
 */
export function getSsvcCisaFrameworkHandler(): string {
    return JSON.stringify(buildCisaFrameworkPayload(), null, 2);
}

/** LangChain `get_ssvc_cisa_framework` tool — advice-generation agent only. */
export function createGetSsvcCisaFrameworkTool(): StructuredTool<
    typeof GetSsvcCisaFrameworkInputSchema
> {
    return tool(getSsvcCisaFrameworkHandler, {
        name: 'get_ssvc_cisa_framework',
        description:
            'Get the CISA SSVC deployer framework: outcome labels (Track, Track*, Attend, Act), ' +
            'definitions for exploitation / automatable / technical impact / mission impact, ' +
            'and the full 36-row cisa_coordinator_2_0_3 decision table. Call once when SSVC input ' +
            'definitions or the table are needed before setting lookup inputs.',
        schema: GetSsvcCisaFrameworkInputSchema,
    });
}
