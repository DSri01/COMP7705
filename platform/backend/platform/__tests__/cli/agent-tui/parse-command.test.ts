import { describe, expect, it } from '@jest/globals';

import { parseCommandLine } from '../../../src/cli/agent-tui/parse-command.js';

describe('parseCommandLine', () => {
    it('parses verb and single argument', () => {
        expect(parseCommandLine('SET-AGENT platform-assistant')).toEqual({
            verb: 'SET-AGENT',
            args: ['platform-assistant'],
        });
    });

    it('strips optional brackets', () => {
        expect(parseCommandLine('[SEND] what is 12 * 3?')).toEqual({
            verb: 'SEND',
            args: ['what is 12 * 3?'],
        });
    });

    it('returns null for empty input', () => {
        expect(parseCommandLine('   ')).toBeNull();
    });
});
