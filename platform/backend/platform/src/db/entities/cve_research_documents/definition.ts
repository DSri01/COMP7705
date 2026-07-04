import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Cve } from "../cves/definition.js";

/**
 * Allowed `source` values.
 */
export const CveResearchDocumentSourceValues = [
    "agent_lookup",
    "user_upload",
    "chat_summary",
    "nvd_api_fetch",
    "epss_api_fetch",
] as const;

export type CveResearchDocumentSource = (typeof CveResearchDocumentSourceValues)[number];

/**
 * One research document row for a CVE (append-only). Table `cve_research_documents`.
 * FK `cve_id` → {@link Cve}.
 */
@Entity({ name: "cve_research_documents" })
@Index("IDX_cve_research_documents_cve_id", ["cve"])
export class CveResearchDocument {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Cve, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "cve_id", referencedColumnName: "cveId" })
    cve!: Cve;

    @Column({ type: "varchar", length: 32, name: "source" })
    source!: CveResearchDocumentSource;

    @Column({ type: "varchar", length: 512, name: "title" })
    title!: string;

    @Column({ type: "text", name: "content" })
    content!: string;

    @Column({
        type: "bigint",
        name: "created_at",
        transformer: {
            to: (v: bigint) => v,
            from: (v: string | number | bigint) => BigInt(v),
        },
    })
    createdAtUnixSeconds!: bigint;
}
