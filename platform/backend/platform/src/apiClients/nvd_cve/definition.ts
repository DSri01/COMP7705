import { z } from "zod";

import { NvdCves20ResponseSchema } from "./schema.js";


export interface NvdCveFetchSuccess {
    success: true;
    data: z.infer<typeof NvdCves20ResponseSchema>;
}

export interface NvdCveFetchFailure {
    success: false;
    error: Error;
}

export type NvdCveFetchResult = NvdCveFetchSuccess | NvdCveFetchFailure;

export interface NvdCveFetcher {
    /**
     * Gets the CVE data from the NVD API for the given CVE ID
     *
     * References:
     * 1. https://nvd.nist.gov/developers/start-here
     * 2. https://nvd.nist.gov/developers/vulnerabilities
     *
     * @param cveId The CVE ID to fetch data for
     * @returns Parsed CVE API 2.0 response
     */
    getCVEData: (cveId: string) => Promise<NvdCveFetchResult>;
}


export class NVD_CVE_APIClient implements NvdCveFetcher {
    private readonly url: string = "https://services.nvd.nist.gov/rest/json/cves/2.0";
    private readonly apiKey: string | null;

    constructor(apiKey: string | null) {
        this.apiKey = apiKey;
    }

    getCVEData: (cveId: string) => Promise<NvdCveFetchResult> = async (cveId: string) => {
        try {
            const requestOptions: RequestInit = {
                method: "GET",
            };
            if (this.apiKey !== null) {
                requestOptions.headers = {
                    apiKey: this.apiKey,
                };
            }
            const response = await fetch(`${this.url}?cveId=${cveId}`, requestOptions);
            if (!response.ok) {
                throw new Error(`Failed to fetch CVE data for ${cveId}: ${response.statusText}`);
            }
            const data: unknown = await response.json();
            return {
                success: true,
                data: NvdCves20ResponseSchema.parse(data),
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
}