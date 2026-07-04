import { NotFoundException } from '@nestjs/common';
import { test, expect, describe, jest } from '@jest/globals';

import { SummaryGenerationTurnBudget } from '../../../../src/agents/agent-graphs/summary-generation-agent/turn-budget.js';
import { createCallSummaryGenerationTool } from '../../../../src/agents/tool-registry/subagents/call-summary-generation.js';

describe('call_summary_generation_agent', () => {
    test('pre-validates CVE and returns error when missing', async () => {
        const invoke = jest.fn();
        const contextManager = {
            beginTurn: jest.fn(),
            getActiveThreadId: () => 'inner',
        };
        const turnBudget = new SummaryGenerationTurnBudget();

        const tool = createCallSummaryGenerationTool(
            { invoke } as never,
            {
                cvesService: {
                    getById: async () => {
                        throw new NotFoundException('CVE not found');
                    },
                },
            } as never,
            { contextManager: contextManager as never, turnBudget },
        );

        const answer = await tool.invoke({ cveId: 'CVE-2024-00001' });

        expect(answer).toContain('ERROR:');
        expect(invoke).not.toHaveBeenCalled();
    });

    test('invokes summary agent with fresh inner thread and returns finalAnswer', async () => {
        const invoke = jest
            .fn<() => Promise<{ finalAnswer: string | null }>>()
            .mockResolvedValue({ finalAnswer: 'Draft summary text.' });
        const beginTurn = jest.fn();
        const contextManager = {
            beginTurn,
            getActiveThreadId: () => 'summary-generation-test',
        };
        const turnBudget = new SummaryGenerationTurnBudget();
        const beginTurnBudgetSpy = jest.spyOn(turnBudget, 'beginTurn');
        const endTurnSpy = jest.spyOn(turnBudget, 'endTurn');

        const tool = createCallSummaryGenerationTool(
            { invoke } as never,
            {
                cvesService: {
                    getById: async () => ({
                        cveId: 'CVE-2024-00001',
                        severity: 'HIGH',
                        intelHighlights: '',
                        intelLastAttemptAtUnixSeconds: 0n,
                        intelUpdatedAtUnixSeconds: 0n,
                        researchSummary: '',
                    }),
                },
            } as never,
            { contextManager: contextManager as never, turnBudget },
        );

        const answer = await tool.invoke({
            cveId: 'CVE-2024-00001',
            additionalContext: 'Focus on container impact.',
        });

        expect(answer).toBe('Draft summary text.');
        expect(beginTurn).toHaveBeenCalledWith(expect.stringMatching(/^summary-generation-/));
        expect(beginTurnBudgetSpy).toHaveBeenCalledWith(expect.stringMatching(/^summary-generation-/));
        expect(invoke).toHaveBeenCalledWith(
            {
                cveId: 'CVE-2024-00001',
                additionalContext: 'Focus on container impact.',
                toolMessages: [],
            },
            expect.objectContaining({
                recursionLimit: 50,
                configurable: expect.objectContaining({
                    thread_id: expect.stringMatching(/^summary-generation-/),
                }),
            }),
        );
        expect(endTurnSpy).toHaveBeenCalled();
    });

    test('returns error string when finalAnswer is missing', async () => {
        const tool = createCallSummaryGenerationTool(
            {
                invoke: async () => ({ finalAnswer: null }),
            } as never,
            {
                cvesService: {
                    getById: async () => ({
                        cveId: 'CVE-2024-00001',
                        severity: 'HIGH',
                        intelHighlights: '',
                        intelLastAttemptAtUnixSeconds: 0n,
                        intelUpdatedAtUnixSeconds: 0n,
                        researchSummary: '',
                    }),
                },
            } as never,
            {
                contextManager: { beginTurn: () => undefined } as never,
                turnBudget: new SummaryGenerationTurnBudget(),
            },
        );

        const answer = await tool.invoke({ cveId: 'CVE-2024-00001' });

        expect(answer).toBe('ERROR: summary generation did not produce a draft.');
    });
});
