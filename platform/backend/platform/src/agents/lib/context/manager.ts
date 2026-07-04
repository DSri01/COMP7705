import { BaseMessage } from '@langchain/core/messages';
import type { Logger } from 'pino';
import { getContextLogger } from '../loggers/context-logger.js';
import type { ContextEvent, ContextManagerConfig, ContextPromptSections, ContextSessionState } from './types.js';
import { compactSession, logCompaction } from './compact.js';
import { formatWorkingAreaViewResponse } from './format.js';
import {
    eventsToMessages,
    logAiToolCalls,
    logToolIngestFromMessages,
    messageToEvents,
} from './message-bridge.js';
import {
    appendWorkingLines as applyAppendWorkingLines,
    buildContextPromptSections,
    formatWorkingAreaBody,
    keepOnlyWorkingLines as applyKeepOnlyWorkingLines,
    removeWorkingLines as applyRemoveWorkingLines,
    replaceWorkingLines as applyReplaceWorkingLines,
    setWorkingSummary as applySetWorkingSummary,
} from './prompt.js';

export { appendContextToPrompt, PROMPT_SECTION_HEADERS } from './prompt.js';

function emptySession(): ContextSessionState {
    return {
        summary: '',
        workingAreaLines: [],
        workingAreaHeader: '',
        recentEvents: [],
        compactCount: 0,
        truncateCount: 0,
    };
}

/**
 * Per-agent session store keyed by `agentId:threadId`.
 * Recent tool-loop window, folded summary, and working-area notebook.
 */
export class AgentContextManager {
    private readonly sessions = new Map<string, ContextSessionState>();
    private activeSessionKey: string | null = null;
    private readonly logger: Logger;

    constructor(
        readonly config: ContextManagerConfig,
        readonly agentId: string,
    ) {
        this.logger = config.logger ?? getContextLogger();
    }

    sessionKey(threadId: string): string {
        return `${this.agentId}:${threadId}`;
    }

    setActiveSession(threadId: string): void {
        this.activeSessionKey = this.sessionKey(threadId);
        if (!this.sessions.has(this.activeSessionKey)) {
            this.sessions.set(this.activeSessionKey, emptySession());
        }
    }

    getActiveThreadId(): string | null {
        if (!this.activeSessionKey) {
            return null;
        }
        const colon = this.activeSessionKey.indexOf(':');
        return colon >= 0 ? this.activeSessionKey.slice(colon + 1) : this.activeSessionKey;
    }

    requireActiveSession(): ContextSessionState {
        if (!this.activeSessionKey) {
            throw new Error('No active context session');
        }
        const state = this.sessions.get(this.activeSessionKey);
        if (!state) {
            throw new Error('Context session missing');
        }
        return state;
    }

    getOrCreate(threadId: string): ContextSessionState {
        const key = this.sessionKey(threadId);
        let state = this.sessions.get(key);
        if (!state) {
            state = emptySession();
            this.sessions.set(key, state);
        }
        return state;
    }

    /**
     * Start a new user turn: clear tool-loop replay for the LLM, keep the working-area notebook.
     * Call once before each graph invocation (HTTP runTurn, CLI message, etc.).
     */
    beginTurn(threadId: string): void {
        const state = this.getOrCreate(threadId);
        state.recentEvents = [];
        state.summary = '';
        state.compactCount = 0;
    }

    buildPromptSections(threadId: string, pinnedLines: string[] = []): ContextPromptSections {
        return buildContextPromptSections(this.getOrCreate(threadId), this.config, pinnedLines);
    }

    appendWorkingLines(lines: string[]): void {
        applyAppendWorkingLines(this.requireActiveSession(), this.config, lines);
    }

    keepOnlyWorkingLines(startLine: number, endLine: number): string {
        return applyKeepOnlyWorkingLines(this.requireActiveSession(), startLine, endLine);
    }

    replaceWorkingLines(lines: string[]): string {
        return applyReplaceWorkingLines(this.requireActiveSession(), this.config, lines);
    }

    removeWorkingLines(startLine: number, endLine: number): string {
        return applyRemoveWorkingLines(this.requireActiveSession(), startLine, endLine);
    }

    setWorkingSummary(text: string): string {
        return applySetWorkingSummary(this.requireActiveSession(), this.config, text);
    }

    viewWorkingArea(): string {
        const threadId = this.getActiveThreadId();
        if (!threadId) {
            return '(no active session)';
        }
        const full = formatWorkingAreaBody(this.getOrCreate(threadId));
        return formatWorkingAreaViewResponse(full, this.config.maxEventChars);
    }

    recordNewMessages(threadId: string, newMessages: BaseMessage[]): void {
        if (newMessages.length === 0) {
            return;
        }
        const state = this.getOrCreate(threadId);
        const meta = { agentId: this.agentId, threadId };

        logAiToolCalls(this.logger, meta, newMessages, this.config.debugLog);
        logToolIngestFromMessages(this.logger, meta, newMessages, this.config);

        const { events, truncatedToolCount } = messageToEvents(newMessages, this.config);
        state.truncateCount += truncatedToolCount;
        state.recentEvents.push(...events);
    }

    compact(threadId: string, force = false): { compacted: boolean; foldedCount: number } {
        const state = this.getOrCreate(threadId);
        const sections = this.buildPromptSections(threadId);
        const result = compactSession(
            state,
            this.config,
            [
                sections.pinned,
                sections.workingArea,
                sections.sessionSummary,
                ...state.recentEvents.map((e) => e.content),
            ],
            force,
        );

        if (result.compacted) {
            logCompaction(
                this.logger,
                { agentId: this.agentId, threadId },
                state,
                result.foldedCount,
                this.config.debugLog,
            );
        }

        return result;
    }

    toolMessagesForLlm(threadId: string): BaseMessage[] {
        this.compact(threadId, false);
        return eventsToMessages(this.getOrCreate(threadId).recentEvents);
    }

    getRecentEvents(threadId: string): ContextEvent[] {
        return [...this.getOrCreate(threadId).recentEvents];
    }
}

export function createAgentContextManager(
    agentId: string,
    config: ContextManagerConfig,
): AgentContextManager {
    const logger = config.logger ?? getContextLogger();
    if (config.debugLog) {
        logger.info(
            {
                agentId,
                keepLastEvents: config.keepLastEvents,
                compactAboveChars: config.compactAboveChars,
                summaryMaxChars: config.summaryMaxChars,
                maxEventChars: config.maxEventChars,
                maxReadRangeChars: config.maxReadRangeChars,
                workingAreaMaxChars: config.workingAreaMaxChars,
            },
            'context manager limits',
        );
    }
    return new AgentContextManager({ ...config, logger }, agentId);
}
