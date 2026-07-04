import { test, expect, describe } from '@jest/globals';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

import {
    assertToolCapableLlm,
    isToolCapableLlm,
} from '../../../src/agents/utils/assert-tool-capable-llm.js';

function asBaseChatModel(value: object): BaseChatModel {
    return value as unknown as BaseChatModel;
}

describe('assertToolCapableLlm', () => {
    test('isToolCapableLlm returns false when bindTools is missing', () => {
        expect(isToolCapableLlm(asBaseChatModel({}))).toBe(false);
    });

    test('isToolCapableLlm returns true when bindTools is a function', () => {
        expect(isToolCapableLlm(asBaseChatModel({ bindTools: () => ({}) }))).toBe(true);
    });

    test('assertToolCapableLlm throws when bindTools is missing', () => {
        expect(() => assertToolCapableLlm(asBaseChatModel({}))).toThrow(/does not support bindTools/);
    });

    test('assertToolCapableLlm does not throw when bindTools exists', () => {
        expect(() => assertToolCapableLlm(asBaseChatModel({ bindTools: () => ({}) }))).not.toThrow();
    });
});
