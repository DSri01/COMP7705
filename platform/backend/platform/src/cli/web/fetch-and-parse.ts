import { fetchAndParseWebPage } from '../../web/fetch-and-parse.js';

function printUsage(): void {
    console.log('Usage: fetch-and-parse <https-url>');
}

async function main(): Promise<void> {
    const url = process.argv[2];
    if (!url) {
        printUsage();
        process.exit(1);
    }

    const result = await fetchAndParseWebPage(url);
    if (!result.ok) {
        console.error(result.error);
        process.exit(1);
    }

    const content = result.content.endsWith('\n') ? result.content : `${result.content}\n`;
    process.stdout.write(`${result.title}\n\n${content}`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
