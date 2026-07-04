import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContainerImagesService } from './container_images.service.js';
import { ContainerImageResponseDto } from './dto/container-image-response.dto.js';
import type { ContainerImage } from '../../db/entities/container_images/definition.js';
import type { UploadedFileInput } from './file-storage.service.js';

@ApiTags('container-images')
@Controller('projects/:projectId/components/:componentId/images')
export class ContainerImagesController {
  constructor(private readonly containerImagesService: ContainerImagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create image placeholder in a component' })
  @ApiCreatedResponse({ description: 'Image placeholder created', type: ContainerImageResponseDto })
  async create(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<ContainerImageResponseDto> {
    const image = await this.containerImagesService.create(projectId, componentId);
    return this.toResponse(image);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current image in a component' })
  @ApiOkResponse({ description: 'Current image', type: ContainerImageResponseDto })
  async getCurrent(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<ContainerImageResponseDto> {
    const image = await this.containerImagesService.getCurrent(projectId, componentId);
    return this.toResponse(image);
  }

  @Get(':imageId')
  @ApiOperation({ summary: 'Get a specific image by ID in a component' })
  @ApiOkResponse({ description: 'Image details', type: ContainerImageResponseDto })
  async getById(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageId') imageId: string,
  ): Promise<ContainerImageResponseDto> {
    const image = await this.containerImagesService.getById(projectId, componentId, imageId);
    return this.toResponse(image);
  }

  @Get()
  @ApiOperation({ summary: 'List images in a component by descending chain index' })
  @ApiOkResponse({ description: 'Images list', type: ContainerImageResponseDto, isArray: true })
  async list(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<ContainerImageResponseDto[]> {
    const images = await this.containerImagesService.list(projectId, componentId);
    return images.map((image) => this.toResponse(image));
  }

  @Post(':imageId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload container tar for an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Image upload finalized', type: ContainerImageResponseDto })
  async upload(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageId') imageId: string,
    @UploadedFile() file: UploadedFileInput,
  ): Promise<ContainerImageResponseDto> {
    const image = await this.containerImagesService.upload(projectId, componentId, imageId, file);
    return this.toResponse(image);
  }

  private toResponse(image: ContainerImage): ContainerImageResponseDto {
    return {
      id: image.id,
      componentId: image.component.id,
      storedFileId: image.storedFile.id,
      chainIndex: image.chainIndex,
      fileStatus: image.storedFile.status,
      fileExtension: image.storedFile.extension,
      fileSizeBytes: image.storedFile.sizeBytes,
      fileUploadStartedAtUnixSeconds: image.storedFile.uploadStartedAtUnixSeconds?.toString() ?? null,
      createdAtUnixSeconds: image.createdAtUnixSeconds.toString(),
      uploadFinishedAtUnixSeconds: image.uploadFinishedAtUnixSeconds?.toString() ?? null,
      scanResultCode: image.scanResultCode,
      scanAttemptedAtUnixSeconds: image.scanAttemptedAtUnixSeconds.toString(),
      scanFinishedAtUnixSeconds: image.scanFinishedAtUnixSeconds.toString(),
    };
  }
}
