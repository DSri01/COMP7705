/**
 * Returns the current time in seconds since the Unix epoch.
 */
export function getCurrentTimeUnixSeconds(): bigint {
    return BigInt(Math.floor(Date.now() / 1000));
}


/**
 * Sleeps for the given number of milliseconds.
 */
export async function sleepMilliseconds(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}


/**
 * TypeORM may return PostgreSQL `bigint` as string; normalize for arithmetic.
 * 
 * @param value - The value to convert to a bigint.
 * @returns The value as a bigint.
 */
export function asUnixSecondsBigInt(value: bigint | string | number): bigint {
    return BigInt(String(value));
}

/**
 * ISO 8601 UTC for human-facing strings (e.g. `2026-06-02T14:30:00Z`).
 */
export function unixSecondsToIso8601Utc(unixSeconds: bigint): string {
    return new Date(Number(unixSeconds) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}