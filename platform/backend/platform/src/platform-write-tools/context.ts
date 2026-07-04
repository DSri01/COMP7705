import type { PlatformReadToolContext } from '../platform-read-tools/context.js';

/**
 * Nest services for platform DB write tools (agent-only; no MCP).
 * Same service surface as {@link PlatformReadToolContext}.
 */
export type PlatformWriteToolContext = PlatformReadToolContext;
