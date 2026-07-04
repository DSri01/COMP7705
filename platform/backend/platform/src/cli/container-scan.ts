import { config } from "dotenv";
import { loadConfiguration } from "../configuration/definition.js";
import { ContainerScannerAPIClient } from "../apiClients/container_scanner/definition.js";

config({
    path: ".env",
});

function printUsage() {
    console.log("Usage: run-container-scan <container-file-name>");
    process.exit(1);
}

async function main() {
    if (process.argv.length != 3) {
        printUsage();
        process.exit(1);
    }

    const containerFileName = process.argv[2];
    const configuration = loadConfiguration();
    const containerScannerClient = new ContainerScannerAPIClient(configuration.containerScanner.url);
    const result = await containerScannerClient.scan(containerFileName);
    console.log(result);
}

main();