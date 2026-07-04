export type SummaryGenerationCliArgs = {
    cveId: string | null;
    additionalContext: string;
    contextDebug: boolean;
    showHelp: boolean;
};

export function printSummaryGenerationCliUsage(): void {
    console.log(`Usage: cli:summary-generation --cve-id CVE-YYYY-NNNN [--context "notes"]

Debug CLI for the internal summary-generation-agent (one-shot).

Options:
  --cve-id <id>     Required canonical CVE id
  --context <text>  Optional operator narrative (max 8192 chars)
  --context-debug   Enable context library debug logging
  -h, --help        Show this help
`);
}

export function parseSummaryGenerationCliArgs(argv: string[]): SummaryGenerationCliArgs {
    let cveId: string | null = null;
    let additionalContext = '';
    let contextDebug = false;
    let showHelp = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            showHelp = true;
            continue;
        }
        if (arg === '--cve-id') {
            cveId = argv[++i] ?? null;
            continue;
        }
        if (arg === '--context') {
            additionalContext = argv[++i] ?? '';
            continue;
        }
        if (arg === '--context-debug') {
            contextDebug = true;
            continue;
        }
    }

    return { cveId, additionalContext, contextDebug, showHelp };
}
