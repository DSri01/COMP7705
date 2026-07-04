import { type DynamicModule, Module } from '@nestjs/common';
import type { z } from 'zod';

import { buildPlatformAgentRegistry } from '../../agents/manifest.js';
import { AppConfigurationSchema } from '../../configuration/schema.js';
import { ComponentsModule } from '../components/components.module.js';
import { ContainerImagesModule } from '../container_images/container_images.module.js';
import { APP_CONFIGURATION } from '../configuration/configuration.constants.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { ComponentsService } from '../components/components.service.js';
import { ContainerImagesService } from '../container_images/container_images.service.js';
import { CveResearchDocumentsService } from '../components/cve_research_documents/cve_research_documents.service.js';
import { CvesService } from '../components/cves/cves.service.js';
import { ImageCvesService } from '../components/image_cves/image_cves.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { AGENT_REGISTRY, type AgentRegistry } from './agent-registry.js';

/**
 * Provides the global {@link AGENT_REGISTRY} built after Nest DI is ready
 * ({@link buildPlatformAgentRegistry} with injected platform services).
 */
@Module({})
export class AgentsModule {
    /** Registers agents using DB services from the running application (Option B′). */
    static forAgentsAsync(): DynamicModule {
        return {
            module: AgentsModule,
            global: true,
            imports: [ProjectsModule, ComponentsModule, ContainerImagesModule],
            providers: [
                {
                    provide: AGENT_REGISTRY,
                    useFactory: (
                        configuration: z.infer<typeof AppConfigurationSchema>,
                        projectsService: ProjectsService,
                        componentsService: ComponentsService,
                        containerImagesService: ContainerImagesService,
                        imageCvesService: ImageCvesService,
                        cvesService: CvesService,
                        cveResearchDocumentsService: CveResearchDocumentsService,
                    ) =>
                        buildPlatformAgentRegistry({
                            configuration,
                            dbTools: {
                                projectsService,
                                componentsService,
                                containerImagesService,
                                imageCvesService,
                                cvesService,
                                cveResearchDocumentsService,
                            },
                        }),
                    inject: [
                        APP_CONFIGURATION,
                        ProjectsService,
                        ComponentsService,
                        ContainerImagesService,
                        ImageCvesService,
                        CvesService,
                        CveResearchDocumentsService,
                    ],
                },
            ],
            exports: [AGENT_REGISTRY],
        };
    }

    /** @deprecated Prefer {@link forAgentsAsync} so DB tools receive Nest services. */
    static forAgents(registry: AgentRegistry): DynamicModule {
        return {
            module: AgentsModule,
            global: true,
            providers: [{ provide: AGENT_REGISTRY, useValue: registry }],
            exports: [AGENT_REGISTRY],
        };
    }
}
