import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { z } from "zod";
import { CisaKevVulnerabilitySchema } from "../../../apiClients/cisa_kev_catalog/schema.js";
import { KevCatalogFetch } from "../kev_catalog_fetches/definition.js";

/** Parsed KEV catalog vulnerability object (see {@link CisaKevVulnerabilitySchema}). */
export type KevCatalogEntryPayloadJson = z.infer<typeof CisaKevVulnerabilitySchema>;

/**
 * One CVE row within a catalog snapshot (same transaction as parent {@link KevCatalogFetch}).
 */
@Entity({ name: "kev_catalog_entries" })
@Index("UQ_kev_catalog_entries_fetch_id_cve_id", ["fetch", "cveId"], { unique: true })
export class KevCatalogEntry {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => KevCatalogFetch, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "fetch_id" })
    fetch!: KevCatalogFetch;

    @Column({ type: "varchar", length: 32 })
    cveId!: string;

    @Column({ type: "jsonb" })
    vulnerability!: KevCatalogEntryPayloadJson;
}
