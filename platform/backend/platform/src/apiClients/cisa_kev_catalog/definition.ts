import { z } from "zod";
import { CisaKevCatalogSchema } from "./schema.js";

export interface CisaKevCatalogFetchSuccess {
    success: true;
    data: z.infer<typeof CisaKevCatalogSchema>;
}

export interface CisaKevCatalogFetchFailure {
    success: false;
    error: Error;
}

export type CisaKevCatalogFetchResult = CisaKevCatalogFetchSuccess | CisaKevCatalogFetchFailure;

/** Injectable client shape for {@link CISA_KEV_fetchWorker}. */
export interface CisaKevCatalogFetcher {
    fetch: () => Promise<CisaKevCatalogFetchResult>;
}

/**
 * Fetches the CISA Known Exploited Vulnerabilities (KEV) catalog JSON feed.
 *
 * References:
 * - https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 * - https://www.cisa.gov/known-exploited-vulnerabilities
 * - https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities_schema.json
 *
 * @returns Parsed catalog
 */
export class CISA_KEV_CatalogAPIClient implements CisaKevCatalogFetcher {
    private readonly url: string = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

    fetch: () => Promise<CisaKevCatalogFetchResult> = async () => {
        try {
            const requestOptions: RequestInit = {
                method: "GET",
            };
            const response = await fetch(this.url, requestOptions);
            if (!response.ok) {
                throw new Error(`Failed to fetch CISA KEV catalog: ${response.statusText}`);
            }
            const data: unknown = await response.json();
            return {
                success: true,
                data: CisaKevCatalogSchema.parse(data),
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
}