import { Module } from '@nestjs/common';
import { CvesController } from './cves.controller.js';
import { CvesService } from './cves.service.js';

@Module({
  providers: [CvesService],
  controllers: [CvesController],
  exports: [CvesService],
})
export class CvesModule {}
