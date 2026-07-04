/**
 * Agent context management — public API.
 *
 * Bounded tool-loop history: recent event window, deterministic session summary,
 * working-area notebook. One {@link ContextManagerConfig} per agent at bootstrap.
 */

export type { ContextManagerConfig, ContextPromptSections, ContextSessionState, ContextEvent } from './types.js';

export {
    CONSERVATIVE_CONTEXT_CONFIG,
    PLATFORM_CONTEXT_CONFIG,
    derivePlatformContextConfig,
    MAX_CONTEXT_WINDOW_LENGTH,
    TOKENS_PER_CHAR,
    USABLE_CONTEXT_TOKEN_FRACTION,
    USABLE_CONTEXT_TOKEN_LENGTH,
    usableContextCharBudget,
    formatContextLimitsForTools,
    readLimitsFromConfig,
    suggestedReadSliceChars,
    type ContextLimitsSnapshot,
} from './config.js';

export { executeReadContextRange, formatReadContextRangeResponse } from './read-context-range.js';

export {
    fitJsonToMaxEventChars,
    formatGetContextLengthResponse,
    formatWorkingAreaViewResponse,
    maxStoredPayloadChars,
} from './format.js';

export { AgentContextManager, createAgentContextManager, appendContextToPrompt, PROMPT_SECTION_HEADERS } from './manager.js';

export { createContextTools } from './tools.js';
export { createContextAwareToolActorNode, type ContextAwareToolActorOptions } from './context-aware-tool-actor.js';
export { buildDocumentContextGuidance } from './document-context-guidance.js';
export { InMemoryResourceStore, seedDemoResearchDocument, sharedResourceStore } from './resource-store.js';
export { capToolEventContent, shouldTruncateToolEvent } from './truncate-policy.js';
