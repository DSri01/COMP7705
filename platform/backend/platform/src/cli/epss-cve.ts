import { EPSS_APIClient } from "../apiClients/epss/definition.js";

function printUsage() {
    console.log("Usage: epss-cve <cveId>");
    process.exit(1);
}

async function main() {
    if (process.argv.length != 3) {
        printUsage();
        process.exit(1);
    }

    const cveId = process.argv[2];
    const epssClient = new EPSS_APIClient();
    const result = await epssClient.getCVE_EPSSData(cveId);
    if (result.success) {
        console.log(JSON.stringify(result.data, null, 2));
    } else {
        console.error(result.error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});