import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from "typeorm";
import {
  type StoredInternalStatement,
} from "../../../vex/internal.js";
import { ContainerImage } from "../container_images/definition.js";
import { Cve } from "../cves/definition.js";

/**
 * Attribution channel (mutable).
 */
export const ImageCveSourceValues = ["fromScan", "manual", "fromChain"] as const;
export type ImageCveSource = (typeof ImageCveSourceValues)[number];

/**
 * Immutable introduction provenance.
 * Never `fromChain` — operational `source` carries chain propagation.
 */
export const ImageCveOriginalSourceValues = ["fromScan", "manual"] as const;
export type ImageCveOriginalSource = (typeof ImageCveOriginalSourceValues)[number];

/**
 * One image - CVE association: provenance, disable, advice, row-level times,
 * and the **current internal VEX statement** as JSON (no `timestamp` on the
 * statement — use {@link ImageCve.decisionRecordedAtUnixSeconds} at export;
 * see `vex/internal.ts` — `StoredInternalStatementSchema`).
 *
 * Table `image_cve`.
 */
@Entity({ name: "image_cve" })
@Index("UQ_image_cve_container_image_id_cve_id", ["containerImage", "cve"], { unique: true })
@Index("IDX_image_cve_cve_id", ["cve"])
export class ImageCve {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ContainerImage, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "container_image_id" })
  containerImage!: ContainerImage;

  @ManyToOne(() => Cve, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "cve_id", referencedColumnName: "cveId" })
  cve!: Cve;

  @Column({
    type: "enum",
    enum: ImageCveSourceValues,
    enumName: "image_cve_source",
    name: "source",
  })
  source!: ImageCveSource;

  @Column({ type: "integer", name: "first_introduced_chain_index" })
  firstIntroducedChainIndex!: number;

  @Column({
    type: "enum",
    enum: ImageCveOriginalSourceValues,
    enumName: "image_cve_original_source",
    name: "original_source",
  })
  originalSource!: ImageCveOriginalSource;

  @Column({ type: "boolean", name: "is_disabled", default: false })
  isDisabled!: boolean;

  @Column({ type: "text", name: "disabled_reason", default: "" })
  disabledReason!: string;

  /** When set: `{ content: string, adviceGeneratedAtUnixSeconds: string }` (int64 unix seconds). */
  @Column({ type: "jsonb", name: "advice", nullable: true })
  advice!: Record<string, unknown> | null;

  /**
   * Current trimmed **internal** statement (`StoredInternalStatement`):
   * `not_affected` | `affected` | `under_investigation` without OpenVEX
   * `timestamp` / `vulnerability` / `products`.
   * Validate with `StoredInternalStatementSchema.parse` on write; pass to
   * `serializeStoredStatement` with {@link decisionRecordedAtUnixSeconds} for export.
   */
  @Column({
    type: "jsonb",
    name: "stored_internal_statement",
    // Postgres default must be a SQL expression string (not a JS object).
    default: () => `'{"status":"under_investigation","context":{"type":"fresh"}}'::jsonb`,
  })
  storedInternalStatement!: StoredInternalStatement;

  /**
   * Absolute decision validity end, unix seconds.
   * Single source of truth for expiry checks; not duplicated inside JSON snapshots.
   */
  @Column({
    type: "bigint",
    name: "expiry_time_unix_seconds",
    nullable: true,
    transformer: {
      to: (v: bigint | null) => v,
      from: (v: string | number | bigint | null) =>
        v === null || v === undefined ? null : BigInt(v),
    },
  })
  expiryTimeUnixSeconds!: bigint | null;

  /**
   * When the current decision was last recorded, unix seconds.
   * Use as `statementTimestamp` (ISO derived at export) for `serializeStoredStatement`.
   */
  @Column({
    type: "bigint",
    name: "decision_recorded_at_unix_seconds",
    transformer: {
      to: (v: bigint) => v,
      from: (v: string | number | bigint) => BigInt(v),
    },
  })
  decisionRecordedAtUnixSeconds!: bigint;
}
