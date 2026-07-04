import { ApiParam } from '@nestjs/swagger';
import { AGENT_IDS } from '../../agents/manifest.js';

/**
 * Shared OpenAPI metadata for `:agentId` on `/agents/:agentId/threads` routes.
 * Enum values come from {@link ../../agents/manifest.js!AGENT_IDS}.
 */
export const ApiAgentIdParam = () =>
    ApiParam({
        name: 'agentId',
        enum: [...AGENT_IDS],
        description: 'Registered HTTP agent id (see src/agents/manifest.ts)',
    });
