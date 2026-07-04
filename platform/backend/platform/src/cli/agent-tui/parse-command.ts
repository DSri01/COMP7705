/** Result of parsing one TUI input line (`VERB` + optional args). */
export interface ParsedCommand {
    verb: string;
    args: string[];
}

/**
 * Parses `SET-AGENT platform-assistant` or `[SET-AGENT] platform-assistant`.
 */
export function parseCommandLine(line: string): ParsedCommand | null {
    const trimmed = line.trim();
    if (!trimmed) {
        return null;
    }

    const match = /^\[?([A-Za-z][A-Za-z0-9-]*)\]?\s*(.*)$/s.exec(trimmed);
    if (!match) {
        return null;
    }

    const verb = match[1]!.toUpperCase();
    const rest = match[2]!.trim();

    if (!rest) {
        return { verb, args: [] };
    }

    return { verb, args: [rest] };
}
