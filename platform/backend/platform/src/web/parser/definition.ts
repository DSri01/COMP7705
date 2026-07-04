import type { ParsedWebPage } from '../types.js';
import { buildAgentLookupContentHeader } from './metadata.js';
import { agentLookupMarkdownConverter } from './markdown-converter.js';
import { buildAgentLookupTitle } from './title.js';

export type ParseHtmlToAgentLookupInput = {
    html: string;
    url: string;
    fetchedAtUnixSeconds: bigint;
};

/**
 * Converts fetched HTML into agent_lookup `title` + `content` (metadata block + markdown body).
 */
export function parseHtmlToAgentLookupMarkdown(input: ParseHtmlToAgentLookupInput): ParsedWebPage {
    const bodyMarkdown = agentLookupMarkdownConverter.translate(input.html).trim();
    const header = buildAgentLookupContentHeader(input.url, input.fetchedAtUnixSeconds);
    const content = bodyMarkdown.length > 0 ? `${header}\n${bodyMarkdown}` : header.trimEnd();

    return {
        url: input.url,
        title: buildAgentLookupTitle(input.html, input.url, input.fetchedAtUnixSeconds),
        content,
        fetchedAtUnixSeconds: input.fetchedAtUnixSeconds,
    };
}
