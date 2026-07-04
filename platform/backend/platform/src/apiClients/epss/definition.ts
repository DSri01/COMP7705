import { z } from "zod";

import { EpssApiResponseSchema } from "./schema.js";


export interface EpssFetchSuccess {
    success: true;
    data: z.infer<typeof EpssApiResponseSchema>;
}

export interface EpssFetchFailure {
    success: false;
    error: Error;
}

export type EpssFetchResult = EpssFetchSuccess | EpssFetchFailure;

export interface EpssFetcher {
    /**
     * Gets the EPSS data from the EPSS API for the given CVE ID
     *
     * References:
     * 1. https://api.first.org/epss/
     * 2. https://www.first.org/epss/articles/prob_percentile_bins
     *
     * @param cveId The CVE ID to fetch data for
     * @returns Parsed EPSS API response
     */
    getCVE_EPSSData: (cveId: string) => Promise<EpssFetchResult>;
}

export class EPSS_APIClient implements EpssFetcher {
    private readonly url: string = "https://api.first.org/data/v1/epss";
    getCVE_EPSSData: (cveId: string) => Promise<EpssFetchResult> = async (cveId: string) => {
        try {
            const requestOptions: RequestInit = {
                method: "GET",
            };
            const response = await fetch(`${this.url}?cve=${cveId}`, requestOptions);
            if (!response.ok) {
                throw new Error(`Failed to fetch EPSS data for ${cveId}: ${response.statusText}`);
            }
            const data: unknown = await response.json();
            return {
                success: true,
                data: EpssApiResponseSchema.parse(data),
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
}