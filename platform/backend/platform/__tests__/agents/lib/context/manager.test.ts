import { describe, it, expect } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { AgentContextManager } from '../../../../src/agents/lib/context/manager.js';
import { maxStoredPayloadChars } from '../../../../src/agents/lib/context/format.js';
import type { ContextManagerConfig } from '../../../../src/agents/lib/context/types.js';

const testConfig: ContextManagerConfig = {
    keepLastEvents: 2,
    compactAboveChars: 500,
    summaryMaxChars: 200,
    maxEventChars: 100,
    maxReadRangeChars: 50,
    workingAreaMaxChars: 300,
    allowManualCompact: true,
    criticalToolNames: ['finish'],
    noTruncateToolNames: [],
    truncateToolNames: ['read_context_range', 'calculate'],
    debugLog: false,
};

describe('AgentContextManager', () => {
    it('truncates long tool results when recording', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const threadId = 't1';
        manager.setActiveSession(threadId);
        manager.recordNewMessages(threadId, [
            new ToolMessage({
                content: 'x'.repeat(500),
                tool_call_id: '1',
                name: 'read_context_range',
            }),
        ]);
        const state = manager.getOrCreate(threadId);
        expect(state.truncateCount).toBe(1);
        expect(state.recentEvents[0]!.content).toContain('truncated');
    });

    it('compacts older events when over threshold', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const threadId = 't2';
        manager.recordNewMessages(threadId, [
            new AIMessage('step 1'),
            new ToolMessage({ content: 'a'.repeat(400), tool_call_id: '1', name: 'calculate' }),
            new AIMessage('step 2'),
            new ToolMessage({ content: 'b'.repeat(400), tool_call_id: '2', name: 'calculate' }),
        ]);
        const result = manager.compact(threadId, true);
        expect(result.compacted).toBe(true);
        expect(manager.getOrCreate(threadId).recentEvents.length).toBeLessThanOrEqual(3);
        expect(manager.getOrCreate(threadId).summary.length).toBeGreaterThan(0);
    });

    it('does not truncate finish when listed in noTruncateToolNames', () => {
        const manager = new AgentContextManager(
            { ...testConfig, noTruncateToolNames: ['finish'] },
            'test-agent',
        );
        const threadId = 't-finish';
        manager.recordNewMessages(threadId, [
            new ToolMessage({
                content: 'full answer '.repeat(50),
                tool_call_id: '1',
                name: 'finish',
            }),
        ]);
        const state = manager.getOrCreate(threadId);
        expect(state.truncateCount).toBe(0);
        expect(state.recentEvents[0]!.content).not.toContain('truncated');
    });

    it('working area line remove and append', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        manager.setActiveSession('t3');
        manager.appendWorkingLines(['line A', 'line B', 'line C']);
        manager.removeWorkingLines(2, 2);
        const view = manager.viewWorkingArea();
        expect(view).toContain('line A');
        expect(view).toContain('line C');
        expect(view).not.toContain('line B');
    });

    it('working area keep_only and replace', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        manager.setActiveSession('t4');
        manager.appendWorkingLines(['a', 'b', 'c', 'd']);
        manager.keepOnlyWorkingLines(2, 3);
        expect(manager.viewWorkingArea()).toContain('b');
        expect(manager.viewWorkingArea()).not.toContain('a');
        manager.replaceWorkingLines(['only']);
        expect(manager.viewWorkingArea()).toContain('only');
    });

    it('prompt sections include limits line', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const sections = manager.buildPromptSections('t5');
        expect(sections.limitsLine).toContain('maxReadRangeChars=50');
        expect(sections.limitsLine).toContain('maxEventChars=100');
    });

    it('viewWorkingArea caps tool output but prompt sections keep full notebook', () => {
        const manager = new AgentContextManager(
            { ...testConfig, maxEventChars: 120, workingAreaMaxChars: 400 },
            'test-agent',
        );
        manager.setActiveSession('t6');
        manager.appendWorkingLines([`line ${'y'.repeat(200)}`, `line ${'z'.repeat(200)}`]);
        const view = manager.viewWorkingArea();
        expect(view.length).toBeLessThanOrEqual(maxStoredPayloadChars(120));
        expect(view).toContain('Context: working area');
        const sections = manager.buildPromptSections('t6');
        expect(sections.workingArea.length).toBeGreaterThan(view.length);
    });

    it('beginTurn clears recentEvents and summary but keeps working area', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const threadId = 't-begin-turn';
        manager.setActiveSession(threadId);
        manager.appendWorkingLines(['projectId=abc', 'cveId=CVE-2024-1']);
        manager.recordNewMessages(threadId, [
            new AIMessage('step 1'),
            new ToolMessage({ content: 'a'.repeat(400), tool_call_id: '1', name: 'calculate' }),
            new AIMessage('step 2'),
            new ToolMessage({ content: 'ERROR: not found', tool_call_id: '2', name: 'get_cve' }),
        ]);
        const compactResult = manager.compact(threadId, true);
        expect(compactResult.compacted).toBe(true);
        expect(manager.getOrCreate(threadId).summary.length).toBeGreaterThan(0);

        manager.beginTurn(threadId);

        expect(manager.getRecentEvents(threadId)).toEqual([]);
        expect(manager.getOrCreate(threadId).summary).toBe('');
        expect(manager.getOrCreate(threadId).compactCount).toBe(0);
        expect(manager.viewWorkingArea()).toContain('projectId=abc');
        expect(manager.toolMessagesForLlm(threadId)).toEqual([]);
    });

    it('beginTurn leaves a fresh window for the next tool loop in the same thread', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const threadId = 't-turn-two';
        manager.recordNewMessages(threadId, [
            new ToolMessage({ content: 'stale', tool_call_id: '1', name: 'list_projects' }),
        ]);
        manager.beginTurn(threadId);
        manager.recordNewMessages(threadId, [
            new ToolMessage({ content: 'fresh', tool_call_id: '2', name: 'finish' }),
        ]);

        const events = manager.getRecentEvents(threadId);
        expect(events).toHaveLength(1);
        expect(events[0]!.content).toContain('fresh');
        expect(events[0]!.content).not.toContain('stale');
    });

    it('retains critical tool events during compact', () => {
        const manager = new AgentContextManager(testConfig, 'test-agent');
        const threadId = 't-critical';
        manager.recordNewMessages(threadId, [
            new ToolMessage({ content: 'a'.repeat(400), tool_call_id: '2', name: 'calculate' }),
            new ToolMessage({ content: 'b'.repeat(400), tool_call_id: '3', name: 'calculate' }),
            new ToolMessage({ content: 'c'.repeat(400), tool_call_id: '4', name: 'calculate' }),
            new ToolMessage({ content: 'saved', tool_call_id: '1', name: 'finish' }),
        ]);
        manager.compact(threadId, true);
        const names = manager.getRecentEvents(threadId).map((e) => e.toolName);
        expect(names).toContain('finish');
    });
});
