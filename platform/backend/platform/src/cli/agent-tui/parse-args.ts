/** Default REST base for agent threads (`…/agents/:agentId/threads`). */
export const DEFAULT_AGENTS_BASE_URL = 'http://localhost:12080/api/agents';

/** Parsed flags for the agent REST TUI entrypoint. */
export interface AgentTuiCliArgs {
    baseUrl: string;
    showHelp: boolean;
}

/** Strips trailing slashes from the agents API base URL. */
export function normalizeAgentsBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

/**
 * Parses `process.argv` slice for the agent REST TUI (`--base-url`, `--help`).
 *
 * @throws If `--base-url` is given without a value or an unknown flag is present.
 */
export function parseAgentTuiCliArgs(argv: string[]): AgentTuiCliArgs {
    let baseUrl = DEFAULT_AGENTS_BASE_URL;
    let showHelp = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]!;

        if (arg === '--help' || arg === '-h') {
            showHelp = true;
            continue;
        }

        if (arg === '--base-url' || arg === '-u') {
            const value = argv[++i]?.trim();
            if (!value) {
                throw new Error('Missing value for --base-url');
            }
            baseUrl = value;
            continue;
        }

        if (arg.startsWith('--base-url=')) {
            const value = arg.slice('--base-url='.length).trim();
            if (!value) {
                throw new Error('Missing value for --base-url');
            }
            baseUrl = value;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return {
        baseUrl: normalizeAgentsBaseUrl(baseUrl),
        showHelp,
    };
}

/** Prints CLI usage to stdout. */
export function printAgentTuiCliUsage(): void {
    console.log(`Usage: agent-tui [options]

Options:
  --base-url, -u <url>   Agents REST base (default: ${DEFAULT_AGENTS_BASE_URL})
  -h, --help             Show this help

Interactive commands include SET-BASE-URL to change the API base without restarting.
Direct Nest (no /api prefix): --base-url http://localhost:<SERVER_PORT>/agents`);
}
