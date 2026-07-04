import { TurnToolBudget } from '../../lib/turn-budget/index.js';

/** Max tool_actor LLM rounds per summary-generation invocation. */
export const SUMMARY_GENERATION_MAX_TOOL_ITERATIONS = 25;

/** Per-task caps (subset of platform-assistant; no web tools). */
export const SUMMARY_GENERATION_TURN_TOOL_LIMITS = {
    get_cve_research_document: 15,
} as const;

export type SummaryGenerationBudgetedToolName = keyof typeof SUMMARY_GENERATION_TURN_TOOL_LIMITS;

/** Per inner-thread tool budget for summary-generation-agent (fresh on each call_* invoke). */
export class SummaryGenerationTurnBudget extends TurnToolBudget<SummaryGenerationBudgetedToolName> {
    constructor() {
        super({
            toolLimits: SUMMARY_GENERATION_TURN_TOOL_LIMITS,
            maxToolIterations: SUMMARY_GENERATION_MAX_TOOL_ITERATIONS,
            scopeLabel: 'summary generation task',
        });
    }
}
