/**
 * OpenVEX v0.2.0 type definitions.
 *
 * These schemas describe the shape of VEX documents that the platform
 * generates and exports. They are intentionally independent of the internal
 * decision representation so that the serialisation layer is the only place
 * that knows about both sides.
 *
 * Key mapping rules (internal → VEX):
 *   not_affected  → NotAffectedStatement  (justification + impact_statement)
 *   affected      → AffectedStatement     (action_statement)
 *   under_investigation → UnderInvestigationStatement
 *       carry_forward / expired decisions → status_notes carries prior context
 *       fresh under_investigation         → status_notes is absent
 *
 * `fixed` is intentionally absent — the platform never emits this status.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Primitive vocabulary
// ---------------------------------------------------------------------------

export const OpenVEXContextSchema = z.literal("https://openvex.dev/ns/v0.2.0")

export const OpenVEXAuthorSchema = z.literal("comp7705platform")

/**
 * OpenVEX justification values for `not_affected` statements.
 * Matches the five justifications defined in the VEX specification.
 */
export const OpenVEXJustificationSchema = z.enum([
  "component_not_present",
  "vulnerable_code_not_present",
  "vulnerable_code_not_in_execute_path",
  "vulnerable_code_cannot_be_controlled_by_adversary",
  "inline_mitigations_already_exist",
])

// ---------------------------------------------------------------------------
// Structural vocabulary
// ---------------------------------------------------------------------------

/**
 * A reference to a vulnerability by its canonical identifier (e.g. CVE-2021-44228).
 */
export const OpenVEXVulnerabilitySchema = z.object({
  name: z.string(),
})

/**
 * A reference to a product by its PURL or other identifier string.
 * `@id` is a JSON-LD keyword, preserved exactly as the spec requires.
 */
export const OpenVEXProductSchema = z.object({
  "@id": z.string(),
})

// ---------------------------------------------------------------------------
// Statement variants
// ---------------------------------------------------------------------------

/**
 * Emitted when the component is not affected by the vulnerability.
 *
 * `justification`    — one of the five VEX justification codes.
 * `impact_statement` — human-readable explanation.
 * `status_notes`     — additional free-form context.
 * `timestamp`        — the time the decision was originally made (createdAt).
 */
export const NotAffectedStatementSchema = z.object({
  vulnerability:    OpenVEXVulnerabilitySchema,
  products:         z.array(OpenVEXProductSchema),
  status:           z.literal("not_affected"),
  justification:    OpenVEXJustificationSchema,
  impact_statement: z.string(),
  status_notes:     z.string(),
  timestamp:        z.iso.datetime(),
})

/**
 * Emitted when the component is affected by the vulnerability and remediation
 * action is required.
 *
 * `action_statement` — what the deployer must do.
 * `status_notes`     — additional free-form context.
 * `timestamp`        — the time the decision was originally made (createdAt).
 */
export const AffectedStatementSchema = z.object({
  vulnerability:    OpenVEXVulnerabilitySchema,
  products:         z.array(OpenVEXProductSchema),
  status:           z.literal("affected"),
  action_statement: z.string(),
  status_notes:     z.string(),
  timestamp:        z.iso.datetime(),
})

/**
 * Emitted for CVEs that are still being triaged.
 *
 * This status is also used for two platform-specific carry-forward cases:
 *
 *   carry_forward — the CVE was copied from a previous image version.
 *                   `status_notes` encodes the prior decision in a
 *                   human-readable form so VEX consumers have context.
 *
 *   expired       — a prior not_affected / affected decision has passed its
 *                   expiry date. The decision is surfaced as under_investigation
 *                   again; `status_notes` carries the expired decision summary.
 *
 *   fresh         — no prior decision exists. `status_notes` is absent.
 *
 * `status_notes` is therefore optional at the VEX level; the platform populates
 * it whenever there is carry-forward or expired context to convey.
 */
export const UnderInvestigationStatementSchema = z.object({
  vulnerability: OpenVEXVulnerabilitySchema,
  products:      z.array(OpenVEXProductSchema),
  status:        z.literal("under_investigation"),
  status_notes:  z.string().optional(),
  timestamp:     z.iso.datetime(),
})

/**
 * A single OpenVEX statement. Discriminated on the `status` field.
 * `fixed` is deliberately excluded — the platform never emits it.
 */
export const OpenVEXStatementSchema = z.discriminatedUnion("status", [
  NotAffectedStatementSchema,
  AffectedStatementSchema,
  UnderInvestigationStatementSchema,
])

// ---------------------------------------------------------------------------
// Top-level document
// ---------------------------------------------------------------------------

/**
 * A complete OpenVEX v0.2.0 document as emitted by the platform.
 *
 * `@id`       — globally unique document identifier (UUID URN).
 * `author`    — always the literal string "comp7705platform".
 * `timestamp` — the time the document was generated.
 * `version`   — document revision counter, always 1 (documents are not amended).
 * `statements`— one entry per image - CVE association that has a decision.
 */
export const OpenVEXDocumentSchema = z.object({
  "@context": OpenVEXContextSchema,
  "@id":      z.string(),
  author:     OpenVEXAuthorSchema,
  timestamp:  z.iso.datetime(),
  version:    z.literal(1),
  statements: z.array(OpenVEXStatementSchema),
})
