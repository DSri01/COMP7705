import { test, expect, describe } from '@jest/globals';

import { parsePlatformAssistantCliArgs } from '../../../../src/cli/agents/platform-assistant/parse-args.js';

describe('parsePlatformAssistantCliArgs', () => {
    test('defaults context debug off with positional message', () => {
        expect(parsePlatformAssistantCliArgs(['list my projects'])).toEqual({
            disableContext: false,
            contextDebug: false,
            argvGoal: 'list my projects',
            showHelp: false,
        });
    });

    test('records --no-context for rejection in index', () => {
        expect(parsePlatformAssistantCliArgs(['--no-context', 'hello'])).toEqual({
            disableContext: true,
            contextDebug: false,
            argvGoal: 'hello',
            showHelp: false,
        });
    });

    test('accepts --disable-context alias', () => {
        expect(parsePlatformAssistantCliArgs(['--disable-context'])).toEqual({
            disableContext: true,
            contextDebug: false,
            argvGoal: '',
            showHelp: false,
        });
    });

    test('enables context debug with --context-debug', () => {
        expect(parsePlatformAssistantCliArgs(['--context-debug'])).toEqual({
            disableContext: false,
            contextDebug: true,
            argvGoal: '',
            showHelp: false,
        });
    });

    test('accepts --debug-context alias', () => {
        expect(parsePlatformAssistantCliArgs(['--debug-context', 'hi'])).toEqual({
            disableContext: false,
            contextDebug: true,
            argvGoal: 'hi',
            showHelp: false,
        });
    });

    test('sets showHelp for -h', () => {
        expect(parsePlatformAssistantCliArgs(['-h']).showHelp).toBe(true);
    });
});
