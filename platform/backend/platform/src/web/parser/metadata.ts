import { unixSecondsToIso8601Utc } from '../../utils/time.js';

/**
 * metadata block prepended before converted page markdown.
 */
export function buildAgentLookupContentHeader(url: string, fetchedAtUnixSeconds: bigint): string {
    const iso8601Utc = unixSecondsToIso8601Utc(fetchedAtUnixSeconds);
    return `> **Fetched at:** ${iso8601Utc}\n> **Source URL:** ${url}\n`;
}
