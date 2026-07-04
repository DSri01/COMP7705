import type { ImageCve } from '../../../db/entities/image_cve/definition.js';
import type { Cve } from '../../../db/entities/cves/definition.js';
import { DecisionSnapshotSchema, type StoredInternalStatement } from '../../../vex/internal.js';
import type { z } from 'zod';
import { parseStoredAdvice } from './advice.js';
import type {
  AdviceDto,
  DecisionResponseDto,
  DecisionSnapshotDto,
  DisableStateDto,
  ImageCveDetailDto,
  ImageCveListItemDto,
  VexStateKindDto,
  VexStatusDto,
} from './image_cves.types.js';

type InternalDecisionSnapshot = z.infer<typeof DecisionSnapshotSchema>;

export function unixSecondsToInt64String(seconds: bigint): string {
  return seconds.toString();
}

/** OpenVEX product id for the current image. */
export function buildImageCveProductId(
  projectName: string,
  componentName: string,
  imageCreatedAtUnixSeconds: bigint,
): string {
  const p = encodeURIComponent(projectName);
  const c = encodeURIComponent(componentName);
  return `https://comp7705platform/${p}/${c}/${imageCreatedAtUnixSeconds.toString()}`;
}

export function buildFreshUnderInvestigationStatement(
): StoredInternalStatement {
  return {
    status: 'under_investigation',
    context: { type: 'fresh' },
  };
}

function internalSnapshotToApi(
  snapshot: InternalDecisionSnapshot,
  expiryTimeUnixSeconds: bigint,
): DecisionSnapshotDto {
  const expiryTimeUnixSecondsString = unixSecondsToInt64String(expiryTimeUnixSeconds);
  if (snapshot.status === 'not_affected') {
    return {
      status: 'not_affected',
      justification: snapshot.justification,
      impact_statement: snapshot.impact_statement,
      status_notes: snapshot.status_notes,
      expiryTimeUnixSeconds: expiryTimeUnixSecondsString,
    };
  }
  return {
    status: 'affected',
    action_statement: snapshot.action_statement,
    status_notes: snapshot.status_notes,
    expiryTimeUnixSeconds: expiryTimeUnixSecondsString,
  };
}

function openVexNotAffectedToApiDecision(
  stored: Extract<StoredInternalStatement, { status: 'not_affected' }>,
  row: ImageCve,
): Extract<DecisionResponseDto, { status: 'not_affected' }> {
  const expiry = row.expiryTimeUnixSeconds ?? row.decisionRecordedAtUnixSeconds;
  return {
    status: 'not_affected',
    justification: stored.justification,
    impact_statement: stored.impact_statement,
    status_notes: stored.status_notes,
    expiryTimeUnixSeconds: unixSecondsToInt64String(expiry),
    createdAtUnixSeconds: unixSecondsToInt64String(row.decisionRecordedAtUnixSeconds),
  };
}

function openVexAffectedToApiDecision(
  stored: Extract<StoredInternalStatement, { status: 'affected' }>,
  row: ImageCve,
): Extract<DecisionResponseDto, { status: 'affected' }> {
  const expiry = row.expiryTimeUnixSeconds ?? row.decisionRecordedAtUnixSeconds;
  return {
    status: 'affected',
    action_statement: stored.action_statement,
    status_notes: stored.status_notes,
    expiryTimeUnixSeconds: unixSecondsToInt64String(expiry),
    createdAtUnixSeconds: unixSecondsToInt64String(row.decisionRecordedAtUnixSeconds),
  };
}

function underInvestigationToApiDecision(
  stored: Extract<StoredInternalStatement, { status: 'under_investigation' }>,
  row: ImageCve,
): Extract<DecisionResponseDto, { status: 'under_investigation' }> {
  const createdAtUnixSeconds = unixSecondsToInt64String(row.decisionRecordedAtUnixSeconds);
  switch (stored.context.type) {
    case 'fresh':
      return {
        status: 'under_investigation',
        additionalData: { type: 'fresh' },
        createdAtUnixSeconds,
      };
    case 'expired':
      return {
        status: 'under_investigation',
        additionalData: {
          type: 'expired',
          expiredDecision: internalSnapshotToApi(
            stored.context.expiredDecision,
            row.expiryTimeUnixSeconds ?? row.decisionRecordedAtUnixSeconds,
          ),
        },
        createdAtUnixSeconds,
      };
    case 'carry_forward':
      return {
        status: 'under_investigation',
        additionalData: {
          type: 'carry_forward',
          priorDecision: internalSnapshotToApi(
            stored.context.priorDecision,
            row.expiryTimeUnixSeconds ?? row.decisionRecordedAtUnixSeconds,
          ),
        },
        createdAtUnixSeconds,
      };
  }
}

/**
 * Resolves expiry at read time: a stored not_affected / affected whose validity end is in the past
 * is surfaced as under_investigation with `additionalData.type === "expired"`.
 */
export function imageCveToDecisionResponse(row: ImageCve, nowUnixSeconds: bigint): DecisionResponseDto {
  const stored = row.storedInternalStatement;

  if (stored.status === 'not_affected') {
    if (
      row.expiryTimeUnixSeconds != null &&
      nowUnixSeconds > row.expiryTimeUnixSeconds
    ) {
      return {
        status: 'under_investigation',
        additionalData: {
          type: 'expired',
          expiredDecision: {
            status: 'not_affected',
            justification: stored.justification,
            impact_statement: stored.impact_statement,
            status_notes: stored.status_notes,
            expiryTimeUnixSeconds: unixSecondsToInt64String(row.expiryTimeUnixSeconds),
          },
        },
        createdAtUnixSeconds: unixSecondsToInt64String(row.decisionRecordedAtUnixSeconds),
      };
    }
    return openVexNotAffectedToApiDecision(stored, row);
  }

  if (stored.status === 'affected') {
    if (
      row.expiryTimeUnixSeconds != null &&
      nowUnixSeconds > row.expiryTimeUnixSeconds
    ) {
      return {
        status: 'under_investigation',
        additionalData: {
          type: 'expired',
          expiredDecision: {
            status: 'affected',
            action_statement: stored.action_statement,
            status_notes: stored.status_notes,
            expiryTimeUnixSeconds: unixSecondsToInt64String(row.expiryTimeUnixSeconds),
          },
        },
        createdAtUnixSeconds: unixSecondsToInt64String(row.decisionRecordedAtUnixSeconds),
      };
    }
    return openVexAffectedToApiDecision(stored, row);
  }

  return underInvestigationToApiDecision(stored, row);
}

export function imageCveToVexStatus(row: ImageCve, nowUnixSeconds: bigint): VexStatusDto {
  const decision = imageCveToDecisionResponse(row, nowUnixSeconds);
  if (decision.status === 'under_investigation') {
    return 'under_investigation';
  }
  return decision.status;
}

export function imageCveToVexStateKind(row: ImageCve, nowUnixSeconds: bigint): VexStateKindDto {
  const decision = imageCveToDecisionResponse(row, nowUnixSeconds);
  if (decision.status === 'not_affected') {
    return 'not_affected';
  }
  if (decision.status === 'affected') {
    return 'affected';
  }
  switch (decision.additionalData.type) {
    case 'fresh':
      return 'under_investigation_fresh';
    case 'expired':
      return 'under_investigation_expired';
    case 'carry_forward':
      return 'under_investigation_carry_forward';
  }
}

export function imageCveToDisableState(row: ImageCve): DisableStateDto {
  if (!row.isDisabled) {
    return { state: 'enabled' };
  }
  return {
    state: 'disabled',
    reason: row.disabledReason,
  };
}

export function imageCveToAdvice(row: ImageCve): AdviceDto {
  const stored = parseStoredAdvice(row.advice);
  if (!stored) {
    return { state: 'unset' };
  }
  return {
    state: 'set',
    content: stored.content,
    adviceGeneratedAtUnixSeconds: unixSecondsToInt64String(stored.adviceGeneratedAtUnixSeconds),
  };
}

export function imageCveToListItem(row: ImageCve, cve: Cve, nowUnixSeconds: bigint): ImageCveListItemDto {
  return {
    imageCveId: row.id,
    cveId: cve.cveId,
    source: row.source,
    severity: cve.severity,
    intelHighlights: cve.intelHighlights,
    vexStatus: imageCveToVexStatus(row, nowUnixSeconds),
    vexStateKind: imageCveToVexStateKind(row, nowUnixSeconds),
    expiryTimeUnixSeconds:
      row.expiryTimeUnixSeconds == null ? null : unixSecondsToInt64String(row.expiryTimeUnixSeconds),
    disableState: imageCveToDisableState(row),
  };
}

export function imageCveToDetail(row: ImageCve, cve: Cve, nowUnixSeconds: bigint): ImageCveDetailDto {
  return {
    imageCveId: row.id,
    cveId: cve.cveId,
    source: row.source,
    severity: cve.severity,
    intelHighlights: cve.intelHighlights,
    disableState: imageCveToDisableState(row),
    decision: imageCveToDecisionResponse(row, nowUnixSeconds),
    advice: imageCveToAdvice(row),
  };
}
