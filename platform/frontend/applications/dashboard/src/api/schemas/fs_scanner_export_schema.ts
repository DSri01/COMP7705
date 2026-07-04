import { z } from "zod";

export const FsScannerExportSchema = z.strictObject({
  VulnerabilityIDs: z.array(z.string()),
});

export type FsScannerExport = z.infer<typeof FsScannerExportSchema>;

export function parseFsScannerExport(raw: unknown): FsScannerExport {
  return FsScannerExportSchema.parse(raw);
}

