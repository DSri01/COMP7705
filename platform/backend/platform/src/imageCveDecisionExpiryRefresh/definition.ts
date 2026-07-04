import type { DataSource, EntityManager } from 'typeorm';
import type { z } from 'zod';
import { Component } from '../db/entities/components/definition.js';
import { ContainerImage } from '../db/entities/container_images/definition.js';
import { ImageCve } from '../db/entities/image_cve/definition.js';
import { DecisionSnapshotSchema, type StoredInternalStatement } from '../vex/internal.js';

export type RefreshImageCveDecisionExpiryInput = {
  projectId: string;
  componentId: string;
  imageCveId: string;
};

export type RefreshImageCveDecisionExpiryResult =
  | { ok: true; changed: boolean; row: ImageCve; nowUnixSeconds: bigint }
  | { ok: false; reason: 'not_found' };

type DecisionSnapshot = z.infer<typeof DecisionSnapshotSchema>;

function snapshotFromResolvedDecision(
  statement: Extract<StoredInternalStatement, { status: 'not_affected' | 'affected' }>,
): DecisionSnapshot {
  if (statement.status === 'not_affected') {
    return {
      status: 'not_affected',
      justification: statement.justification,
      impact_statement: statement.impact_statement,
      status_notes: statement.status_notes,
    };
  }
  return {
    status: 'affected',
    action_statement: statement.action_statement,
    status_notes: statement.status_notes,
  };
}

async function loadCurrentImageCveScopedRow(
  manager: EntityManager,
  input: RefreshImageCveDecisionExpiryInput,
): Promise<ImageCve | null> {
  const component = await manager.getRepository(Component).findOne({
    where: { id: input.componentId, project: { id: input.projectId } },
  });
  if (!component) {
    return null;
  }

  const image = await manager.getRepository(ContainerImage).findOne({
    where: { component: { id: input.componentId } },
    order: { chainIndex: 'DESC' },
  });
  if (!image) {
    return null;
  }

  return manager.getRepository(ImageCve).findOne({
    where: { id: input.imageCveId, containerImage: { id: image.id } },
    relations: { cve: true },
  });
}

/**
 * Transactionally materializes an expired resolved decision into
 * `under_investigation` with expired context for one image-CVE row.
 *
 * This helper is intentionally kept in `src/` so API handlers and workers can
 * share the exact same transition semantics.
 */
export async function refreshImageCveDecisionExpiry(
  dataSource: DataSource,
  input: RefreshImageCveDecisionExpiryInput,
  getNowUnixSeconds: () => bigint,
): Promise<RefreshImageCveDecisionExpiryResult> {
  return dataSource.transaction(async (manager) => {
    const row = await loadCurrentImageCveScopedRow(manager, input);
    if (!row) {
      return { ok: false, reason: 'not_found' } as const;
    }

    const now = getNowUnixSeconds();
    const statement = row.storedInternalStatement;
    const expiry = row.expiryTimeUnixSeconds;
    const isExpired = expiry != null && now > expiry;
    const isResolved = statement.status === 'not_affected' || statement.status === 'affected';
    if (!isResolved || !isExpired) {
      return { ok: true, changed: false, row, nowUnixSeconds: now } as const;
    }

    row.storedInternalStatement = {
      status: 'under_investigation',
      context: {
        type: 'expired',
        expiredDecision: snapshotFromResolvedDecision(statement),
      },
    };
    row.expiryTimeUnixSeconds = null;
    row.decisionRecordedAtUnixSeconds = now;

    const saved = await manager.getRepository(ImageCve).save(row);
    return { ok: true, changed: true, row: saved, nowUnixSeconds: now } as const;
  });
}
