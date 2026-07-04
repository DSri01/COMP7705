import { config } from 'dotenv';

import { loadConfiguration } from '../../configuration/definition.js';
import { createWebSearchProviderFromConfiguration } from '../../web/search/index.js';

function printUsage(): void {
    console.log('Usage: web-search <query>');
    console.log('Uses AGENTS_WEB_SEARCH_PROVIDER from .env (mockWikipedia or firecrawl).');
}

async function main(): Promise<void> {
    const query = process.argv.slice(2).join(' ').trim();
    if (!query) {
        printUsage();
        process.exit(1);
    }

    config({ path: '.env' });
    const configuration = loadConfiguration();
    const provider = createWebSearchProviderFromConfiguration(
        configuration.agents.webSearchProvider,
    );

    const result = await provider.search(query);
    if (!result.ok) {
        console.error(result.error);
        process.exit(1);
    }

    process.stdout.write(`${JSON.stringify({ ok: true, hits: result.hits }, null, 2)}\n`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
