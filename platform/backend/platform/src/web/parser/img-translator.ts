import type { TranslatorConfigObject } from 'node-html-markdown';

const DEFAULT_IMAGE_LINK_LABEL = 'image';

/**
 * Emits `[alt](src)` instead of `![alt](src)` so the dashboard does not auto-fetch images.
 */
export const imgAsMarkdownLinkTranslators: TranslatorConfigObject = {
    img: ({ node, options }) => {
        const src = node.getAttribute('src') ?? '';
        if (!src || (!options.keepDataImages && /^data:/i.test(src))) {
            return { ignore: true };
        }

        const alt = node.getAttribute('alt')?.trim() || DEFAULT_IMAGE_LINK_LABEL;
        return {
            content: `[${alt}](${src})`,
            recurse: false,
        };
    },
};
