import { RestApiClient } from './api-client.js';
import { parseAgentTuiCliArgs, printAgentTuiCliUsage } from './parse-args.js';
import { runAgentTui } from './run-agent-tui.js';

async function main(): Promise<void> {
    const { baseUrl, showHelp } = parseAgentTuiCliArgs(process.argv.slice(2));

    if (showHelp) {
        printAgentTuiCliUsage();
        return;
    }

    const api = new RestApiClient(baseUrl);
    await runAgentTui({ api });
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
