import { NVD_CVE_APIClient } from "../apiClients/nvd_cve/definition.js";
import { loadConfiguration } from "../configuration/definition.js";
import { config } from "dotenv";

config({
    path: ".env",
});

function printUsage() {
    console.log("Usage: nvd-cve <cveId>");
    process.exit(1);
}

async function main() {
    if (process.argv.length != 3) {
        printUsage();
        process.exit(1);
    }

    const cveId = process.argv[2];
    const configuration = loadConfiguration();
    if (configuration.secrets.nvdApiKey === null) {
        console.warn("NVD API key is not set");
    }
    const nvdCveClient = new NVD_CVE_APIClient(configuration.secrets.nvdApiKey);
    const result = await nvdCveClient.getCVEData(cveId);
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