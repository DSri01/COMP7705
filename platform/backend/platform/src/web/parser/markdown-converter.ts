import { NodeHtmlMarkdown } from 'node-html-markdown';

import { imgAsMarkdownLinkTranslators } from './img-translator.js';

/** Shared HTML→markdown converter for agent_lookup web fetches. */
export const agentLookupMarkdownConverter = new NodeHtmlMarkdown(
    { keepDataImages: false },
    imgAsMarkdownLinkTranslators,
);

// Images inside <a> and table cells use separate translator collections with default ![...] behavior.
for (const [elems, cfg] of Object.entries(imgAsMarkdownLinkTranslators)) {
    agentLookupMarkdownConverter.aTagTranslators.set(elems, cfg, true);
    agentLookupMarkdownConverter.tableCellTranslators.set(elems, cfg, true);
}
