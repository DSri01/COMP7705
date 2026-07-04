/** Resolves the active thread id when a budgeted tool runs (set by context-aware tool_actor). */
export type TurnBudgetThreadResolver = () => string;

export interface TurnToolBudgetConfig<T extends string> {
    toolLimits: Record<T, number>;
    maxToolIterations: number;
    /** Shown in errors and prompt sections, e.g. "user request" or "summary generation task". */
    scopeLabel: string;
}

export interface TurnToolBudgetEntry<T extends string> {
    toolName: T;
    limit: number;
    used: number;
    remaining: number;
}

/**
 * Per-thread tool usage counters for one agent invocation scope.
 * Reset via {@link beginTurn} before each graph run or subagent call.
 */
export class TurnToolBudget<T extends string> {
    private readonly usageByThread = new Map<string, Partial<Record<T, number>>>();

    constructor(private readonly config: TurnToolBudgetConfig<T>) {}

    get maxToolIterations(): number {
        return this.config.maxToolIterations;
    }

    get toolLimits(): Readonly<Record<T, number>> {
        return this.config.toolLimits;
    }

    beginTurn(threadId: string): void {
        this.usageByThread.set(threadId, {});
    }

    endTurn(threadId: string): void {
        this.usageByThread.delete(threadId);
    }

    private usageFor(threadId: string): Partial<Record<T, number>> {
        let usage = this.usageByThread.get(threadId);
        if (!usage) {
            usage = {};
            this.usageByThread.set(threadId, usage);
        }
        return usage;
    }

    /**
     * Reserves one call if under limit. Returns an ERROR string when exhausted.
     * Consumes budget at invocation time.
     */
    tryConsume(threadId: string, toolName: T): string | null {
        const limit = this.config.toolLimits[toolName];
        const usage = this.usageFor(threadId);
        const used = usage[toolName] ?? 0;
        if (used >= limit) {
            return (
                `ERROR: ${toolName} limit for this ${this.config.scopeLabel} (${used}/${limit} used; 0 calls left). ` +
                'Do not retry this tool for the rest of this scope — use list_cve_research_documents, ' +
                'existing research docs, or call finish with what you have.'
            );
        }
        usage[toolName] = used + 1;
        return null;
    }

    getSnapshot(threadId: string): TurnToolBudgetEntry<T>[] {
        return (Object.keys(this.config.toolLimits) as T[]).map((toolName) => {
            const limit = this.config.toolLimits[toolName];
            const used = this.usageFor(threadId)[toolName] ?? 0;
            return {
                toolName,
                limit,
                used,
                remaining: Math.max(0, limit - used),
            };
        });
    }

    formatPromptSection(threadId: string, currentLlmStep: number): string {
        const lines = [
            `=== Budget remaining (current ${this.config.scopeLabel}) ===`,
            `These budgets apply only while processing the current ${this.config.scopeLabel}; counters reset on the next scope.`,
            'When a tool returns a budget ERROR, do not retry that tool this scope.',
            '',
        ];

        for (const entry of this.getSnapshot(threadId)) {
            const callWord = entry.remaining === 1 ? 'call' : 'calls';
            lines.push(
                `- ${entry.toolName}: you have ${entry.remaining} ${callWord} left while processing this ${this.config.scopeLabel} (${entry.used}/${entry.limit} used)`,
            );
        }

        lines.push(
            `- Tool loop: step ${currentLlmStep} of ${this.config.maxToolIterations} — call finish once you can answer; prefer finish by step ${this.config.maxToolIterations - 5}`,
        );

        return lines.join('\n');
    }
}

/** Structural deps so one budget instance can serve multiple tool handlers. */
export type TurnToolBudgetDeps = {
    turnBudget: {
        tryConsume(threadId: string, toolName: string): string | null;
    };
    resolveThreadId: TurnBudgetThreadResolver;
};
