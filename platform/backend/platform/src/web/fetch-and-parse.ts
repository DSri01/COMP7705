import { fetchUrl, type FetchUrlDeps } from './fetcher/definition.js';
import { parseHtmlToAgentLookupMarkdown } from './parser/definition.js';
import type { FetchAndParseJsonPayload, FetchAndParseResult } from './types.js';
import { getCurrentTimeUnixSeconds } from '../utils/time.js';

export type FetchAndParseDeps = FetchUrlDeps & {
    getCurrentTimeUnixSeconds?: () => bigint;
};

/**
 * Fetches `url`, converts HTML to agent_lookup markdown, and returns title + content.
 * Does not persist to the database.
 */
export async function fetchAndParseWebPage(
    url: string,
    deps: FetchAndParseDeps = {},
): Promise<FetchAndParseResult> {
    const fetchedAtUnixSeconds = (deps.getCurrentTimeUnixSeconds ?? getCurrentTimeUnixSeconds)();

    const fetchResult = await fetchUrl({ url }, deps);
    if (!fetchResult.ok) {
        return fetchResult;
    }

    const parsed = parseHtmlToAgentLookupMarkdown({
        html: fetchResult.html,
        url: fetchResult.url,
        fetchedAtUnixSeconds,
    });

    return {
        ok: true,
        url: parsed.url,
        title: parsed.title,
        content: parsed.content,
        fetchedAtUnixSeconds: parsed.fetchedAtUnixSeconds,
    };
}

export function fetchAndParseResultToJsonPayload(
    result: Extract<FetchAndParseResult, { ok: true }>,
): FetchAndParseJsonPayload {
    return {
        ok: true,
        url: result.url,
        title: result.title,
        content: result.content,
        fetchedAtUnixSeconds: result.fetchedAtUnixSeconds.toString(),
    };
}
