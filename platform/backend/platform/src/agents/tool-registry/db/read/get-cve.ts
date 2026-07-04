import { BadRequestException, NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { getCve, serializeCve } from '../../../../platform-read-tools/read/get-cve.js';
import { CveIdSchema } from '../schemas/cve-id.js';
import type { PlatformDbToolContext } from '../context.js';

const GetCveInputSchema = z.object({
    cveId: CveIdSchema,
});

export type GetCveInput = z.infer<typeof GetCveInputSchema>;

export { cveToResponsePayload } from '../../../../platform-read-tools/read/get-cve.js';

/**
 * Agent adapter: global CVE read as JSON string or `ERROR: …` for the model.
 */
export async function getCveDbHandler(
    ctx: PlatformDbToolContext,
    args: GetCveInput,
): Promise<string> {
    try {
        const cve = await getCve(ctx, args);
        return serializeCve(cve);
    } catch (e) {
        if (e instanceof NotFoundException || e instanceof BadRequestException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_cve` tool. Tool name: `get_cve`. */
export function createGetCveTool(ctx: PlatformDbToolContext): StructuredTool<typeof GetCveInputSchema> {
    return tool(async (args) => getCveDbHandler(ctx, args), {
        name: 'get_cve',
        description:
            'Get global CVE record by id (severity, intel highlights, intel timestamps, researchSummary field). ' +
            'When user asks for a summary of this CVE: if researchSummary is empty call call_summary_generation_agent; ' +
            'if researchSummary has text, present the stored summary in finish (regenerate only when user asks to overwrite).',
        schema: GetCveInputSchema,
    });
}
