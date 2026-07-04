import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from "typeorm";
import { z } from "zod";
import { CisaKevCatalogSchema } from "../../../apiClients/cisa_kev_catalog/schema.js";

/**
 * Catalog JSON fields excluding the bulk `vulnerabilities` array (stored per-row in
 * {@link KevCatalogEntry}). Matches the CISA feed shape from {@link CisaKevCatalogSchema}.
 */
export type KevCatalogFetchEnvelopeJson = Omit<
    z.infer<typeof CisaKevCatalogSchema>,
    "vulnerabilities"
>;

/**
 * Append-only header row for one successful CISA KEV catalog snapshot.
 */
@Entity({ name: "kev_catalog_fetches" })
export class KevCatalogFetch {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "bigint" })
    fetchedAtUnixSeconds!: bigint;

    @Column({ type: "varchar", length: 64 })
    catalogVersion!: string;

    @Column({ type: "varchar", length: 64 })
    dateReleased!: string;

    @Column({ type: "integer" })
    vulnerabilityCount!: number;

    @Column({ type: "text", nullable: true })
    title!: string | null;

    /**
     * Envelope-level fields from the parsed catalog (excluding `vulnerabilities`),
     * including any keys allowed by `.loose()` on {@link CisaKevCatalogSchema}.
     */
    @Column({ type: "jsonb" })
    catalogEnvelope!: KevCatalogFetchEnvelopeJson;
}
