import { describe, it, expect } from '@jest/globals';
import { ToolMessage } from '@langchain/core/messages';

import { compileAdviceGenerationFinalAnswer } from '../../../../src/agents/agent-graphs/advice-generation-agent/nodes/compile-result.js';

describe('compileAdviceGenerationFinalAnswer', () => {
    it('extracts content from the finish tool message', () => {
        const answer = compileAdviceGenerationFinalAnswer([
            new ToolMessage({ content: 'db row', tool_call_id: '1', name: 'get_image_cve' }),
            new ToolMessage({
                content: 'Draft image-CVE advice.',
                tool_call_id: '2',
                name: 'finish',
            }),
        ]);

        expect(answer).toBe('Draft image-CVE advice.');
    });

    it('prefers finish over lookup_ssvc_cisa_outcome when both are present', () => {
        const answer = compileAdviceGenerationFinalAnswer([
            new ToolMessage({ content: 'db row', tool_call_id: '1', name: 'get_image_cve' }),
            new ToolMessage({
                content: '{"rowIndex":24,"outcome":"Track"}',
                tool_call_id: '2',
                name: 'lookup_ssvc_cisa_outcome',
            }),
            new ToolMessage({
                content: 'SSVC outcome: Track — deployer advice prose.',
                tool_call_id: '3',
                name: 'finish',
            }),
        ]);

        expect(answer).toBe('SSVC outcome: Track — deployer advice prose.');
    });

    it('falls back to the last tool message when finish is missing', () => {
        const answer = compileAdviceGenerationFinalAnswer([
            new ToolMessage({ content: 'partial', tool_call_id: '1', name: 'get_cve' }),
        ]);

        expect(answer).toBe('partial');
    });

    it('returns an error when there are no tool messages', () => {
        expect(compileAdviceGenerationFinalAnswer([])).toContain('ERROR:');
    });
});
