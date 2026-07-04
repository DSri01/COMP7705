import type { PlatformReadToolContext } from '../../../platform-read-tools/context.js';

/**
 * Nest services injected into agent DB tools (read/write via same paths as REST/MCP).
 * Built after the application starts — see {@link AgentsModule.forAgentsAsync}.
 */
export type PlatformDbToolContext = PlatformReadToolContext;
