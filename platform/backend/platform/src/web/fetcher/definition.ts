import { WEB_FETCH_TIMEOUT_MS, WEB_FETCH_USER_AGENT } from '../constants.js';
import type { FetchUrlResult } from '../types.js';

export type FetchUrlInput = {
    url: string;
};

export type FetchUrlDeps = {
    fetchImpl?: typeof fetch;
};

function validateHttpsUrl(url: string): URL | { error: string } {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { error: `Invalid URL: ${url}` };
    }
    if (parsed.protocol !== 'https:') {
        return { error: 'Only https:// URLs are allowed' };
    }
    return parsed;
}

/**
 * Fetches a page over HTTPS with platform User-Agent and timeout.
 * Does not check robots.txt (deferred).
 */
export async function fetchUrl(input: FetchUrlInput, deps: FetchUrlDeps = {}): Promise<FetchUrlResult> {
    const validated = validateHttpsUrl(input.url);
    if ('error' in validated) {
        return { ok: false, error: validated.error };
    }

    const fetchImpl = deps.fetchImpl ?? fetch;
    const canonicalUrl = validated.href;

    try {
        const response = await fetchImpl(canonicalUrl, {
            method: 'GET',
            headers: {
                'User-Agent': WEB_FETCH_USER_AGENT,
                Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            return {
                ok: false,
                error: `HTTP ${response.status} ${response.statusText} for ${canonicalUrl}`,
            };
        }

        const html = await response.text();
        return { ok: true, url: canonicalUrl, html };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return { ok: false, error: `Request timed out after ${WEB_FETCH_TIMEOUT_MS}ms` };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `Fetch failed for ${canonicalUrl}: ${message}` };
    }
}
