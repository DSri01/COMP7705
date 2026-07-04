/**
 * Tool-response formatting sized for ingest caps (`maxStoredPayloadChars` slack).
 * `working_area_view` and metadata tools use helpers here; read JSON uses `read-context-range.ts`.
 */
import type { ContextLimitsSnapshot } from './config.js';

/** Safety margin so ingest never sees `length === maxEventChars + 1` after JSON rounding. */
export function maxStoredPayloadChars(maxEventChars: number): number {
    return Math.max(0, maxEventChars - 4);
}

export function fitJsonToMaxEventChars(data: Record<string, unknown>, limits: ContextLimitsSnapshot): string {
    const cap = maxStoredPayloadChars(limits.maxEventChars);
    let payload = JSON.stringify(data);
    if (payload.length <= cap) {
        return payload;
    }

    const documents = data['documents'];
    if (Array.isArray(documents)) {
        const docs = documents.map((d) => ({ ...(d as Record<string, unknown>) }));
        let truncated = false;
        while (payload.length > cap && docs.length > 0) {
            truncated = true;
            const last = docs[docs.length - 1] as { description?: string };
            const desc = typeof last.description === 'string' ? last.description : '';
            if (desc.length > 24) {
                last.description = `${desc.slice(0, desc.length - 12)}…`;
            } else {
                docs.pop();
            }
            payload = JSON.stringify({
                ...data,
                documents: docs,
                maxReadRangeChars: limits.maxReadRangeChars,
                maxEventChars: limits.maxEventChars,
                listTruncated: truncated,
            });
        }
        if (payload.length <= cap) {
            return payload;
        }
    }

    return payload.slice(0, cap);
}

export function formatGetContextLengthResponse(
    resourceRef: string,
    charLength: number,
    lineCount: number,
    limits: ContextLimitsSnapshot,
): string {
    return fitJsonToMaxEventChars(
        {
            resourceRef,
            charLength,
            lineCount,
            maxReadRangeChars: limits.maxReadRangeChars,
            maxEventChars: limits.maxEventChars,
        },
        limits,
    );
}

const WORKING_AREA_VIEW_CAP_NOTE =
    '\n\n[Tool result capped; full notebook is in "Context: working area" on each tool_actor turn.]';

/** Caps `working_area_view` tool output; full notebook remains in prompt working-area section. */
export function formatWorkingAreaViewResponse(full: string, maxEventChars: number): string {
    const cap = maxStoredPayloadChars(maxEventChars);
    if (full.length <= cap) {
        return full;
    }
    const room = Math.max(0, cap - WORKING_AREA_VIEW_CAP_NOTE.length);
    return `${full.slice(0, room)}${WORKING_AREA_VIEW_CAP_NOTE}`;
}
