import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import path from 'path';
import { DATA_SOURCE } from '../database/database.constants.js';
import { ContainerImage } from '../../db/entities/container_images/definition.js';
import { Component } from '../../db/entities/components/definition.js';
import { StoredFile } from '../../db/entities/stored_files/definition.js';
import { ImageCve, type ImageCveSource } from '../../db/entities/image_cve/definition.js';
import { getCurrentTimeUnixSeconds } from '../../utils/time.js';
import { FileStorageService } from './file-storage.service.js';
import type { UploadedFileInput } from './file-storage.service.js';
import type { StoredInternalStatement } from '../../vex/internal.js';

@Injectable()
export class ContainerImagesService {
  private readonly imageRepo: Repository<ContainerImage>;
  private readonly componentRepo: Repository<Component>;
  private readonly storedFileRepo: Repository<StoredFile>;

  constructor(
    @Inject(DATA_SOURCE) private readonly dataSource: DataSource,
    private readonly fileStorageService: FileStorageService,
  ) {
    this.imageRepo = dataSource.getRepository(ContainerImage);
    this.componentRepo = dataSource.getRepository(Component);
    this.storedFileRepo = dataSource.getRepository(StoredFile);
  }

  async create(projectId: string, componentId: string): Promise<ContainerImage> {
    const now = getCurrentTimeUnixSeconds();
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const component = await manager.getRepository(Component).findOne({
        where: { id: componentId, project: { id: projectId } },
        relations: { project: true },
      });
      if (!component) {
        throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
      }

      const previousImage = await manager.getRepository(ContainerImage).findOne({
        where: { component: { id: componentId } },
        order: { chainIndex: 'DESC' },
      });
      const nextChainIndex = (previousImage?.chainIndex ?? 0) + 1;

      const storedFile = manager.getRepository(StoredFile).create({
        extension: null,
        sizeBytes: null,
        status: 'awaiting_upload',
        uploadStartedAtUnixSeconds: null,
        createdAtUnixSeconds: now,
      });
      await manager.getRepository(StoredFile).save(storedFile);

      const image = manager.getRepository(ContainerImage).create({
        component,
        chainIndex: nextChainIndex,
        storedFile,
        createdAtUnixSeconds: now,
        uploadFinishedAtUnixSeconds: null,
      });
      const savedImage = await manager.getRepository(ContainerImage).save(image);

      if (previousImage) {
        const previousRows = await manager.getRepository(ImageCve).find({
          where: { containerImage: { id: previousImage.id } },
          relations: { cve: true },
        });

        if (previousRows.length > 0) {
          const copiedRows = previousRows.map((row) =>
            manager.getRepository(ImageCve).create({
              containerImage: savedImage,
              cve: row.cve,
              source: 'fromChain' as ImageCveSource,
              firstIntroducedChainIndex: row.firstIntroducedChainIndex,
              originalSource: row.originalSource,
              isDisabled: row.isDisabled,
              disabledReason: row.disabledReason,
              advice: row.advice,
              storedInternalStatement: this.copyStoredStatementForChain(row.storedInternalStatement),
              expiryTimeUnixSeconds: null,
              decisionRecordedAtUnixSeconds: now,
            }),
          );
          await manager.getRepository(ImageCve).save(copiedRows);
        }
      }

      return savedImage;
    });
  }

  async list(projectId: string, componentId: string): Promise<ContainerImage[]> {
    await this.getComponentInProject(projectId, componentId);
    return this.imageRepo.find({
      where: { component: { id: componentId } },
      relations: { component: true, storedFile: true },
      order: { chainIndex: 'DESC' },
    });
  }

  async getCurrent(projectId: string, componentId: string): Promise<ContainerImage> {
    await this.getComponentInProject(projectId, componentId);
    const image = await this.imageRepo.findOne({
      where: { component: { id: componentId } },
      relations: { component: true, storedFile: true },
      order: { chainIndex: 'DESC' },
    });
    if (!image) {
      throw new NotFoundException(`No images found for component ${componentId} in project ${projectId}`);
    }
    return image;
  }

  async getById(projectId: string, componentId: string, imageId: string): Promise<ContainerImage> {
    await this.getComponentInProject(projectId, componentId);
    const image = await this.imageRepo.findOne({
      where: { id: imageId, component: { id: componentId } },
      relations: { component: true, storedFile: true },
    });
    if (!image) {
      throw new NotFoundException(`Image ${imageId} not found in component ${componentId}`);
    }
    return image;
  }

  async upload(projectId: string, componentId: string, imageId: string, file: UploadedFileInput): Promise<ContainerImage> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const extension = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (!extension) {
      throw new BadRequestException('File extension is required');
    }
    if (extension !== 'tar') {
      throw new BadRequestException('Only .tar files are supported');
    }

    const image = await this.getById(projectId, componentId, imageId);
    const storedFile = image.storedFile;

    if (storedFile.status !== 'awaiting_upload') {
      throw new ConflictException(`File upload is only allowed when status is awaiting_upload (got ${storedFile.status})`);
    }

    const now = getCurrentTimeUnixSeconds();

    storedFile.status = 'uploading';
    storedFile.uploadStartedAtUnixSeconds = now;
    storedFile.extension = extension;
    await this.storedFileRepo.save(storedFile);

    try {
      const { sizeBytes } = await this.fileStorageService.storeUploadedFile(
        storedFile.id,
        extension,
        file,
      );

      const latestStoredFile = await this.storedFileRepo.findOneBy({ id: storedFile.id });
      if (!latestStoredFile) {
        throw new NotFoundException(`Stored file ${storedFile.id} not found`);
      }
      if (latestStoredFile.status === 'failed') {
        return this.getById(projectId, componentId, imageId);
      }
      if (latestStoredFile.status !== 'uploading') {
        throw new ConflictException(`Stored file ${storedFile.id} is no longer uploading`);
      }

      latestStoredFile.sizeBytes = sizeBytes;
      latestStoredFile.status = 'ready';
      await this.storedFileRepo.save(latestStoredFile);
    } catch (error) {
      const latestStoredFile = await this.storedFileRepo.findOneBy({ id: storedFile.id });
      if (latestStoredFile && latestStoredFile.status === 'uploading') {
        latestStoredFile.status = 'failed';
        await this.storedFileRepo.save(latestStoredFile);
      }
      throw error;
    }

    image.uploadFinishedAtUnixSeconds = now;
    return this.imageRepo.save(image);
  }

  private async getComponentInProject(projectId: string, componentId: string): Promise<Component> {
    const component = await this.componentRepo.findOne({
      where: { id: componentId, project: { id: projectId } },
      relations: { project: true },
    });
    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
    }
    return component;
  }

  private copyStoredStatementForChain(statement: StoredInternalStatement): StoredInternalStatement {
    if (statement.status === 'not_affected') {
      return {
        status: 'under_investigation',
        context: {
          type: 'carry_forward',
          priorDecision: {
            status: 'not_affected',
            justification: statement.justification,
            impact_statement: statement.impact_statement,
            status_notes: statement.status_notes,
          },
        },
      };
    }

    if (statement.status === 'affected') {
      return {
        status: 'under_investigation',
        context: {
          type: 'carry_forward',
          priorDecision: {
            status: 'affected',
            action_statement: statement.action_statement,
            status_notes: statement.status_notes,
          },
        },
      };
    }

    return {
      status: 'under_investigation',
      context: statement.context,
    };
  }
}
