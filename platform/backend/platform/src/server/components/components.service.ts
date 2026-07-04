import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { DATA_SOURCE } from '../database/database.constants.js';
import { Component } from '../../db/entities/components/definition.js';
import { Project } from '../../db/entities/projects/definition.js';
import { ContainerImage } from '../../db/entities/container_images/definition.js';
import { ImageCve } from '../../db/entities/image_cve/definition.js';
import { CreateComponentDto } from './dto/create-component.dto.js';
import { UpdateComponentDto } from './dto/update-component.dto.js';
import { getCurrentTimeUnixSeconds } from '../../utils/time.js';
import { randomUUID } from 'crypto';
import {
  assembleOpenVexDocument,
  serializeStoredStatement,
  type StoredInternalStatement,
} from '../../vex/internal.js';
import { APP_CONFIGURATION } from '../configuration/configuration.constants.js';
import { AppConfigurationSchema } from '../../configuration/schema.js';
import type { z } from 'zod';
import { ContainerScannerAPIClient } from '../../apiClients/container_scanner/definition.js';
import { runContainerRescanForImage } from '../../containerRescan/definition.js';
import {
  accumulateImageCveStats,
  createEmptyImageCveStats,
  type ImageCveStats,
} from '../components/image_cves/image_cve_stats.js';

@Injectable()
export class ComponentsService {
  private readonly componentRepo: Repository<Component>;
  private readonly projectRepo: Repository<Project>;
  private readonly containerImageRepo: Repository<ContainerImage>;
  private readonly containerScannerClient: ContainerScannerAPIClient;

  constructor(
    @Inject(DATA_SOURCE) private readonly dataSource: DataSource,
    @Inject(APP_CONFIGURATION) private readonly configuration: z.infer<typeof AppConfigurationSchema>,
  ) {
    this.componentRepo = dataSource.getRepository(Component);
    this.projectRepo = dataSource.getRepository(Project);
    this.containerImageRepo = dataSource.getRepository(ContainerImage);
    this.containerScannerClient = new ContainerScannerAPIClient(configuration.containerScanner.url);
  }

  async list(projectId: string): Promise<Component[]> {
    await this.getProjectById(projectId);
    return this.componentRepo.find({
      where: { project: { id: projectId } },
      relations: { project: true },
    });
  }

  async getById(projectId: string, componentId: string): Promise<Component> {
    await this.getProjectById(projectId);
    const component = await this.componentRepo.findOne({
      where: { id: componentId, project: { id: projectId } },
      relations: { project: true },
    });
    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
    }
    return component;
  }

  async create(projectId: string, dto: CreateComponentDto): Promise<Component> {
    const project = await this.getProjectById(projectId);
    const now = getCurrentTimeUnixSeconds();
    const component = this.componentRepo.create({
      name: dto.name,
      description: dto.description,
      project,
      createdAtUnixSeconds: now,
      updatedAtUnixSeconds: now,
    });
    return this.componentRepo.save(component);
  }

  async update(projectId: string, componentId: string, dto: UpdateComponentDto): Promise<Component> {
    const component = await this.getById(projectId, componentId);
    component.description = dto.description;
    component.updatedAtUnixSeconds = getCurrentTimeUnixSeconds();
    return this.componentRepo.save(component);
  }

  async exportVex(projectId: string, componentId: string): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const component = await manager.getRepository(Component).findOne({
        where: { id: componentId, project: { id: projectId } },
        relations: { project: true },
      });
      if (!component) {
        throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
      }

      const image = await manager.getRepository(ContainerImage).findOne({
        where: { component: { id: componentId } },
        order: { chainIndex: 'DESC' },
      });
      if (!image) {
        throw new NotFoundException(`No images found for component ${componentId} in project ${projectId}`);
      }

      const rows = await manager.getRepository(ImageCve).find({
        where: { containerImage: { id: image.id } },
        relations: { cve: true },
        order: { cve: { cveId: 'ASC' } },
      });

      const now = getCurrentTimeUnixSeconds();
      const productId = `https://comp7705platform/${projectId}/${componentId}/${image.id}`;
      const statements = rows
        .filter((row: ImageCve) => !this.isDisableActive(row))
        .map((row: ImageCve) => {
          const stored = this.normalizeStoredStatementForExport(row, now);
          return serializeStoredStatement(stored, {
            statementTimestamp: this.unixSecondsToIsoUtc(row.decisionRecordedAtUnixSeconds),
            vulnerabilityName: row.cve.cveId,
            productId,
          });
        });

      return assembleOpenVexDocument({
        documentId: `urn:uuid:${randomUUID()}`,
        documentTimestamp: this.unixSecondsToIsoUtc(now),
        statements,
      }) as Record<string, unknown>;
    });
  }

  async triggerScan(
    projectId: string,
    componentId: string,
  ): Promise<{ status: 'ok' | 'container_not_uploaded' }> {
    await this.getById(projectId, componentId);
    const image = await this.containerImageRepo.findOne({
      where: { component: { id: componentId } },
      relations: { component: true, storedFile: true },
      order: { chainIndex: 'DESC' },
    });
    if (!image) {
      throw new NotFoundException(`No images found for component ${componentId} in project ${projectId}`);
    }

    const isReadyTar =
      image.storedFile.status === 'ready' &&
      (image.storedFile.extension ?? '').toLowerCase() === 'tar';
    if (!isReadyTar) {
      image.scanResultCode = 'container_not_uploaded';
      await this.containerImageRepo.save(image);
      return { status: 'container_not_uploaded' };
    }

    void runContainerRescanForImage(
      this.dataSource,
      { containerScanner: this.containerScannerClient },
      image.id,
      getCurrentTimeUnixSeconds,
    ).catch((error: unknown) => {
      // fire-and-forget path: failures are logged and state is finalized by shared service.
      console.error(
        `Component scan trigger failed for image ${image.id}:`,
        error instanceof Error ? error : new Error(String(error)),
      );
    });

    return { status: 'ok' };
  }

  async getStats(projectId: string, componentId: string): Promise<ImageCveStats> {
    await this.getById(projectId, componentId);
    const latestImage = await this.containerImageRepo.findOne({
      where: { component: { id: componentId } },
      order: { chainIndex: 'DESC' },
    });
    const stats = createEmptyImageCveStats();
    if (!latestImage) {
      return stats;
    }
    const rows = await this.dataSource.getRepository(ImageCve).find({
      where: {
        containerImage: { id: latestImage.id },
        isDisabled: false,
      },
      relations: { cve: true },
    });
    accumulateImageCveStats(stats, rows, getCurrentTimeUnixSeconds());
    return stats;
  }

  private async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private unixSecondsToIsoUtc(seconds: bigint): string {
    const ms = Number(seconds) * 1000;
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  private isDisableActive(row: ImageCve): boolean {
    return row.isDisabled;
  }

  private normalizeStoredStatementForExport(
    row: ImageCve,
    now: bigint,
  ): StoredInternalStatement {
    const stored = row.storedInternalStatement;

    if (stored.status === 'not_affected') {
      if (row.expiryTimeUnixSeconds != null && now > row.expiryTimeUnixSeconds) {
        return {
          status: 'under_investigation',
          context: {
            type: 'expired',
            expiredDecision: {
              status: 'not_affected',
              justification: stored.justification,
              impact_statement: stored.impact_statement,
              status_notes: stored.status_notes,
            },
          },
        };
      }
      return stored;
    }

    if (stored.status === 'affected') {
      if (row.expiryTimeUnixSeconds != null && now > row.expiryTimeUnixSeconds) {
        return {
          status: 'under_investigation',
          context: {
            type: 'expired',
            expiredDecision: {
              status: 'affected',
              action_statement: stored.action_statement,
              status_notes: stored.status_notes,
            },
          },
        };
      }
      return stored;
    }

    return stored;
  }
}
