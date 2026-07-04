/**
 * In-memory stand-in for platform research documents and project/component text.
 * Supports length queries and character-range reads without loading full bodies into prompts.
 */
export class InMemoryResourceStore {
    private readonly resources = new Map<string, string>();

    /**
     * Registers or overwrites a resource by reference id.
     *
     * @param ref - Stable id (e.g. `demo:cve-research-doc`).
     * @param content - Full text body stored server-side, not in the prompt.
     */
    register(ref: string, content: string): void {
        this.resources.set(ref, content);
    }

    /** @param ref - Resource reference id. */
    has(ref: string): boolean {
        return this.resources.has(ref);
    }

    /**
     * @param ref - Resource reference id.
     * @returns Character length of the stored body.
     * @throws If `ref` is unknown.
     */
    length(ref: string): number {
        const content = this.resources.get(ref);
        if (content === undefined) {
            throw new Error(`Unknown resource: ${ref}`);
        }
        return content.length;
    }

    /**
     * Reads a half-open character slice `[startChar, endChar)`.
     *
     * @param ref - Resource reference id.
     * @param startChar - Start index (clamped to document bounds).
     * @param endChar - End index (clamped; may equal start for empty slice).
     */
    readRange(ref: string, startChar: number, endChar: number): string {
        const content = this.resources.get(ref);
        if (content === undefined) {
            throw new Error(`Unknown resource: ${ref}`);
        }
        const start = Math.max(0, Math.min(startChar, content.length));
        const end = Math.max(start, Math.min(endChar, content.length));
        return content.slice(start, end);
    }

    /** @returns Number of newline-separated lines. */
    lineCount(ref: string): number {
        return this.length(ref) === 0 ? 0 : this.getLines(ref).length;
    }

    /** @returns Lines split on `\n` (no trailing-empty normalization). */
    getLines(ref: string): string[] {
        const content = this.resources.get(ref);
        if (content === undefined) {
            throw new Error(`Unknown resource: ${ref}`);
        }
        return content.split('\n');
    }
}

/** Process-wide store used by context tools in sample-agents experiments. */
export const sharedResourceStore = new InMemoryResourceStore();

/**
 * Registers a large synthetic CVE research document for CLI and server experiments.
 * Ref: `demo:cve-research-doc` — use with `get_context_length` / `read_context_range`.
 */
export function seedDemoResearchDocument(): void {
    const body = [
        '# CVE-2099-0001 research notes (demo)',
        '',
        '## Overview',
        'Synthetic document for context manager experiments in sample-agents.',
        'Repeat section to inflate size.',
        '',
        ...Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}: Lorem ipsum dolor sit amet.`),
        '',
        '## Exploit path',
        'Remote code execution via misconfigured parser.',
    ].join('\n');
    sharedResourceStore.register('demo:cve-research-doc', body);
}
