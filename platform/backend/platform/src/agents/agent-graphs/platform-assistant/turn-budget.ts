import { TurnToolBudget } from '../../lib/turn-budget/index.js';

/** Max tool_actor LLM rounds per user message before apologise. */
export const PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS = 25;

/** Per-user-request caps on successful tool invocations (platform-assistant only). */
export const PLATFORM_ASSISTANT_TURN_TOOL_LIMITS = {
    web_search: 3,
    web_fetch_url_markdown: 6,
    get_cve_research_document: 15,
} as const;

export type PlatformAssistantBudgetedToolName = keyof typeof PLATFORM_ASSISTANT_TURN_TOOL_LIMITS;

/** Per HTTP-thread tool budget for platform-assistant. */
export class PlatformAssistantTurnBudget extends TurnToolBudget<PlatformAssistantBudgetedToolName> {
    constructor() {
        super({
            toolLimits: PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
            maxToolIterations: PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS,
            scopeLabel: 'user request',
        });
    }
}
