import { NotFoundException } from '@nestjs/common';
import { test, expect, describe, jest } from '@jest/globals';

import { AdviceGenerationTurnBudget } from '../../../../src/agents/agent-graphs/advice-generation-agent/turn-budget.js';
import { createCallAdviceGenerationTool } from '../../../../src/agents/tool-registry/subagents/call-advice-generation.js';

const projectId = '11111111-1111-4111-8111-111111111111';
const componentId = '22222222-2222-4222-8222-222222222222';
const cveId = 'CVE-2024-00001';
const imageCveId = '33333333-3333-4333-8333-333333333333';

function dbToolsWithImageCves(imageCves: { imageCveId: string; cveId: string }[]) {
    return {
        imageCvesService: {
            list: async () => ({ imageCves }),
        },
    } as never;
}

describe('call_advice_generation_agent', () => {
    test('pre-validates image CVE row and returns error when missing', async () => {
        const invoke = jest.fn();
        const contextManager = {
            beginTurn: jest.fn(),
            getActiveThreadId: () => 'inner',
        };
        const turnBudget = new AdviceGenerationTurnBudget();

        const tool = createCallAdviceGenerationTool(
            { invoke } as never,
            dbToolsWithImageCves([]),
            { contextManager: contextManager as never, turnBudget },
        );

        const answer = await tool.invoke({ projectId, componentId, cveId });

        expect(answer).toContain('ERROR:');
        expect(invoke).not.toHaveBeenCalled();
    });

    test('returns service error when list throws NotFoundException', async () => {
        const tool = createCallAdviceGenerationTool(
            { invoke: jest.fn() } as never,
            {
                imageCvesService: {
                    list: async () => {
                        throw new NotFoundException('Component not found');
                    },
                },
            } as never,
            {
                contextManager: { beginTurn: () => undefined } as never,
                turnBudget: new AdviceGenerationTurnBudget(),
            },
        );

        const answer = await tool.invoke({ projectId, componentId, cveId });

        expect(answer).toBe('ERROR: Component not found');
    });

    test('invokes advice agent with fresh inner thread and returns finalAnswer', async () => {
        const invoke = jest
            .fn<() => Promise<{ finalAnswer: string | null }>>()
            .mockResolvedValue({ finalAnswer: 'Draft advice text.' });
        const beginTurn = jest.fn();
        const contextManager = {
            beginTurn,
            getActiveThreadId: () => 'advice-generation-test',
        };
        const turnBudget = new AdviceGenerationTurnBudget();
        const beginTurnBudgetSpy = jest.spyOn(turnBudget, 'beginTurn');
        const endTurnSpy = jest.spyOn(turnBudget, 'endTurn');

        const tool = createCallAdviceGenerationTool(
            { invoke } as never,
            dbToolsWithImageCves([{ imageCveId, cveId }]),
            { contextManager: contextManager as never, turnBudget },
        );

        const answer = await tool.invoke({
            projectId,
            componentId,
            cveId,
            additionalContext: 'Focus on mitigations.',
        });

        expect(answer).toBe('Draft advice text.');
        expect(beginTurn).toHaveBeenCalledWith(expect.stringMatching(/^advice-generation-/));
        expect(beginTurnBudgetSpy).toHaveBeenCalledWith(expect.stringMatching(/^advice-generation-/));
        expect(invoke).toHaveBeenCalledWith(
            {
                projectId,
                componentId,
                cveId,
                imageCveId,
                additionalContext: 'Focus on mitigations.',
                toolMessages: [],
            },
            expect.objectContaining({
                recursionLimit: 50,
                configurable: expect.objectContaining({
                    thread_id: expect.stringMatching(/^advice-generation-/),
                }),
            }),
        );
        expect(endTurnSpy).toHaveBeenCalled();
    });

    test('returns error string when finalAnswer is missing', async () => {
        const tool = createCallAdviceGenerationTool(
            {
                invoke: async () => ({ finalAnswer: null }),
            } as never,
            dbToolsWithImageCves([{ imageCveId, cveId }]),
            {
                contextManager: { beginTurn: () => undefined } as never,
                turnBudget: new AdviceGenerationTurnBudget(),
            },
        );

        const answer = await tool.invoke({ projectId, componentId, cveId });

        expect(answer).toBe('ERROR: advice generation did not produce a draft.');
    });
});
