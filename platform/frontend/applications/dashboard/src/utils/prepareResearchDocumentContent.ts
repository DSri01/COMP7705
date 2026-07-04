/**
 * When research document content is a JSON object/array blob, wrap it in a fenced
 * `json` block with pretty-printing so SafeMarkdown can render it readably.
 * Otherwise returns the original string for direct markdown rendering.
 */
export function prepareResearchDocumentContent(content: string): string {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
        return content;
    }

    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];

    if (first === '{') {
        if (last !== '}') {
            return content;
        }
    } else if (first === '[') {
        if (last !== ']') {
            return content;
        }
    } else {
        return content;
    }

    try {
        const parsed: unknown = JSON.parse(trimmed);
        const pretty = JSON.stringify(parsed, null, 2);
        return `\`\`\`json\n${pretty}\n\`\`\``;
    } catch {
        return content;
    }
}
