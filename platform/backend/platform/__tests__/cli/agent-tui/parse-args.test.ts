import { describe, expect, it } from '@jest/globals';

import {
    DEFAULT_AGENTS_BASE_URL,
    normalizeAgentsBaseUrl,
    parseAgentTuiCliArgs,
} from '../../../src/cli/agent-tui/parse-args.js';

describe('normalizeAgentsBaseUrl', () => {
    it('trims and removes trailing slashes', () => {
        expect(normalizeAgentsBaseUrl('  http://localhost:12080/api/agents/  ')).toBe(
            'http://localhost:12080/api/agents',
        );
    });
});

describe('parseAgentTuiCliArgs', () => {
    it('uses the default base URL when no flags are given', () => {
        expect(parseAgentTuiCliArgs([])).toEqual({
            baseUrl: DEFAULT_AGENTS_BASE_URL,
            showHelp: false,
        });
    });

    it('accepts --base-url', () => {
        expect(parseAgentTuiCliArgs(['--base-url', 'http://localhost:9080/agents/'])).toEqual({
            baseUrl: 'http://localhost:9080/agents',
            showHelp: false,
        });
    });

    it('accepts --base-url= form', () => {
        expect(parseAgentTuiCliArgs(['--base-url=http://127.0.0.1:12080/agents'])).toEqual({
            baseUrl: 'http://127.0.0.1:12080/agents',
            showHelp: false,
        });
    });

    it('accepts -u alias', () => {
        expect(parseAgentTuiCliArgs(['-u', 'http://localhost:12080/agents'])).toEqual({
            baseUrl: 'http://localhost:12080/agents',
            showHelp: false,
        });
    });

    it('sets showHelp for -h', () => {
        expect(parseAgentTuiCliArgs(['-h']).showHelp).toBe(true);
    });

    it('throws on unknown flags', () => {
        expect(() => parseAgentTuiCliArgs(['--verbose'])).toThrow('Unknown argument');
    });

    it('throws when --base-url has no value', () => {
        expect(() => parseAgentTuiCliArgs(['--base-url'])).toThrow('Missing value');
    });
});
