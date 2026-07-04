import { NestFactory } from '@nestjs/core';
import type { z } from 'zod';
import type { DataSource } from 'typeorm';

import type { PlatformDbToolContext } from '../../../agents/tool-registry/db/context.js';
import type { AppConfigurationSchema } from '../../../configuration/schema.js';
import { createDataSource } from '../../../db/data-source.js';
import { CveResearchDocumentsService } from '../../../server/components/cve_research_documents/cve_research_documents.service.js';
import { CvesService } from '../../../server/components/cves/cves.service.js';
import { ImageCvesService } from '../../../server/components/image_cves/image_cves.service.js';
import { ComponentsService } from '../../../server/components/components.service.js';
import { ContainerImagesService } from '../../../server/container_images/container_images.service.js';
import { AppModule } from '../../../server/definition.js';
import { ProjectsService } from '../../../server/projects/projects.service.js';

/** Nest bootstrap result for agent CLIs that need live DB tools. */
export interface CliPlatformDbBootstrap {
    dbTools: PlatformDbToolContext;
    shutdown: () => Promise<void>;
}

/**
 * Starts a minimal Nest application (no HTTP agents) and returns {@link PlatformDbToolContext}
 * backed by the same services as REST/MCP.
 */
export async function createCliPlatformDbToolContext(
    configuration: z.infer<typeof AppConfigurationSchema>,
): Promise<CliPlatformDbBootstrap> {
    const dataSource = await createDataSource({
        type: 'postgres',
        host: configuration.db.host,
        port: configuration.db.port,
        username: configuration.db.username,
        password: configuration.db.password,
        database: configuration.db.database,
        synchronize: true,
        logging: false,
    });

    const app = await NestFactory.create(AppModule.forDataSource(dataSource, configuration, false), {
        logger: false,
    });
    await app.init();

    const dbTools: PlatformDbToolContext = {
        projectsService: app.get(ProjectsService),
        componentsService: app.get(ComponentsService),
        containerImagesService: app.get(ContainerImagesService),
        imageCvesService: app.get(ImageCvesService),
        cvesService: app.get(CvesService),
        cveResearchDocumentsService: app.get(CveResearchDocumentsService),
    };

    return {
        dbTools,
        shutdown: async () => {
            await app.close();
            await destroyDataSourceIfInitialized(dataSource);
        },
    };
}

async function destroyDataSourceIfInitialized(dataSource: DataSource): Promise<void> {
    if (dataSource.isInitialized) {
        await dataSource.destroy();
    }
}
