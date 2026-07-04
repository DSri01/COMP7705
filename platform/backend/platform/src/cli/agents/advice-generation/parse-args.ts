export type AdviceGenerationCliArgs = {
    projectId: string | null;
    componentId: string | null;
    cveId: string | null;
    additionalContext: string;
    contextDebug: boolean;
    showHelp: boolean;
};

export function printAdviceGenerationCliUsage(): void {
    console.log(`Usage: cli:advice-generation --project-id <uuid> --component-id <uuid> --cve-id CVE-YYYY-NNNN [--context "notes"]

Debug CLI for the internal advice-generation-agent (one-shot).

Options:
  --project-id <uuid>    Required project UUID
  --component-id <uuid>  Required component UUID
  --cve-id <id>          Required canonical CVE id
  --context <text>       Optional operator narrative (max 8192 chars)
  --context-debug        Enable context library debug logging
  -h, --help             Show this help
`);
}

export function parseAdviceGenerationCliArgs(argv: string[]): AdviceGenerationCliArgs {
    let projectId: string | null = null;
    let componentId: string | null = null;
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
        if (arg === '--project-id') {
            projectId = argv[++i] ?? null;
            continue;
        }
        if (arg === '--component-id') {
            componentId = argv[++i] ?? null;
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

    return { projectId, componentId, cveId, additionalContext, contextDebug, showHelp };
}
