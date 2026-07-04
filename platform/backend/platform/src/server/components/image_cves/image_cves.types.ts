/**
 * API-aligned shapes for image–CVE responses.
 */

import type { IntelHighlightsColumn, PlatformSeverity } from '../../../intelHighlightsMerger/schema.js';
import { VexStateKindSchema } from '../../../vex/internal.js';
import type { z } from 'zod';

export type CveSourceDto = 'fromScan' | 'manual' | 'fromChain';

export type VexStatusDto = 'not_affected' | 'affected' | 'under_investigation';
export type VexStateKindDto = z.infer<typeof VexStateKindSchema>;

export type DecisionSnapshotDto =
  | {
      status: 'not_affected';
      justification: string;
      impact_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
    }
  | {
      status: 'affected';
      action_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
    };

export type AdditionalDataDto =
  | { type: 'fresh' }
  | { type: 'carry_forward'; priorDecision: DecisionSnapshotDto }
  | { type: 'expired'; expiredDecision: DecisionSnapshotDto };

export type DecisionResponseDto =
  | {
      status: 'not_affected';
      justification: string;
      impact_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
      createdAtUnixSeconds: string;
    }
  | {
      status: 'affected';
      action_statement: string;
      status_notes: string;
      expiryTimeUnixSeconds: string;
      createdAtUnixSeconds: string;
    }
  | {
      status: 'under_investigation';
      additionalData: AdditionalDataDto;
      createdAtUnixSeconds: string;
    };

export type AdviceDto =
  | { state: 'set'; content: string; adviceGeneratedAtUnixSeconds: string }
  | { state: 'unset' };

export type DisableStateDto =
  | { state: 'enabled' }
  | { state: 'disabled'; reason: string };

export type ImageCveListItemDto = {
  imageCveId: string;
  cveId: string;
  source: CveSourceDto;
  severity: PlatformSeverity;
  intelHighlights: IntelHighlightsColumn | null;
  vexStatus: VexStatusDto;
  vexStateKind: VexStateKindDto;
  expiryTimeUnixSeconds: string | null;
  disableState: DisableStateDto;
};

export type ImageCveDetailDto = {
  imageCveId: string;
  cveId: string;
  source: CveSourceDto;
  severity: PlatformSeverity;
  intelHighlights: IntelHighlightsColumn | null;
  disableState: DisableStateDto;
  decision: DecisionResponseDto;
  advice: AdviceDto;
};
