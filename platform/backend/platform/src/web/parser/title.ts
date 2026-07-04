import {
    AGENT_LOOKUP_TITLE_FETCHED_AT_SUFFIX,
    AGENT_LOOKUP_TITLE_MAX_LENGTH,
    AGENT_LOOKUP_TITLE_PAGE_TITLE_MAX_LENGTH,
    AGENT_LOOKUP_TITLE_SEGMENT_SEPARATOR,
    AGENT_LOOKUP_TITLE_TIMESTAMP_MAX_LENGTH,
    AGENT_LOOKUP_TITLE_URL_MAX_LENGTH,
} from '../constants.js';
import { unixSecondsToIso8601Utc } from '../../utils/time.js';

function decodeHtmlEntities(value: string): string {
    return value
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&apos;', "'");
}

function truncateToMaxLength(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : value.slice(0, maxLength);
}

/**
 * Reads HTML `<title>` when present; otherwise returns null.
 */
export function extractHtmlPageTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) {
        return null;
    }
    const text = decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim());
    return text.length > 0 ? text : null;
}

/** Hostname + path label (utility for callers that need a short URL label). */
export function urlToPageLabel(url: string): string {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${parsed.hostname}${path}`;
}

/**
 * title: `{pageTitle≤100} — {url≤200} — fetched at: {iso≤80}` (max 400 chars).
 * Omits the page-title segment when `<title>` is missing.
 */
export function buildAgentLookupTitle(
    html: string,
    url: string,
    fetchedAtUnixSeconds: bigint,
): string {
    const iso8601Utc = unixSecondsToIso8601Utc(fetchedAtUnixSeconds);
    const timestampPart = truncateToMaxLength(
        `${AGENT_LOOKUP_TITLE_FETCHED_AT_SUFFIX}${iso8601Utc}`,
        AGENT_LOOKUP_TITLE_TIMESTAMP_MAX_LENGTH,
    );
    const urlPart = truncateToMaxLength(url, AGENT_LOOKUP_TITLE_URL_MAX_LENGTH);
    const pageTitle = extractHtmlPageTitle(html);

    const segments: string[] = [];
    if (pageTitle) {
        segments.push(truncateToMaxLength(pageTitle, AGENT_LOOKUP_TITLE_PAGE_TITLE_MAX_LENGTH));
    }
    segments.push(urlPart);

    const title = `${segments.join(AGENT_LOOKUP_TITLE_SEGMENT_SEPARATOR)}${timestampPart}`;
    return truncateToMaxLength(title, AGENT_LOOKUP_TITLE_MAX_LENGTH);
}
