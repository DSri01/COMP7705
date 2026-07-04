import type { ContextManagerConfig } from './types.js';
import { suggestedReadSliceChars } from './config.js';

/**
 * Shared prompt block for document-grounded agents (platform CVE / sea-creature pattern).
 *
 * Interpolates the active {@link ContextManagerConfig} passed at agent bootstrap — same object
 * as `createAgentContextManager(..., CONSERVATIVE_CONTEXT_CONFIG)` in `index.ts`.
 */
export function buildDocumentContextGuidance(config: ContextManagerConfig): string {
    const suggestedSlice = suggestedReadSliceChars(config);
    return [
        '=== Document context limits (mandatory) ===',
        `maxReadRangeChars=${config.maxReadRangeChars} — max source text per read (before JSON wrapper).`,
        `maxEventChars=${config.maxEventChars} — entire read_context_range tool result (JSON) must fit here or it is truncated in the transcript.`,
        'Tool descriptions repeat these configured limits.',
        '',
        'Read workflow:',
        '1. list_documents (metadata only) or use pinned resourceRefs',
        '2. get_context_length(resourceRef) — charLength and lineCount',
        '3. read_context_range — by startChar+endChar OR startLine+endLine (1-based inclusive lines)',
        `   Keep each read ≤ ${config.maxReadRangeChars} chars (suggested ~${suggestedSlice} chars of source per read).`,
        '4. working_area_append — copy key excerpts after each read (checklist: do not skip)',
        '5. working_area_view — verify notebook before finish (tool result capped; full notebook in Context: working area)',
        '6. finish — answer from working area + recent reads only',
    ].join('\n');
}
