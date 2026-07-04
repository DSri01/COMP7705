import { Module } from '@nestjs/common';
import { CveResearchDocumentsController } from './cve_research_documents.controller.js';
import { CveResearchDocumentsService } from './cve_research_documents.service.js';

@Module({
  providers: [CveResearchDocumentsService],
  controllers: [CveResearchDocumentsController],
  exports: [CveResearchDocumentsService],
})
export class CveResearchDocumentsModule {}
