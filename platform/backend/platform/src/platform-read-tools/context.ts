import type { ComponentsService } from '../server/components/components.service.js';
import type { CveResearchDocumentsService } from '../server/components/cve_research_documents/cve_research_documents.service.js';
import type { CvesService } from '../server/components/cves/cves.service.js';
import type { ImageCvesService } from '../server/components/image_cves/image_cves.service.js';
import type { ContainerImagesService } from '../server/container_images/container_images.service.js';
import type { ProjectsService } from '../server/projects/projects.service.js';

/**
 * Nest services for platform DB read tools (shared by MCP and agent tool-registry).
 * Same service surface as {@link PlatformMcpToolContext} without MCP-only fields.
 */
export interface PlatformReadToolContext {
    projectsService: ProjectsService;
    componentsService: ComponentsService;
    containerImagesService: ContainerImagesService;
    imageCvesService: ImageCvesService;
    cvesService: CvesService;
    cveResearchDocumentsService: CveResearchDocumentsService;
}
