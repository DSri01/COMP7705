import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';

import {
    AGENT_LOOKUP_TITLE_MAX_LENGTH,
    AGENT_LOOKUP_TITLE_PAGE_TITLE_MAX_LENGTH,
    AGENT_LOOKUP_TITLE_URL_MAX_LENGTH,
} from '../../src/web/constants.js';
import { buildAgentLookupContentHeader } from '../../src/web/parser/metadata.js';
import { parseHtmlToAgentLookupMarkdown } from '../../src/web/parser/definition.js';
import { agentLookupMarkdownConverter } from '../../src/web/parser/markdown-converter.js';
import { buildAgentLookupTitle, extractHtmlPageTitle, urlToPageLabel } from '../../src/web/parser/title.js';

function webHtmlFixture(name: string): string {
    return readFileSync(join('__testResources__', 'web_html', name), 'utf8');
}
const FETCHED_AT = 1_746_724_800n;
const ISO = '2025-05-08T17:20:00Z';
const URL = 'https://example.com/advisory';

describe('agentLookupMarkdownConverter img translator', () => {
    it('emits markdown links instead of images', () => {
        const html =
            '<p><img alt="Diagram" src="https://example.com/d.png" />' +
            '<img src="https://example.com/x.jpg" /></p>';
        const markdown = agentLookupMarkdownConverter.translate(html);

        expect(markdown).toContain('[Diagram](https://example.com/d.png)');
        expect(markdown).toContain('[image](https://example.com/x.jpg)');
        expect(markdown).not.toMatch(/!\[/);
    });

    it('ignores data-uri images', () => {
        const html = '<img alt="x" src="data:image/png;base64,abc" />';
        expect(agentLookupMarkdownConverter.translate(html)).toBe('');
    });

    it('demotes images inside links and table cells', () => {
        const html = webHtmlFixture('with-linked-image.html');
        const markdown = agentLookupMarkdownConverter.translate(html);

        expect(markdown).toContain('[Necklaces](//upload.wikimedia.org/example.jpg)');
        expect(markdown).toContain('[image](https://example.com/thumb.jpg)');
        expect(markdown).not.toMatch(/!\[/);
    });
});

describe('web parser', () => {
    it('extractHtmlPageTitle reads title element', () => {
        const html = webHtmlFixture('minimal-advisory.html');
        expect(extractHtmlPageTitle(html)).toBe('CVE-2024-1234 Advisory');
    });

    it('urlToPageLabel uses hostname and path', () => {
        expect(urlToPageLabel('https://nvd.nist.gov/vuln/detail/CVE-2024-1')).toBe(
            'nvd.nist.gov/vuln/detail/CVE-2024-1',
        );
    });

    it('buildAgentLookupTitle composes page title, url, and fetched-at', () => {
        const html = webHtmlFixture('minimal-advisory.html');
        expect(buildAgentLookupTitle(html, URL, FETCHED_AT)).toBe(
            `CVE-2024-1234 Advisory — ${URL} — fetched at: ${ISO}`,
        );
    });

    it('buildAgentLookupTitle omits page title when missing', () => {
        const html = '<html><head></head><body></body></html>';
        expect(buildAgentLookupTitle(html, URL, FETCHED_AT)).toBe(
            `${URL} — fetched at: ${ISO}`,
        );
    });

    it('buildAgentLookupTitle truncates each segment to its cap', () => {
        const longTitle = 'A'.repeat(600);
        const longUrl = `https://example.com/${'b'.repeat(300)}`;
        const html = `<html><head><title>${longTitle}</title></head><body></body></html>`;
        const title = buildAgentLookupTitle(html, longUrl, FETCHED_AT);

        expect(title.length).toBeLessThanOrEqual(AGENT_LOOKUP_TITLE_MAX_LENGTH);
        expect(title.startsWith('A'.repeat(AGENT_LOOKUP_TITLE_PAGE_TITLE_MAX_LENGTH))).toBe(true);
        expect(title).toContain(longUrl.slice(0, AGENT_LOOKUP_TITLE_URL_MAX_LENGTH));
        expect(title.endsWith(` — fetched at: ${ISO}`)).toBe(true);
    });

    it('buildAgentLookupContentHeader matches block', () => {
        expect(buildAgentLookupContentHeader(URL, FETCHED_AT)).toBe(
            `> **Fetched at:** ${ISO}\n> **Source URL:** ${URL}\n`,
        );
    });

    it('parseHtmlToAgentLookupMarkdown converts headings and lists', () => {
        const html = webHtmlFixture('minimal-advisory.html');
        const parsed = parseHtmlToAgentLookupMarkdown({
            html,
            url: URL,
            fetchedAtUnixSeconds: FETCHED_AT,
        });

        expect(parsed.title).toBe(`CVE-2024-1234 Advisory — ${URL} — fetched at: ${ISO}`);
        expect(parsed.content).toContain(`> **Fetched at:** ${ISO}`);
        expect(parsed.content).toContain(`> **Source URL:** ${URL}`);
        expect(parsed.content).toContain('# Summary');
        expect(parsed.content).toContain('**example-lib**');
        expect(parsed.content).toContain('* Version 1.0 affected');
        expect(parsed.content).toContain('[Patch](https://example.com/patch)');
        expect(parsed.fetchedAtUnixSeconds).toBe(FETCHED_AT);
    });

    it('parseHtmlToAgentLookupMarkdown demotes images to links', () => {
        const html = webHtmlFixture('with-image.html');
        const parsed = parseHtmlToAgentLookupMarkdown({
            html,
            url: URL,
            fetchedAtUnixSeconds: FETCHED_AT,
        });

        expect(parsed.content).toContain('[patch](https://example.com/patch)');
        expect(parsed.content).toContain('[Diagram](https://example.com/diagram.png)');
        expect(parsed.content).toContain('[image](https://example.com/photo.jpg)');
        expect(parsed.content).not.toMatch(/!\[/);
    });

    it('parseHtmlToAgentLookupMarkdown omits script and style contents', () => {
        const html = webHtmlFixture('with-script-style.html');
        const parsed = parseHtmlToAgentLookupMarkdown({
            html,
            url: 'https://example.com/page',
            fetchedAtUnixSeconds: FETCHED_AT,
        });

        expect(parsed.content).toContain('Visible text only.');
        expect(parsed.content).not.toContain('alert');
        expect(parsed.content).not.toContain('color: red');
    });
});
