import { add } from './adder.js';
import { loadConfiguration } from './configuration/definition.js';
import { createDataSource } from './db/data-source.js';
import { Project } from './db/entities/projects/definition.js';
import { StoredFile } from './db/entities/stored_files/definition.js';
import { ContainerImage } from './db/entities/container_images/definition.js';
import { AppModule } from './server/definition.js';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { StoredFileUploadTimeoutWorker } from './workers/storedFileUploadTimeout/definition.js';
import { DataSource } from 'typeorm';
import { Logger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigurationSchema } from './configuration/schema.js';
import { z } from 'zod';
import { CISA_KEV_CatalogAPIClient } from './apiClients/cisa_kev_catalog/definition.js';
import { CISA_KEV_fetchWorker } from './workers/CISA_KEV_fetch/definition.js';
import { CveIntelRefreshWorker } from './workers/cveIntelRefresh/definition.js';
import { NVD_CVE_APIClient } from './apiClients/nvd_cve/definition.js';
import { EPSS_APIClient } from './apiClients/epss/definition.js';
import { ImageCveDecisionExpiryRefreshWorker } from './workers/imageCveDecisionExpiryRefresh/definition.js';
import { ContainerScannerAPIClient } from './apiClients/container_scanner/definition.js';
import { ContainerRescanWorker } from './workers/containerRescan/definition.js';
import { registerPlatformMcpRoutes } from './mcp/definition.js';
import { ProjectsService } from './server/projects/projects.service.js';
import { ComponentsService } from './server/components/components.service.js';
import { ContainerImagesService } from './server/container_images/container_images.service.js';
import { ImageCvesService } from './server/components/image_cves/image_cves.service.js';
import { CvesService } from './server/components/cves/cves.service.js';
import { CveResearchDocumentsService } from './server/components/cve_research_documents/cve_research_documents.service.js';

// worker configuration
/**
 * The interval at which the workers will run.
 */
const WORKER_INTERVAL_SECONDS = 60;
/**
 * The timeout after which a stored file will be marked as failed if it is still uploading.
 */
const STORED_FILE_UPLOAD_TIMEOUT_SECONDS = 1800;
/**
 * The refresh delta for the CISA KEV catalog in seconds.
 */
const CISA_KEV_FETCH_REFRESH_DELTA_SECONDS = 2 * 24 * 3600;
/**
 * The refresh delta for the CVE Intel in seconds.
 */
const CVE_INTEL_REFRESH_DELTA_SECONDS = 2 * 24 * 3600;
/**
 * The stale refresh batch size for the CVE Intel in seconds.
 */
const CVE_INTEL_STALE_REFRESH_BATCH_SIZE = 4;
/**
 * The stale refresh batch size for image-CVE decision expiry refresh worker.
 */
const IMAGE_CVE_DECISION_EXPIRY_REFRESH_STALE_BATCH_SIZE = 50;
/**
 * The refresh delta for the container rescan worker.
 */
const CONTAINER_RESCAN_REFRESH_DELTA_SECONDS = 2 * 24 * 3600;

/**
 * Starts the workers.
 * 
 * @param dataSource - The data source to use for the workers.
 * @param logger - The logger to use for the workers.
 */
async function startWorkers(
    dataSource: DataSource,
    logger: PinoLogger,
    appConfiguration: z.infer<typeof AppConfigurationSchema>
) {
    if (appConfiguration.workers.storedFileUploadTimeout.state === "enabled") {
        logger.info("stored file upload timeout worker is enabled", { workerName: "storedFileUploadTimeout" });
        const storedFileUploadTimeoutWorker = new StoredFileUploadTimeoutWorker(
            dataSource,
            WORKER_INTERVAL_SECONDS,
            STORED_FILE_UPLOAD_TIMEOUT_SECONDS,
            logger,
        );
        storedFileUploadTimeoutWorker.startLoop();
    }

    if (appConfiguration.workers.cisaKevFetch.state === "enabled") {
        logger.info("CISA KEV fetch worker is enabled", { workerName: "cisaKevFetch" });
        const cisaKevFetchWorker = new CISA_KEV_fetchWorker(
            dataSource,
            WORKER_INTERVAL_SECONDS,
            CISA_KEV_FETCH_REFRESH_DELTA_SECONDS,
            logger,
            new CISA_KEV_CatalogAPIClient(),
        );
        cisaKevFetchWorker.startLoop();
    }

    if (appConfiguration.workers.cveIntelRefresh.state === "enabled") {
        logger.info("CVE Intel refresh worker is enabled", { workerName: "cveIntelRefresh" });
        const cveIntelRefreshWorker = new CveIntelRefreshWorker(
            dataSource,
            WORKER_INTERVAL_SECONDS,
            CVE_INTEL_REFRESH_DELTA_SECONDS,
            logger,
            new NVD_CVE_APIClient(appConfiguration.secrets.nvdApiKey),
            new EPSS_APIClient(),
            CVE_INTEL_STALE_REFRESH_BATCH_SIZE,
        );
        cveIntelRefreshWorker.startLoop();
    }

    if (appConfiguration.workers.imageCveDecisionExpiryRefresh.state === "enabled") {
        logger.info("Image CVE decision expiry refresh worker is enabled", { workerName: "imageCveDecisionExpiryRefresh" });
        const imageCveDecisionExpiryRefreshWorker = new ImageCveDecisionExpiryRefreshWorker(
            dataSource,
            WORKER_INTERVAL_SECONDS,
            logger,
            IMAGE_CVE_DECISION_EXPIRY_REFRESH_STALE_BATCH_SIZE,
        );
        imageCveDecisionExpiryRefreshWorker.startLoop();
    }

    if (appConfiguration.workers.containerRescan.state === "enabled") {
        logger.info("Container rescan worker is enabled", { workerName: "containerRescan" });
        const containerScannerClient = new ContainerScannerAPIClient(appConfiguration.containerScanner.url);
        const containerRescanWorker = new ContainerRescanWorker(
            dataSource,
            WORKER_INTERVAL_SECONDS,
            CONTAINER_RESCAN_REFRESH_DELTA_SECONDS,
            logger,
            containerScannerClient,
        );
        containerRescanWorker.startLoop();
    }
}


async function main() {
    config({
        path: '.env',
    });
    const configuration = loadConfiguration();
    const dataSource = await createDataSource({
        type: "postgres",
        host: configuration.db.host,
        port: configuration.db.port,
        username: configuration.db.username,
        password: configuration.db.password,
        database: configuration.db.database,
        synchronize: true,
        logging: false,
    });

    const swaggerConfig = new DocumentBuilder()
                                .setTitle('Platform API')
                                .setVersion('1.0.0')
                                .build();

    const app = await NestFactory.create(
        AppModule.forDataSource(dataSource, configuration),
        {
            bufferLogs: true,
        }
    );
    const logger = await app.resolve(PinoLogger);
    const expressApp = app.getHttpAdapter().getInstance();
    const projectsService = app.get(ProjectsService);
    const componentsService = app.get(ComponentsService);
    const containerImagesService = app.get(ContainerImagesService);
    const imageCvesService = app.get(ImageCvesService);
    const cvesService = app.get(CvesService);
    const cveResearchDocumentsService = app.get(CveResearchDocumentsService);
    registerPlatformMcpRoutes(expressApp, {
        dataSource,
        mcpLogger: logger.logger.child({ component: 'mcp' }),
        projectsService,
        componentsService,
        containerImagesService,
        imageCvesService,
        cvesService,
        cveResearchDocumentsService,
    }, '/mcp');
    // start workers
    await startWorkers(
        dataSource,
        logger,
        configuration,
    );
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, openApiDoc, {
        jsonDocumentUrl: 'api-docs-json',
        yamlDocumentUrl: 'api-docs-yaml',
    });
    app.useLogger(app.get(Logger));
    await app.listen(configuration.server.port);
}

main().catch(console.error);