import { describe, it, expect } from '@jest/globals';

import {
    convertUnixTimeHandler,
    convertUnixTimeTool,
    formatTime,
    parseHumanUtcTime,
    parseUnixSeconds,
} from '../../../../src/agents/tool-registry/general/convert-unix-time.js';

describe('convert_unix_time', () => {
    const sampleUnixSeconds = '1780558730';
    const sampleHuman = formatTime(parseUnixSeconds(sampleUnixSeconds));

    it('parseUnixSeconds and formatTime match dashboard time utils', () => {
        expect(sampleHuman).toBe('2026-06-04 07:38:50');
    });

    it('unix_to_human converts platform timestamp strings', () => {
        expect(
            convertUnixTimeHandler({ direction: 'unix_to_human', value: '1780627145' }),
        ).toBe('2026-06-05 02:39:05');
    });

    it('human_to_unix converts formatTime output back to unix seconds', () => {
        expect(convertUnixTimeHandler({ direction: 'human_to_unix', value: sampleHuman })).toBe(
            sampleUnixSeconds,
        );
        expect(parseHumanUtcTime(sampleHuman).getTime()).toBe(
            parseUnixSeconds(sampleUnixSeconds).getTime(),
        );
    });

    it('human_to_unix accepts ISO-8601', () => {
        expect(
            convertUnixTimeHandler({
                direction: 'human_to_unix',
                value: '2026-06-04T07:38:50.000Z',
            }),
        ).toBe(sampleUnixSeconds);
    });

    it('returns ERROR for invalid unix seconds', () => {
        expect(convertUnixTimeHandler({ direction: 'unix_to_human', value: 'not-a-number' })).toMatch(
            /^ERROR:/,
        );
    });

    it('returns ERROR for invalid human time', () => {
        expect(convertUnixTimeHandler({ direction: 'human_to_unix', value: 'yesterday' })).toMatch(
            /^ERROR:/,
        );
    });

    it('convertUnixTimeTool invokes handler via LangChain', async () => {
        const result = await convertUnixTimeTool.invoke({
            direction: 'unix_to_human',
            value: sampleUnixSeconds,
        });
        expect(result).toBe(sampleHuman);
    });
});
