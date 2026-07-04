import { z } from "zod";

export const ContainerScannerRequestSchema = z.object({
    containerFileName: z.string(),
    jsonScanReportOutputFileName: z.string(),
});

export const ContainerScannerResponseSchema = z.object({
    vulnerabilityIDs: z.array(z.string()),
});