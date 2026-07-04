import type { Logger } from 'pino';

/**
 * Option B context limits for the sample-agents context manager.
 *
 * Wired once per agent at bootstrap (`createAgentContextManager(agentId, config)` in `index.ts`).
 * Tool descriptions, prompt guidance, read clamps, and ingest truncation all read these fields —
 * do not duplicate limit numbers in tool handler code.
 *
 * @see `docs/agents-and-context-plan.md`
 * @see {@link CONSERVATIVE_CONTEXT_CONFIG} default for manual QA
 * @see {@link PLATFORM_CONTEXT_CONFIG} optional production-like budgets
 */
export interface ContextManagerConfig {
    /** Number of latest tool-loop events kept verbatim after compaction. */
    keepLastEvents: number;
    /** Auto-compact when estimated prompt size (chars) exceeds this threshold. */
    compactAboveChars: number;
    /** Maximum length of the running session summary blob. */
    summaryMaxChars: number;
    /** Per tool-result cap before an event is stored in the recent window. */
    maxEventChars: number;
    /**
     * Maximum characters returned by `read_context_range` per call (tool-level clamp).
     * Should be ≤ {@link maxEventChars} so reads are not truncated again on ingest.
     */
    maxReadRangeChars: number;
    /** Maximum total size of the mutable working-area notebook. */
    workingAreaMaxChars: number;
    /** When false, the `compact_context` tool is not registered. */
    allowManualCompact: boolean;
    /** Tool names whose events are retained in the recent window during compaction. */
    criticalToolNames: string[];
    /**
     * Tool names never truncated when recording events.
     * Always takes priority over {@link truncateToolNames} (a name in both lists is not truncated).
     */
    noTruncateToolNames: string[];
    /**
     * When set, only these tool names are truncated at ingest.
     * When omitted, all tools are eligible except {@link noTruncateToolNames}.
     */
    truncateToolNames?: string[];
    /** Log compaction, truncation, and tool ingest via pino (`context` logger) when true. */
    debugLog: boolean;
    /** Override pino logger (defaults to {@link getContextLogger}). */
    logger?: Logger;
}

/** Serializable snapshot of one assistant or tool step in the recent window. */
export interface ContextEvent {
    kind: 'ai' | 'tool';
    /** Present when {@link ContextEvent.kind} is `tool`. */
    toolName?: string;
    content: string;
    recordedAt: string;
}

/** In-memory session state keyed by `agentId:threadId`. */
export interface ContextSessionState {
    /** Compressed narrative of folded older tool history. */
    summary: string;
    /** Mutable notebook lines (numbered when shown to the model). */
    workingAreaLines: string[];
    /** Optional header above working-area lines (task notes). */
    workingAreaHeader: string;
    /** Sliding window of recent tool-loop events. */
    recentEvents: ContextEvent[];
    /** How many compaction passes have run for this session. */
    compactCount: number;
    /** How many individual tool results were truncated on ingest. */
    truncateCount: number;
}

/** Sections injected into the tool_actor system prompt. */
export interface ContextPromptSections {
    pinned: string;
    workingArea: string;
    sessionSummary: string;
    limitsLine: string;
    statsLine: string;
}
