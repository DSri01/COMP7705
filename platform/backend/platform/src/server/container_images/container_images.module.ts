import { Module } from '@nestjs/common';
import { ContainerImagesController } from './container_images.controller.js';
import { ContainerImagesService } from './container_images.service.js';
import { FileStorageService } from './file-storage.service.js';

@Module({
  providers: [ContainerImagesService, FileStorageService],
  controllers: [ContainerImagesController],
  exports: [ContainerImagesService],
})
export class ContainerImagesModule {}
