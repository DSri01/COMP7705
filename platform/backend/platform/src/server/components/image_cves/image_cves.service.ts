import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.constants.js';
import { ImageCve } from '../../../db/entities/image_cve/definition.js';
import { Cve } from '../../../db/entities/cves/definition.js';
import { ContainerImage } from '../../../db/entities/container_images/definition.js';
import { Component } from '../../../db/entities/components/definition.js';
import { getCurrentTimeUnixSeconds } from '../../../utils/time.js';
import { assertCanonicalCveId } from '../cves/cve-id.util.js';
import {
  buildFreshUnderInvestigationStatement,
  imageCveToDetail,
  imageCveToListItem,
} from './image_cves.mapper.js';
import { buildStoredAdvice } from './advice.js';
import type { ImageCveDetailDto, ImageCveListItemDto } from './image_cves.types.js';
import { DecisionSnapshotSchema, type StoredInternalStatement } from '../../../vex/internal.js';
import type { z } from 'zod';
import { ZodError, z as zod } from 'zod';
import { refreshImageCveDecisionExpiry } from '../../../imageCveDecisionExpiryRefresh/definition.js';

type ReusableSnapshot = z.infer<typeof DecisionSnapshotSchema>;
type DecisionInput = zod.infer<typeof DecisionInputSchema>;

const DecisionInputSchema = zod.discriminatedUnion('status', [
  zod.object({
    status: zod.literal('not_affected'),
    justification: zod.enum([
      'component_not_present',
      'vulnerable_code_not_present',
      'vulnerable_code_not_in_execute_path',
      'vulnerable_code_cannot_be_controlled_by_adversary',
      'inline_mitigations_already_exist',
    ]),
    impact_statement: zod.string(),
    status_notes: zod.string(),
    expiryTimeUnixSeconds: zod.string(),
  }),
  zod.object({
    status: zod.literal('affected'),
    action_statement: zod.string(),
    status_notes: zod.string(),
    expiryTimeUnixSeconds: zod.string(),
  }),
  zod.object({
    status: zod.literal('under_investigation'),
  }),
]);

@Injectable()
export class ImageCvesService {
  private readonly imageCveRepo: Repository<ImageCve>;

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {
    this.imageCveRepo = dataSource.getRepository(ImageCve);
  }

  /**
   * Links CVEs that already exist in `cves` to the component's current image.
   * Existing image-CVE rows only have `source` set to `manual`.
   */
  async linkToCurrentImage(
    projectId: string,
    componentId: string,
    cveIds: string[],
  ): Promise<{ status: 'ok' }> {
    const uniqueIds = [...new Set(cveIds)];
    for (const cveId of uniqueIds) {
      assertCanonicalCveId(cveId);
    }

    const now = getCurrentTimeUnixSeconds();
    await this.dataSource.transaction(async (manager) => {
      const component = await manager.getRepository(Component).findOne({
        where: { id: componentId, project: { id: projectId } },
        relations: { project: true },
      });
      if (!component) {
        throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
      }

      const currentImage = await manager.getRepository(ContainerImage).findOne({
        where: { component: { id: componentId } },
        order: { chainIndex: 'DESC' },
      });
      if (!currentImage) {
        throw new NotFoundException(
          `No container image for component ${componentId}; create one before linking CVEs`,
        );
      }

      for (const cveId of uniqueIds) {
        const cve = await manager.getRepository(Cve).findOne({ where: { cveId } });
        if (!cve) {
          throw new NotFoundException(
            `CVE ${cveId} not found. Create it with POST /cves before linking.`,
          );
        }

        const existing = await manager.getRepository(ImageCve).findOne({
          where: {
            containerImage: { id: currentImage.id },
            cve: { cveId },
          },
          relations: { cve: true, containerImage: true },
        });

        if (existing) {
          existing.source = 'manual';
          await manager.getRepository(ImageCve).save(existing);
          continue;
        }

        const row = manager.getRepository(ImageCve).create({
          containerImage: currentImage,
          cve,
          source: 'manual',
          firstIntroducedChainIndex: currentImage.chainIndex,
          originalSource: 'manual',
          isDisabled: false,
          disabledReason: '',
          advice: null,
          storedInternalStatement: buildFreshUnderInvestigationStatement(),
          expiryTimeUnixSeconds: null,
          decisionRecordedAtUnixSeconds: now,
        });
        await manager.getRepository(ImageCve).save(row);
      }
    });

    return { status: 'ok' };
  }

  async list(projectId: string, componentId: string): Promise<{ imageCves: ImageCveListItemDto[] }> {
    const currentImage = await this.getCurrentImageOrThrow(projectId, componentId);
    const now = getCurrentTimeUnixSeconds();
    const rows = await this.imageCveRepo.find({
      where: { containerImage: { id: currentImage.id } },
      relations: { cve: true },
      order: { cve: { cveId: 'ASC' } },
    });
    return {
      imageCves: rows.map((row) => imageCveToListItem(row, row.cve, now)),
    };
  }

  async listDisabled(
    projectId: string,
    componentId: string,
  ): Promise<{ imageCves: ImageCveListItemDto[] }> {
    const currentImage = await this.getCurrentImageOrThrow(projectId, componentId);
    const now = getCurrentTimeUnixSeconds();
    const rows = await this.imageCveRepo.find({
      where: { containerImage: { id: currentImage.id }, isDisabled: true },
      relations: { cve: true },
      order: { cve: { cveId: 'ASC' } },
    });
    return {
      imageCves: rows.map((row) => imageCveToListItem(row, row.cve, now)),
    };
  }

  async getById(
    projectId: string,
    componentId: string,
    imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    const currentImage = await this.getCurrentImageOrThrow(projectId, componentId);
    const now = getCurrentTimeUnixSeconds();
    const row = await this.imageCveRepo.findOne({
      where: {
        id: imageCveId,
        containerImage: { id: currentImage.id },
      },
      relations: { cve: true },
    });
    if (!row) {
      throw new NotFoundException(
        `Image CVE ${imageCveId} not found for the current image of component ${componentId}`,
      );
    }
    return imageCveToDetail(row, row.cve, now);
  }

  async disable(
    projectId: string,
    componentId: string,
    imageCveId: string,
    reason: string,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);
      row.isDisabled = true;
      row.disabledReason = reason;
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  async enable(
    projectId: string,
    componentId: string,
    imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);
      row.isDisabled = false;
      row.disabledReason = '';
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  async reuseDecision(
    projectId: string,
    componentId: string,
    imageCveId: string,
    expiresAtUnixSeconds: string,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    const nextExpiryUnixSeconds = this.parseFutureUnixSeconds(
      expiresAtUnixSeconds,
      now,
      'expiresAtUnixSeconds',
    );
    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);
      const snapshot = this.getReusableSnapshotOrThrow(row);
      row.storedInternalStatement = this.reuseSnapshot(row.storedInternalStatement, snapshot);
      row.expiryTimeUnixSeconds = nextExpiryUnixSeconds;
      row.decisionRecordedAtUnixSeconds = now;
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  async rejectDecisionReuse(
    projectId: string,
    componentId: string,
    imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);
      this.getReusableSnapshotOrThrow(row);
      const current = row.storedInternalStatement;
      if (current.status !== 'under_investigation') {
        throw new ConflictException('Decision is not in reusable under_investigation state');
      }
      row.storedInternalStatement = {
        status: 'under_investigation',
        context: { type: 'fresh' },
      };
      row.expiryTimeUnixSeconds = null;
      row.decisionRecordedAtUnixSeconds = now;
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  /**
   * Agent write path: resolve current-image row by canonical `cveId`, then persist advice.
   * Same persistence semantics as {@link updateAdvice}.
   */
  async updateAdviceByCveId(
    projectId: string,
    componentId: string,
    cveId: string,
    content: string,
  ): Promise<ImageCveDetailDto> {
    assertCanonicalCveId(cveId);
    const currentImage = await this.getCurrentImageOrThrow(projectId, componentId);
    const row = await this.imageCveRepo.findOne({
      where: {
        containerImage: { id: currentImage.id },
        cve: { cveId },
      },
      relations: { cve: true },
    });
    if (!row) {
      throw new NotFoundException(
        `Image CVE for ${cveId} not found on the current image of component ${componentId}`,
      );
    }
    return this.updateAdvice(projectId, componentId, row.id, content);
  }

  async updateAdvice(
    projectId: string,
    componentId: string,
    imageCveId: string,
    content: string,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);
      row.advice = buildStoredAdvice(content, now);
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  async updateDecision(
    projectId: string,
    componentId: string,
    imageCveId: string,
    input: unknown,
  ): Promise<ImageCveDetailDto> {
    const now = getCurrentTimeUnixSeconds();
    const parsed = this.parseDecisionInputOrThrow(input);

    return this.dataSource.transaction(async (manager) => {
      const row = await this.getCurrentImageCveOrThrow(manager, projectId, componentId, imageCveId);

      if (parsed.status === 'under_investigation') {
        row.storedInternalStatement = buildFreshUnderInvestigationStatement();
        row.expiryTimeUnixSeconds = null;
      } else if (parsed.status === 'not_affected') {
        row.storedInternalStatement = {
          status: 'not_affected',
          justification: parsed.justification,
          impact_statement: parsed.impact_statement,
          status_notes: parsed.status_notes,
        };
        row.expiryTimeUnixSeconds = this.parseFutureUnixSeconds(
          parsed.expiryTimeUnixSeconds,
          now,
          'expiryTimeUnixSeconds',
        );
      } else {
        row.storedInternalStatement = {
          status: 'affected',
          action_statement: parsed.action_statement,
          status_notes: parsed.status_notes,
        };
        row.expiryTimeUnixSeconds = this.parseFutureUnixSeconds(
          parsed.expiryTimeUnixSeconds,
          now,
          'expiryTimeUnixSeconds',
        );
      }

      row.decisionRecordedAtUnixSeconds = now;
      const updated = await manager.getRepository(ImageCve).save(row);
      return imageCveToDetail(updated, updated.cve, now);
    });
  }

  async refreshDecisionExpiry(
    projectId: string,
    componentId: string,
    imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    const result = await refreshImageCveDecisionExpiry(
      this.dataSource,
      { projectId, componentId, imageCveId },
      getCurrentTimeUnixSeconds,
    );
    if (!result.ok) {
      throw new NotFoundException(
        `Image CVE ${imageCveId} not found for the current image of component ${componentId}`,
      );
    }
    return imageCveToDetail(result.row, result.row.cve, result.nowUnixSeconds);
  }

  private async getCurrentImageOrThrow(
    projectId: string,
    componentId: string,
  ): Promise<ContainerImage> {
    const component = await this.dataSource.getRepository(Component).findOne({
      where: { id: componentId, project: { id: projectId } },
    });
    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
    }

    const image = await this.dataSource.getRepository(ContainerImage).findOne({
      where: { component: { id: componentId } },
      order: { chainIndex: 'DESC' },
    });
    if (!image) {
      throw new NotFoundException(
        `No container image for component ${componentId}; create one before querying image CVEs`,
      );
    }
    return image;
  }

  private async getCurrentImageCveOrThrow(
    manager: EntityManager,
    projectId: string,
    componentId: string,
    imageCveId: string,
  ): Promise<ImageCve> {
    const component = await manager.getRepository(Component).findOne({
      where: { id: componentId, project: { id: projectId } },
    });
    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found in project ${projectId}`);
    }
    const image = await manager.getRepository(ContainerImage).findOne({
      where: { component: { id: componentId } },
      order: { chainIndex: 'DESC' },
    });
    if (!image) {
      throw new NotFoundException(
        `No container image for component ${componentId}; create one before querying image CVEs`,
      );
    }

    const row = await manager.getRepository(ImageCve).findOne({
      where: { id: imageCveId, containerImage: { id: image.id } },
      relations: { cve: true },
    });
    if (!row) {
      throw new NotFoundException(
        `Image CVE ${imageCveId} not found for the current image of component ${componentId}`,
      );
    }
    return row;
  }

  private parseFutureUnixSeconds(
    value: string,
    nowUnixSeconds: bigint,
    fieldName: string,
  ): bigint {
    let parsed: bigint;
    try {
      parsed = BigInt(value);
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid int64 string`);
    }
    if (parsed <= nowUnixSeconds) {
      throw new BadRequestException(`${fieldName} must be in the future`);
    }
    return parsed;
  }

  private getReusableSnapshotOrThrow(row: ImageCve): ReusableSnapshot {
    const statement = row.storedInternalStatement;
    if (statement.status !== 'under_investigation') {
      throw new ConflictException(
        'Decision reuse/reject is only allowed when status is under_investigation',
      );
    }

    if (statement.context.type === 'expired') {
      return statement.context.expiredDecision;
    }
    if (statement.context.type === 'carry_forward') {
      return statement.context.priorDecision;
    }
    throw new ConflictException(
      'Decision reuse/reject requires expired or carry_forward context',
    );
  }

  private reuseSnapshot(
    currentStatement: StoredInternalStatement,
    snapshot: ReusableSnapshot,
  ): StoredInternalStatement {
    if (currentStatement.status !== 'under_investigation') {
      throw new ConflictException('Current statement is not under_investigation');
    }
    if (snapshot.status === 'not_affected') {
      return {
        status: 'not_affected',
        justification: snapshot.justification as
          | 'component_not_present'
          | 'vulnerable_code_not_present'
          | 'vulnerable_code_not_in_execute_path'
          | 'vulnerable_code_cannot_be_controlled_by_adversary'
          | 'inline_mitigations_already_exist',
        impact_statement: snapshot.impact_statement,
        status_notes: snapshot.status_notes,
      };
    }

    return {
      status: 'affected',
      action_statement: snapshot.action_statement,
      status_notes: snapshot.status_notes,
    };
  }

  private parseDecisionInputOrThrow(input: unknown): DecisionInput {
    try {
      return DecisionInputSchema.parse(input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid decision payload');
      }
      throw error;
    }
  }
}
