/**
 * Internal VEX representation used throughout the platform.
 *
 * Per-image–CVE **stored** statements omit `timestamp`; that value lives on the
 * `DECISION` row (`created_at`) and is supplied at export time.
 *
 * - `serializeStoredStatement` — one stored internal statement → one OpenVEX
 *   statement (injects `timestamp`, projects `under_investigation.context` →
 *   optional `status_notes`).
 * - `assembleOpenVexDocument` — ordered list of OpenVEX statements + document
 *   shell (`@id`, export `timestamp`, etc.) → full `OpenVEXDocumentSchema`.
 *
 * Dependency direction: internal.ts → external.ts (never the reverse).
 */

import { z } from "zod"
import {
  NotAffectedStatementSchema,
  AffectedStatementSchema,
  OpenVEXContextSchema,
  OpenVEXAuthorSchema,
  OpenVEXJustificationSchema,
  OpenVEXDocumentSchema,
  OpenVEXStatementSchema,
} from "./external.js"

/**
 * Detailed, UI-facing VEX state discriminator used by list APIs.
 * This is intentionally defined in the VEX module so API layers can import
 * one canonical schema/type instead of redefining state strings.
 */
export const VexStateKindSchema = z.enum([
  "not_affected",
  "affected",
  "under_investigation_fresh",
  "under_investigation_expired",
  "under_investigation_carry_forward",
])

// ---------------------------------------------------------------------------
// DecisionSnapshot
// A typed snapshot of a resolved (not_affected / affected) decision.
// Absolute validity end (`expiry_time`) lives only on the DECISION row — not
// duplicated here. Used in carry_forward / expired context to drive status_notes.
//
// TODO: move to a shared api/schemas.ts once the API layer is scaffolded so
// that DecisionResponse.additionalData and this schema stay in sync from one
// source of truth.
// ---------------------------------------------------------------------------

export const DecisionSnapshotSchema = z.discriminatedUnion("status", [
  z.object({
    status:            z.literal("not_affected"),
    justification:     OpenVEXJustificationSchema,
    impact_statement:  z.string(),
    status_notes:      z.string(),
  }),
  z.object({
    status:           z.literal("affected"),
    action_statement: z.string(),
    status_notes:     z.string(),
  }),
])

// ---------------------------------------------------------------------------
// Internal context union for under_investigation statements
// ---------------------------------------------------------------------------

export const InternalContextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fresh") }),
  z.object({ type: z.literal("carry_forward"), priorDecision:   DecisionSnapshotSchema }),
  z.object({ type: z.literal("expired"),       expiredDecision: DecisionSnapshotSchema }),
])

// ---------------------------------------------------------------------------
// Stored internal statements (persisted per image - CVE; no timestamp)
//
// `not_affected` / `affected` match external field-for-field except `timestamp`.
// `under_investigation` carries typed `context` instead of optional status_notes.
// ---------------------------------------------------------------------------

export { NotAffectedStatementSchema, AffectedStatementSchema }

export const StoredNotAffectedStatementSchema = NotAffectedStatementSchema.omit({
  vulnerability: true,
  products: true,
  timestamp: true,
})

export const StoredAffectedStatementSchema = AffectedStatementSchema.omit({
  vulnerability: true,
  products: true,
  timestamp: true,
})

export const StoredInternalUnderInvestigationStatementSchema = z.object({
  status:        z.literal("under_investigation"),
  context:       InternalContextSchema,
})

export const StoredInternalStatementSchema = z.discriminatedUnion("status", [
  StoredNotAffectedStatementSchema,
  StoredAffectedStatementSchema,
  StoredInternalUnderInvestigationStatementSchema,
])

export type StoredInternalStatement = z.infer<typeof StoredInternalStatementSchema>

/**
 * Default stored statement for new image-CVE rows: `under_investigation` with
 * `fresh` context.
 */
export function createDefaultStoredInternalStatement(): StoredInternalStatement {
  return StoredInternalStatementSchema.parse({
    status:  "under_investigation",
    context: { type: "fresh" },
  })
}

// ---------------------------------------------------------------------------
// status_notes formatting (under_investigation → OpenVEX)
// ---------------------------------------------------------------------------

function formatSnapshot(snapshot: z.infer<typeof DecisionSnapshotSchema>): string {
  if (snapshot.status === "not_affected") {
    return (
      `Status: not_affected. ` +
      `Justification: ${snapshot.justification}. ` +
      `Description: ${snapshot.impact_statement} ` +
      `Status notes: ${snapshot.status_notes}.`
    )
  }

  return (
    `Status: affected. ` +
    `Action: ${snapshot.action_statement} ` +
    `Status notes: ${snapshot.status_notes}.`
  )
}

function buildStatusNotes(
  context: z.infer<typeof InternalContextSchema>,
): string | undefined {
  switch (context.type) {
    case "fresh":
      return undefined

    case "carry_forward":
      return (
        `Carried forward from a previous image version. ` +
        `Prior decision — ${formatSnapshot(context.priorDecision)}`
      )

    case "expired":
      return (
        `Previous decision has expired and requires re-evaluation. ` +
        `Expired decision — ${formatSnapshot(context.expiredDecision)}`
      )
  }
}

// ---------------------------------------------------------------------------
// serializeStoredStatement — stored internal → one OpenVEX statement
// ---------------------------------------------------------------------------

export type SerializeStoredStatementOpts = {
  /** Typically `DECISION.created_at` as ISO 8601. */
  statementTimestamp: string
  /** Canonical vulnerability identifier (e.g. CVE-2021-44228). */
  vulnerabilityName: string
  /** Product identifier in OpenVEX `@id` format. */
  productId: string
}

/**
 * Converts one persisted internal statement into an OpenVEX statement.
 * Injects `statementTimestamp` on every variant; for `under_investigation`,
 * strips `context` and sets optional `status_notes`.
 */
export function serializeStoredStatement(
  stored: StoredInternalStatement,
  opts: SerializeStoredStatementOpts,
): z.infer<typeof OpenVEXStatementSchema> {
  const { statementTimestamp, vulnerabilityName, productId } = opts
  const base = {
    vulnerability: { name: vulnerabilityName },
    products: [{ "@id": productId }],
  }

  if (stored.status === "under_investigation") {
    const { context } = stored
    const status_notes = buildStatusNotes(context)
    const statement = { ...base, status: "under_investigation", timestamp: statementTimestamp }
    return (status_notes === undefined ? statement : { ...statement, status_notes }) as z.infer<
      typeof OpenVEXStatementSchema
    >
  }

  return { ...base, ...stored, timestamp: statementTimestamp } as z.infer<typeof OpenVEXStatementSchema>
}

// ---------------------------------------------------------------------------
// assembleOpenVexDocument — external statements → full document
// ---------------------------------------------------------------------------

export type AssembleOpenVexDocumentInput = {
  /** Document `@id` (e.g. UUID URN). */
  documentId: string
  /** Usually export generation time as ISO 8601. */
  documentTimestamp: string
  statements: z.infer<typeof OpenVEXStatementSchema>[]
}

/**
 * Wraps already-serialized OpenVEX statements in a top-level OpenVEX document.
 */
export function assembleOpenVexDocument(
  input: AssembleOpenVexDocumentInput,
): z.infer<typeof OpenVEXDocumentSchema> {
  const doc: z.infer<typeof OpenVEXDocumentSchema> = {
    "@context": "https://openvex.dev/ns/v0.2.0" satisfies z.infer<typeof OpenVEXContextSchema>,
    "@id":      input.documentId,
    author:     "comp7705platform" satisfies z.infer<typeof OpenVEXAuthorSchema>,
    timestamp:  input.documentTimestamp,
    version:    1,
    statements: input.statements,
  }
  return doc
}
