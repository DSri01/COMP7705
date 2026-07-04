import { TurnToolBudget } from '../../lib/turn-budget/index.js';

/** Max tool_actor LLM rounds per advice-generation invocation. */
export const ADVICE_GENERATION_MAX_TOOL_ITERATIONS = 25;

/** Per-task caps (subset of platform-assistant; no web tools). */
export const ADVICE_GENERATION_TURN_TOOL_LIMITS = {
    get_cve_research_document: 15,
} as const;

export type AdviceGenerationBudgetedToolName = keyof typeof ADVICE_GENERATION_TURN_TOOL_LIMITS;

/** Per inner-thread tool budget for advice-generation-agent (fresh on each call_* invoke). */
export class AdviceGenerationTurnBudget extends TurnToolBudget<AdviceGenerationBudgetedToolName> {
    constructor() {
        super({
            toolLimits: ADVICE_GENERATION_TURN_TOOL_LIMITS,
            maxToolIterations: ADVICE_GENERATION_MAX_TOOL_ITERATIONS,
            scopeLabel: 'advice generation task',
        });
    }
}
