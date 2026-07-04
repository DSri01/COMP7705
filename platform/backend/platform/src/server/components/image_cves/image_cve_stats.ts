import type { PlatformSeverity } from '../../../intelHighlightsMerger/schema.js';
import type { ImageCve } from '../../../db/entities/image_cve/definition.js';
import { imageCveToVexStatus } from './image_cves.mapper.js';

export type SeverityDistribution = Record<PlatformSeverity, number>;

export type ImageCveStats = {
  scope: {
    enabledOnly: true;
    latestImageOnlyPerComponent: true;
  };
  totals: {
    enabledImageCves: number;
  };
  byVexStatus: {
    under_investigation: { total: number; severity: SeverityDistribution };
    not_affected: { total: number; severity: SeverityDistribution };
    affected: { total: number; severity: SeverityDistribution };
  };
};

function createEmptySeverityDistribution(): SeverityDistribution {
  return {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNKNOWN: 0,
  };
}

export function createEmptyImageCveStats(): ImageCveStats {
  return {
    scope: {
      enabledOnly: true,
      latestImageOnlyPerComponent: true,
    },
    totals: {
      enabledImageCves: 0,
    },
    byVexStatus: {
      under_investigation: { total: 0, severity: createEmptySeverityDistribution() },
      not_affected: { total: 0, severity: createEmptySeverityDistribution() },
      affected: { total: 0, severity: createEmptySeverityDistribution() },
    },
  };
}

export function accumulateImageCveStats(stats: ImageCveStats, rows: ImageCve[], nowUnixSeconds: bigint): void {
  for (const row of rows) {
    const vexStatus = imageCveToVexStatus(row, nowUnixSeconds);
    const severity = row.cve.severity;
    stats.totals.enabledImageCves += 1;
    stats.byVexStatus[vexStatus].total += 1;
    stats.byVexStatus[vexStatus].severity[severity] += 1;
  }
}
