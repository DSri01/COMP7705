import { z } from 'zod';

const AdviceGeneratedAtUnixSecondsSchema = z
  .union([z.bigint(), z.number().int().nonnegative(), z.string().min(1)])
  .transform((value) => (typeof value === 'bigint' ? value : BigInt(value)));

/** JSON-serializable shape written to `image_cve.advice` JSONB (no BigInt — JSON.stringify safe). */
export type ImageCveAdviceJson = {
  content: string;
  adviceGeneratedAtUnixSeconds: string;
};

/** Parsed advice after read (timestamp as bigint for mapper utilities). */
export type ImageCveAdviceStored = {
  content: string;
  adviceGeneratedAtUnixSeconds: bigint;
};

const ImageCveAdviceStoredSchema = z.object({
  content: z.string(),
  adviceGeneratedAtUnixSeconds: AdviceGeneratedAtUnixSecondsSchema,
});

export function buildStoredAdvice(content: string, adviceGeneratedAtUnixSeconds: bigint): ImageCveAdviceJson {
  return {
    content,
    adviceGeneratedAtUnixSeconds: adviceGeneratedAtUnixSeconds.toString(),
  };
}

export function parseStoredAdvice(raw: unknown): ImageCveAdviceStored | null {
  const parsed = ImageCveAdviceStoredSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
