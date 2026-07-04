import { Module } from '@nestjs/common';
import { ComponentsService } from './components.service.js';
import { ComponentsController } from './components.controller.js';
import { CvesModule } from './cves/cves.module.js';
import { CveResearchDocumentsModule } from './cve_research_documents/cve_research_documents.module.js';
import { ImageCvesModule } from './image_cves/image_cves.module.js';

@Module({
  imports: [CvesModule, CveResearchDocumentsModule, ImageCvesModule],
  providers: [ComponentsService],
  controllers: [ComponentsController],
  exports: [ComponentsService, ImageCvesModule, CvesModule, CveResearchDocumentsModule],
})
export class ComponentsModule {}
