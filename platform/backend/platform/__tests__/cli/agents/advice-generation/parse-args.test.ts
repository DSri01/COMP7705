import { describe, it, expect } from '@jest/globals';

import { parseAdviceGenerationCliArgs } from '../../../../src/cli/agents/advice-generation/parse-args.js';

describe('parseAdviceGenerationCliArgs', () => {
    it('parses required scope and optional context', () => {
        const args = parseAdviceGenerationCliArgs([
            '--project-id',
            '11111111-1111-4111-8111-111111111111',
            '--component-id',
            '22222222-2222-4222-8222-222222222222',
            '--cve-id',
            'CVE-2024-00001',
            '--context',
            'notes',
            '--context-debug',
        ]);

        expect(args).toEqual({
            projectId: '11111111-1111-4111-8111-111111111111',
            componentId: '22222222-2222-4222-8222-222222222222',
            cveId: 'CVE-2024-00001',
            additionalContext: 'notes',
            contextDebug: true,
            showHelp: false,
        });
    });

    it('sets showHelp for -h', () => {
        expect(parseAdviceGenerationCliArgs(['-h']).showHelp).toBe(true);
    });
});
