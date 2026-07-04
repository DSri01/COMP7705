import { describe, it, expect } from '@jest/globals';
import { ToolMessage } from '@langchain/core/messages';

import { compileSummaryGenerationFinalAnswer } from '../../../../src/agents/agent-graphs/summary-generation-agent/nodes/compile-result.js';

describe('compileSummaryGenerationFinalAnswer', () => {
    it('extracts content from the finish tool message', () => {
        const answer = compileSummaryGenerationFinalAnswer([
            new ToolMessage({ content: 'db row', tool_call_id: '1', name: 'get_cve' }),
            new ToolMessage({
                content: 'Draft CVE summary.',
                tool_call_id: '2',
                name: 'finish',
            }),
        ]);

        expect(answer).toBe('Draft CVE summary.');
    });

    it('falls back to the last tool message when finish is missing', () => {
        const answer = compileSummaryGenerationFinalAnswer([
            new ToolMessage({ content: 'partial', tool_call_id: '1', name: 'get_cve' }),
        ]);

        expect(answer).toBe('partial');
    });

    it('returns an error when there are no tool messages', () => {
        expect(compileSummaryGenerationFinalAnswer([])).toContain('ERROR:');
    });
});
