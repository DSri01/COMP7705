import type { DataSource } from "typeorm";
import type pino from "pino";
import type { ProjectsService } from "../server/projects/projects.service.js";
import type { ComponentsService } from "../server/components/components.service.js";
import type { ContainerImagesService } from "../server/container_images/container_images.service.js";
import type { ImageCvesService } from "../server/components/image_cves/image_cves.service.js";
import type { CvesService } from "../server/components/cves/cves.service.js";
import type { CveResearchDocumentsService } from "../server/components/cve_research_documents/cve_research_documents.service.js";

/**
 * Dependencies shared across all MCP sessions. Built once at application bootstrap.
 */
export interface PlatformMcpToolContext {
  dataSource: DataSource;
  mcpLogger: pino.Logger;
  projectsService: ProjectsService;
  componentsService: ComponentsService;
  containerImagesService: ContainerImagesService;
  imageCvesService: ImageCvesService;
  cvesService: CvesService;
  cveResearchDocumentsService: CveResearchDocumentsService;
}
