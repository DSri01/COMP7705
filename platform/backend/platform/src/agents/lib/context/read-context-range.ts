import { sharedResourceStore } from './resource-store.js';
import type { ContextLimitsSnapshot } from './config.js';
import { maxStoredPayloadChars } from './format.js';

export interface ReadContextRangeInput {
    resourceRef: string;
    startChar?: number;
    endChar?: number;
    /** 1-based inclusive line numbers. */
    startLine?: number;
    endLine?: number;
}

export interface ReadContextRangeResult {
    resourceRef: string;
    mode: 'char' | 'line';
    requestedChars: number;
    returnedChars: number;
    clamped: boolean;
    startChar: number;
    endChar: number;
    startLine?: number;
    endLine?: number;
    text: string;
}

/** @deprecated Use {@link ContextLimitsSnapshot}. */
export type ReadContextRangeLimits = ContextLimitsSnapshot;

/**
 * Whether to use a smaller JSON shape for read responses so metadata fits under
 * {@link ContextLimitsSnapshot.maxEventChars}. Derived from configured limits only.
 */
export function useCompactReadPayload(limits: ContextLimitsSnapshot): boolean {
    return limits.maxEventChars <= limits.maxReadRangeChars + 250;
}

/**
 * Resolves a source slice by character or line range, then clamps text to
 * {@link ContextLimitsSnapshot.maxReadRangeChars} from the agent's {@link ContextManagerConfig}.
 */
export function executeReadContextRange(
    input: ReadContextRangeInput,
    limits: ContextLimitsSnapshot,
): ReadContextRangeResult {
    const { resourceRef } = input;
    const { maxReadRangeChars } = limits;
    let text: string;
    let mode: 'char' | 'line';
    let startChar: number;
    let endChar: number;
    let startLine: number | undefined;
    let endLine: number | undefined;

    const hasLine =
        input.startLine !== undefined &&
        input.endLine !== undefined &&
        input.startLine >= 1 &&
        input.endLine >= input.startLine;
    const hasChar =
        input.startChar !== undefined &&
        input.endChar !== undefined &&
        input.endChar >= input.startChar;

    if (hasLine) {
        mode = 'line';
        startLine = input.startLine!;
        endLine = input.endLine!;
        const lines = sharedResourceStore.getLines(resourceRef);
        const slice = lines.slice(startLine - 1, endLine);
        text = slice.join('\n');
        const before = lines.slice(0, startLine - 1).join('\n');
        startChar = before.length > 0 ? before.length + 1 : 0;
        endChar = startChar + text.length;
    } else if (hasChar) {
        mode = 'char';
        startChar = input.startChar!;
        endChar = input.endChar!;
        text = sharedResourceStore.readRange(resourceRef, startChar, endChar);
    } else {
        throw new Error(
            'Provide either startChar+endChar or startLine+endLine (1-based inclusive lines).',
        );
    }

    const requestedChars = text.length;
    let clamped = false;
    if (text.length > maxReadRangeChars) {
        text = text.slice(0, maxReadRangeChars);
        clamped = true;
        endChar = startChar + text.length;
    }

    return {
        resourceRef,
        mode,
        requestedChars,
        returnedChars: text.length,
        clamped,
        startChar,
        endChar,
        startLine,
        endLine,
        text,
    };
}

/**
 * Serializes a read result. Includes configured `maxReadRangeChars` and `maxEventChars` in the JSON
 * so the model sees the active limits on every call.
 */
function buildReadPayload(
    result: ReadContextRangeResult,
    limits: ContextLimitsSnapshot,
    text: string,
    storedChars: number,
    storedTruncated: boolean,
): string {
    if (useCompactReadPayload(limits)) {
        return JSON.stringify({
            resourceRef: result.resourceRef,
            mode: result.mode,
            startChar: result.startChar,
            endChar: result.endChar,
            startLine: result.startLine,
            endLine: result.endLine,
            maxReadRangeChars: limits.maxReadRangeChars,
            maxEventChars: limits.maxEventChars,
            storedChars,
            storedTruncated,
            text,
        });
    }
    return JSON.stringify({
        resourceRef: result.resourceRef,
        mode: result.mode,
        startChar: result.startChar,
        endChar: result.endChar,
        startLine: result.startLine,
        endLine: result.endLine,
        requestedChars: result.requestedChars,
        returnedChars: text.length,
        maxReadRangeChars: limits.maxReadRangeChars,
        maxEventChars: limits.maxEventChars,
        storedChars,
        storedTruncated,
        sourceClamped: result.clamped,
        hint:
            'Copy key facts to working_area_append. If truncated, use a smaller line/char range or continue from endChar.',
        text,
    });
}

/**
 * JSON tool output sized so the full string fits in {@link ContextLimitsSnapshot.maxEventChars}.
 * Prevents a second truncation pass in {@link AgentContextManager.recordNewMessages} that would
 * strip metadata and confuse the model.
 *
 * @param result - Slice from {@link executeReadContextRange}.
 * @param limits - Copied from {@link AgentContextManager.config} at invocation time.
 */
export function formatReadContextRangeResponse(
    result: ReadContextRangeResult,
    limits: ContextLimitsSnapshot,
): string {
    const cap = maxStoredPayloadChars(limits.maxEventChars);
    const emptyPayload = buildReadPayload(result, limits, '', 0, false);
    const metadataChars = emptyPayload.length;
    const maxTextInResponse = Math.max(
        0,
        Math.min(limits.maxReadRangeChars, cap - metadataChars),
    );

    let text = result.text.slice(0, maxTextInResponse);
    let storedTruncated = result.clamped || text.length < result.text.length;

    let payload = buildReadPayload(result, limits, text, 0, storedTruncated);
    while (payload.length > cap && text.length > 0) {
        text = text.slice(0, Math.max(0, text.length - 5));
        storedTruncated = true;
        payload = buildReadPayload(result, limits, text, 0, storedTruncated);
    }

    if (payload.length > cap) {
        text = '';
        storedTruncated = true;
        payload = buildReadPayload(result, limits, text, 0, storedTruncated);
    }

    // `storedChars` in the JSON changes string length when digits change — converge.
    for (let guard = 0; guard < 24 && payload.length > cap; guard++) {
        if (text.length > 0) {
            text = text.slice(0, Math.max(0, text.length - 5));
            storedTruncated = true;
        } else {
            break;
        }
        payload = buildReadPayload(result, limits, text, payload.length, storedTruncated);
    }

    while (payload.length > cap && text.length > 0) {
        text = text.slice(0, Math.max(0, text.length - 1));
        storedTruncated = true;
        payload = buildReadPayload(result, limits, text, payload.length, storedTruncated);
    }

    return payload;
}
