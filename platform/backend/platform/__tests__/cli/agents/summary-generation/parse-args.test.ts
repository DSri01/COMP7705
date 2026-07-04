import { describe, it, expect } from '@jest/globals';

import { parseSummaryGenerationCliArgs } from '../../../../src/cli/agents/summary-generation/parse-args.js';

describe('parseSummaryGenerationCliArgs', () => {
    it('parses cve id and context', () => {
        const args = parseSummaryGenerationCliArgs([
            '--cve-id',
            'CVE-2024-12345',
            '--context',
            'focus on k8s',
            '--context-debug',
        ]);

        expect(args).toEqual({
            cveId: 'CVE-2024-12345',
            additionalContext: 'focus on k8s',
            contextDebug: true,
            showHelp: false,
        });
    });

    it('sets showHelp for -h', () => {
        expect(parseSummaryGenerationCliArgs(['-h']).showHelp).toBe(true);
    });
});
