import { z } from "zod";
import { ApiError, ImageCvesService } from "./generated";
import { createCve } from "./cvesApi";
import { IntelHighlightsSchema, PlatformSeveritySchema } from "./schemas/intelligence_highlights_schema";

const CanonicalCveIdRegex = /^CVE-\d{4}-\d{4,}$/;

const ImageCveSourceSchema = z.enum(["fromScan", "manual", "fromChain"]);
const VexStatusSchema = z.enum(["not_affected", "affected", "under_investigation"]);
const VexStateKindSchema = z.enum([
  "under_investigation_fresh",
  "under_investigation_expired",
  "under_investigation_carry_forward",
  "not_affected",
  "affected",
]);

const DecisionSnapshotSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("not_affected"),
    justification: z.string(),
    impact_statement: z.string(),
    status_notes: z.string(),
    expiryTimeUnixSeconds: z.string(),
  }),
  z.strictObject({
    status: z.literal("affected"),
    action_statement: z.string(),
    status_notes: z.string(),
    expiryTimeUnixSeconds: z.string(),
  }),
]);

const AdditionalDataSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("fresh") }),
  z.strictObject({ type: z.literal("carry_forward"), priorDecision: DecisionSnapshotSchema }),
  z.strictObject({ type: z.literal("expired"), expiredDecision: DecisionSnapshotSchema }),
]);

const DecisionResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("not_affected"),
    justification: z.string(),
    impact_statement: z.string(),
    status_notes: z.string(),
    expiryTimeUnixSeconds: z.string(),
    createdAtUnixSeconds: z.string(),
  }),
  z.strictObject({
    status: z.literal("affected"),
    action_statement: z.string(),
    status_notes: z.string(),
    expiryTimeUnixSeconds: z.string(),
    createdAtUnixSeconds: z.string(),
  }),
  z.strictObject({
    status: z.literal("under_investigation"),
    additionalData: AdditionalDataSchema,
    createdAtUnixSeconds: z.string(),
  }),
]);

const AdviceSchema = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("set"),
    content: z.string(),
    adviceGeneratedAtUnixSeconds: z.string(),
  }),
  z.strictObject({ state: z.literal("unset") }),
]);

const DisableStateSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("enabled") }),
  z.strictObject({ state: z.literal("disabled"), reason: z.string() }),
]);

const ImageCveListItemSchema = z.strictObject({
  imageCveId: z.string(),
  cveId: z.string(),
  source: ImageCveSourceSchema,
  severity: PlatformSeveritySchema,
  intelHighlights: IntelHighlightsSchema.nullable(),
  vexStatus: VexStatusSchema,
  vexStateKind: VexStateKindSchema,
  expiryTimeUnixSeconds: z.string().nullable(),
  disableState: DisableStateSchema,
});

const ImageCveDetailSchema = z.strictObject({
  imageCveId: z.string(),
  cveId: z.string(),
  source: ImageCveSourceSchema,
  severity: PlatformSeveritySchema,
  intelHighlights: IntelHighlightsSchema.nullable(),
  disableState: DisableStateSchema,
  decision: DecisionResponseSchema,
  advice: AdviceSchema,
});

const ImageCveListResponseSchema = z.strictObject({
  imageCves: z.array(ImageCveListItemSchema),
});

export type ValidatedImageCveListItem = z.infer<typeof ImageCveListItemSchema>;
export type ValidatedImageCveDetail = z.infer<typeof ImageCveDetailSchema>;
export type ValidatedImageCveSource = z.infer<typeof ImageCveSourceSchema>;
export type ValidatedVexStateKind = z.infer<typeof VexStateKindSchema>;
export type UpdateImageCveDecisionInput =
  | {
      status: "not_affected";
      justification:
        | "component_not_present"
        | "vulnerable_code_not_present"
        | "vulnerable_code_not_in_execute_path"
        | "vulnerable_code_cannot_be_controlled_by_adversary"
        | "inline_mitigations_already_exist";
      impact_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
    }
  | {
      status: "affected";
      action_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
    }
  | { status: "under_investigation" };

export type ImportCreateResult = {
  created: string[];
  alreadyExists: string[];
  failed: Array<{ cveId: string; reason: string }>;
};

function parseImageCveListResponse(raw: unknown): { imageCves: ValidatedImageCveListItem[] } {
  return ImageCveListResponseSchema.parse(raw);
}

function parseImageCveDetail(raw: unknown): ValidatedImageCveDetail {
  return ImageCveDetailSchema.parse(raw);
}

export function normalizeAndDedupeCveIds(input: string[]): string[] {
  const deduped = new Set<string>();
  for (const raw of input) {
    const normalized = raw.trim().toUpperCase();
    if (!CanonicalCveIdRegex.test(normalized)) {
      continue;
    }
    deduped.add(normalized);
  }
  return [...deduped];
}

export async function listImageCves(
  projectId: string,
  componentId: string,
): Promise<{ imageCves: ValidatedImageCveListItem[] }> {
  const raw = await ImageCvesService.imageCvesControllerList(projectId, componentId);
  return parseImageCveListResponse(raw);
}

export async function listDisabledImageCves(
  projectId: string,
  componentId: string,
): Promise<{ imageCves: ValidatedImageCveListItem[] }> {
  const raw = await ImageCvesService.imageCvesControllerListDisabled(projectId, componentId);
  return parseImageCveListResponse(raw);
}

export async function getImageCveById(
  projectId: string,
  componentId: string,
  imageCveId: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerGetById(projectId, componentId, imageCveId);
  return parseImageCveDetail(raw);
}

export async function linkImageCves(
  projectId: string,
  componentId: string,
  cveIds: string[],
): Promise<{ status: "ok" }> {
  const deduped = normalizeAndDedupeCveIds(cveIds);
  if (deduped.length === 0) {
    return { status: "ok" };
  }
  return ImageCvesService.imageCvesControllerLink(projectId, componentId, { cveIds: deduped });
}

export async function disableImageCve(
  projectId: string,
  componentId: string,
  imageCveId: string,
  reason: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerDisable(projectId, componentId, imageCveId, {
    reason,
  });
  return parseImageCveDetail(raw);
}

export async function enableImageCve(
  projectId: string,
  componentId: string,
  imageCveId: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerEnable(projectId, componentId, imageCveId);
  return parseImageCveDetail(raw);
}

export async function updateImageCveDecision(
  projectId: string,
  componentId: string,
  imageCveId: string,
  input: UpdateImageCveDecisionInput,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerUpdateDecision(
    projectId,
    componentId,
    imageCveId,
    input,
  );
  return parseImageCveDetail(raw);
}

export async function reuseImageCveDecision(
  projectId: string,
  componentId: string,
  imageCveId: string,
  expiryTimeUnixSeconds: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerReuseDecision(
    projectId,
    componentId,
    imageCveId,
    { expiresAtUnixSeconds: expiryTimeUnixSeconds },
  );
  return parseImageCveDetail(raw);
}

export async function rejectImageCveDecisionReuse(
  projectId: string,
  componentId: string,
  imageCveId: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerRejectDecisionReuse(
    projectId,
    componentId,
    imageCveId,
  );
  return parseImageCveDetail(raw);
}

export async function updateImageCveAdvice(
  projectId: string,
  componentId: string,
  imageCveId: string,
  content: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerUpdateAdvice(projectId, componentId, imageCveId, {
    content,
  });
  return parseImageCveDetail(raw);
}

export async function refreshImageCveDecisionExpiry(
  projectId: string,
  componentId: string,
  imageCveId: string,
): Promise<ValidatedImageCveDetail> {
  const raw = await ImageCvesService.imageCvesControllerRefreshDecisionExpiry(
    projectId,
    componentId,
    imageCveId,
  );
  return parseImageCveDetail(raw);
}

export async function createCvesForImport(cveIds: string[]): Promise<ImportCreateResult> {
  const deduped = normalizeAndDedupeCveIds(cveIds);
  const result: ImportCreateResult = {
    created: [],
    alreadyExists: [],
    failed: [],
  };
  for (const cveId of deduped) {
    try {
      await createCve({ cveId });
      result.created.push(cveId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        result.alreadyExists.push(cveId);
        continue;
      }
      const reason =
        err instanceof ApiError
          ? `${err.status} ${err.statusText}`.trim()
          : err instanceof Error
            ? err.message
            : "Unknown error";
      result.failed.push({ cveId, reason });
    }
  }
  return result;
}

