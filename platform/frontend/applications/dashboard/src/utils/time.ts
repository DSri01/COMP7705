export function parseUnixSeconds(unixSeconds: string): Date {
    return new Date(parseInt(unixSeconds) * 1000);
}

export function formatTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('.000Z', '');
}

export function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}