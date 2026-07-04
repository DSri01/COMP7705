import z from "zod";
import { ContainerScannerResponseSchema } from "./schema.js";
import crypto from "crypto";

export function getDefaultJsonScanReportOutputFileName(): string {
    return `scan.tar.${crypto.randomUUID()}.${Date.now()}.json`;
}

export interface ContainerScannerFetchSuccess {
    success: true;
    data: z.infer<typeof ContainerScannerResponseSchema>;
}

export interface ContainerScannerFetchFailure {
    success: false;
    error: Error;
}

export type ContainerScannerFetchResult = ContainerScannerFetchSuccess | ContainerScannerFetchFailure;

export class ContainerScannerAPIClient {
    private readonly url: string;

    constructor(
        url: string = "http://localhost:8080/container/tar/json/scan",
    ) {
        this.url = url;
    }

    scan: (
        containerFileName: string,
        jsonScanReportOutputFileName?: string,
    ) => Promise<ContainerScannerFetchResult> = async (
        containerFileName: string,
        jsonScanReportOutputFileName: string = getDefaultJsonScanReportOutputFileName(),
    ) => {


        try {
            const response = await fetch(this.url, {
                method: "POST",
                body: JSON.stringify({ containerFileName, jsonScanReportOutputFileName }),
            });
            if (!response.ok) {
                throw new Error(`Failed to scan container: ${response.statusText}`);
            }
            const data: unknown = await response.json();
            return {
                success: true,
                data: ContainerScannerResponseSchema.parse(data),
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
}