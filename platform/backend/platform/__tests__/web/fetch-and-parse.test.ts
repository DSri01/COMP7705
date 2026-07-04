import { describe, beforeEach, expect, it, jest } from '@jest/globals';

import {
    fetchAndParseResultToJsonPayload,
    fetchAndParseWebPage,
} from '../../src/web/fetch-and-parse.js';

jest.mock('../../src/utils/time.js', () => {
    const actual = jest.requireActual<typeof import('../../src/utils/time.js')>(
        '../../src/utils/time.js',
    );
    return {
        ...actual,
        getCurrentTimeUnixSeconds: jest.fn(),
    };
});

import { getCurrentTimeUnixSeconds } from '../../src/utils/time.js';

const getCurrentTimeUnixSecondsMock = jest.mocked(getCurrentTimeUnixSeconds);

describe('fetchAndParseWebPage', () => {
    beforeEach(() => {
        getCurrentTimeUnixSecondsMock.mockReturnValue(1_746_724_800n);
    });

    it('orchestrates fetch and parse with a single timestamp', async () => {
        const html = '<html><head><title>Advisory</title></head><body><h1>Hi</h1></body></html>';
        const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
            new Response(html, { status: 200 }),
        );

        const result = await fetchAndParseWebPage('https://example.com/advisory', {
            fetchImpl,
            getCurrentTimeUnixSeconds: getCurrentTimeUnixSecondsMock,
        });

        expect(getCurrentTimeUnixSecondsMock).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            ok: true,
            url: 'https://example.com/advisory',
            title: 'Advisory — https://example.com/advisory — fetched at: 2025-05-08T17:20:00Z',
            fetchedAtUnixSeconds: 1_746_724_800n,
        });
        if (result.ok) {
            expect(result.content).toContain('# Hi');
            expect(result.content).toContain('> **Fetched at:** 2025-05-08T17:20:00Z');
        }
    });

    it('propagates fetch failures', async () => {
        const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
            new Response('err', { status: 500, statusText: 'Internal Server Error' }),
        );

        const result = await fetchAndParseWebPage('https://example.com/fail', { fetchImpl });
        expect(result).toEqual({
            ok: false,
            error: 'HTTP 500 Internal Server Error for https://example.com/fail',
        });
    });

    it('fetchAndParseResultToJsonPayload stringifies unix seconds', () => {
        const payload = fetchAndParseResultToJsonPayload({
            ok: true,
            url: 'https://example.com',
            title: 'T',
            content: 'body',
            fetchedAtUnixSeconds: 99n,
        });
        expect(payload.fetchedAtUnixSeconds).toBe('99');
    });
});
