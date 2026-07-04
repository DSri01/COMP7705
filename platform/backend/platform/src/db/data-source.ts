import { DataSource } from "typeorm";
import { Project } from "./entities/projects/definition.js";
import { ContainerImage } from "./entities/container_images/definition.js";
import { StoredFile } from "./entities/stored_files/definition.js";
import { Component } from "./entities/components/definition.js";
import { KevCatalogFetch } from "./entities/kev_catalog_fetches/definition.js";
import { KevCatalogEntry } from "./entities/kev_catalog_entries/definition.js";
import { Cve } from "./entities/cves/definition.js";
import { CveResearchDocument } from "./entities/cve_research_documents/definition.js";
import { ImageCve } from "./entities/image_cve/definition.js";

interface DBConfig {
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
}

export async function createDataSource(config: DBConfig): Promise<DataSource> {
    const dataSource = new DataSource({
        type: config.type,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,

        entities: [
            Project,
            Component,
            StoredFile,
            ContainerImage,
            KevCatalogFetch,
            KevCatalogEntry,
            Cve,
            CveResearchDocument,
            ImageCve,
        ],
        synchronize: config.synchronize,
        logging: config.logging,
    });
    await dataSource.initialize();
    return dataSource;
}