import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import {
    PLATFORM_SEVERITY_ENUM,
    type IntelHighlightsColumn,
    type PlatformSeverity,
} from "../../../intelHighlightsMerger/schema.js";

/**
 * Global CVE registry (`cves`).
 *
 * Research document rows live in **`cve_research_documents`** (`CveResearchDocument` entity).
 */
@Entity({ name: "cves" })
@Index("IDX_cves_intel_last_attempt_at_unix_seconds", ["intelLastAttemptAtUnixSeconds"])
export class Cve {
    /** Canonical CVE identifier (e.g. `CVE-2021-44228`). Natural primary key. */
    @PrimaryColumn({ type: "varchar", length: 48, name: "cve_id" })
    cveId!: string;

    @Column({
        type: "enum",
        enum: PLATFORM_SEVERITY_ENUM,
        enumName: "cve_platform_severity",
        name: "severity",
        default: "UNKNOWN",
    })
    severity!: PlatformSeverity;

    /** Curated `nvd` (description, CVSS, CISA-on-NVD, **cweIds**, **cpeMatches**) / `epss` / `kev`; `null` until populated. */
    @Column({ type: "jsonb", name: "intel_highlights", nullable: true })
    intelHighlights!: IntelHighlightsColumn | null;

    @Column({
        type: "bigint",
        name: "intel_last_attempt_at",
        default: 0,
        transformer: {
            to: (v: bigint) => v,
            from: (v: string | number | bigint) => BigInt(v),
        },
    })
    intelLastAttemptAtUnixSeconds!: bigint;

    @Column({
        type: "bigint",
        name: "intel_updated_at",
        default: 0,
        transformer: {
            to: (v: bigint) => v,
            from: (v: string | number | bigint) => BigInt(v),
        },
    })
    intelUpdatedAtUnixSeconds!: bigint;

    @Column({ type: "text", name: "research_summary", default: "" })
    researchSummary!: string;
}
