import { Module } from '@nestjs/common';
import { ImageCvesController } from './image_cves.controller.js';
import { ImageCvesService } from './image_cves.service.js';

@Module({
  providers: [ImageCvesService],
  controllers: [ImageCvesController],
  exports: [ImageCvesService],
})
export class ImageCvesModule {}
