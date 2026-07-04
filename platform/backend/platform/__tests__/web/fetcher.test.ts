import { describe, expect, it, jest } from '@jest/globals';

import { WEB_FETCH_USER_AGENT } from '../../src/web/constants.js';
import { fetchUrl } from '../../src/web/fetcher/definition.js';

describe('web fetcher', () => {
    it('rejects non-https URLs', async () => {
        const result = await fetchUrl({ url: 'http://example.com' });
        expect(result).toEqual({ ok: false, error: 'Only https:// URLs are allowed' });
    });

    it('rejects invalid URLs', async () => {
        const result = await fetchUrl({ url: 'not-a-url' });
        expect(result).toEqual({ ok: false, error: 'Invalid URL: not-a-url' });
    });

    it('returns html on HTTP 200 with User-Agent header', async () => {
        const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
            new Response('<html><title>T</title><body>Hi</body></html>', { status: 200 }),
        );

        const result = await fetchUrl(
            { url: 'https://example.com/path' },
            { fetchImpl },
        );

        expect(result).toEqual({
            ok: true,
            url: 'https://example.com/path',
            html: '<html><title>T</title><body>Hi</body></html>',
        });
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://example.com/path',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Agent': WEB_FETCH_USER_AGENT,
                }),
            }),
        );
    });

    it('surfaces HTTP errors', async () => {
        const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
            new Response('Not Found', { status: 404, statusText: 'Not Found' }),
        );

        const result = await fetchUrl({ url: 'https://example.com/missing' }, { fetchImpl });
        expect(result).toEqual({
            ok: false,
            error: 'HTTP 404 Not Found for https://example.com/missing',
        });
    });
});
