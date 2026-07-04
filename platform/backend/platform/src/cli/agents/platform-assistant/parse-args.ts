const CONTEXT_OFF_FLAGS = new Set(['--no-context', '--disable-context']);
const CONTEXT_DEBUG_FLAGS = new Set(['--context-debug', '--debug-context']);

/** Parsed flags and positional args for the platform-assistant CLI. */
export interface PlatformAssistantCliArgs {
    disableContext: boolean;
    /** When true, enables context manager pino debug (compact, ingest, limits). Default false. */
    contextDebug: boolean;
    argvGoal: string;
    showHelp: boolean;
}

/**
 * Parses `process.argv` slice for the platform-assistant CLI (flags + optional message seed).
 */
export function parsePlatformAssistantCliArgs(argv: string[]): PlatformAssistantCliArgs {
    let disableContext = false;
    let contextDebug = false;
    let showHelp = false;
    const positional: string[] = [];

    for (const arg of argv) {
        if (CONTEXT_OFF_FLAGS.has(arg)) {
            disableContext = true;
            continue;
        }
        if (CONTEXT_DEBUG_FLAGS.has(arg)) {
            contextDebug = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            showHelp = true;
            continue;
        }
        positional.push(arg);
    }

    return {
        disableContext,
        contextDebug,
        argvGoal: positional.join(' ').trim(),
        showHelp,
    };
}

/** Prints CLI usage to stdout. */
export function printPlatformAssistantCliUsage(): void {
    console.log(`Usage: platform-assistant [options] [message]

Options:
  --context-debug, --debug-context  Enable context manager pino debug logs (off by default)
  -h, --help                        Show this help

Enter messages at the prompt, or pass one as the first argument. Type \\exit to quit.

Requires a running PostgreSQL database (same .dev.env / DB_* as the platform server).
The context library is always enabled for this agent (--no-context is not supported).`);
}
