import { describe, it, expect } from '@jest/globals';
import type { ImageCve } from '../../../../src/db/entities/image_cve/definition.js';
import type { Cve } from '../../../../src/db/entities/cves/definition.js';
import {
  buildFreshUnderInvestigationStatement,
  buildImageCveProductId,
  imageCveToDecisionResponse,
  imageCveToAdvice,
  imageCveToDisableState,
  imageCveToListItem,
  imageCveToVexStatus,
  unixSecondsToInt64String,
} from '../../../../src/server/components/image_cves/image_cves.mapper.js';

describe('image_cves.mapper', () => {
  it('unixSecondsToInt64String formats unix seconds string', () => {
    expect(unixSecondsToInt64String(1n)).toBe('1');
  });

  it('buildImageCveProductId encodes names', () => {
    expect(buildImageCveProductId('p/e', 'c space', 99n)).toBe(
      'https://comp7705platform/p%2Fe/c%20space/99',
    );
  });

  it('buildFreshUnderInvestigationStatement creates trimmed fresh shape', () => {
    const s = buildFreshUnderInvestigationStatement();
    expect(s.status).toBe('under_investigation');
    if (s.status !== 'under_investigation') {
      throw new Error('expected under_investigation');
    }
    expect(s.context).toEqual({ type: 'fresh' });
  });

  const makeCve = (overrides: Partial<Cve> = {}): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
      ...overrides,
    }) as Cve;

  const makeRow = (overrides: Partial<ImageCve> = {}): ImageCve =>
    ({
      id: '00000000-0000-4000-8000-000000000001',
      source: 'manual',
      firstIntroducedChainIndex: 1,
      originalSource: 'manual',
      isDisabled: false,
      disabledReason: '',
      advice: null,
      storedInternalStatement: buildFreshUnderInvestigationStatement(),
      expiryTimeUnixSeconds: null,
      decisionRecordedAtUnixSeconds: 100n,
      ...overrides,
    }) as ImageCve;

  it('imageCveToVexStatus is under_investigation for fresh staging', () => {
    const row = makeRow();
    expect(imageCveToVexStatus(row, 200n)).toBe('under_investigation');
  });

  it('imageCveToDecisionResponse maps fresh under_investigation', () => {
    const row = makeRow();
    const d = imageCveToDecisionResponse(row, 200n);
    expect(d.status).toBe('under_investigation');
    if (d.status === 'under_investigation') {
      expect(d.additionalData).toEqual({ type: 'fresh' });
      expect(d.createdAtUnixSeconds).toBe('100');
    }
  });

  it('imageCveToVexStatus surfaces expiry for stored not_affected', () => {
    const stored = {
      status: 'not_affected' as const,
      justification: 'component_not_present' as const,
      impact_statement: 'x',
      status_notes: 'y',
    };
    const row = makeRow({
      storedInternalStatement: stored,
      expiryTimeUnixSeconds: 50n,
      decisionRecordedAtUnixSeconds: 10n,
    });
    expect(imageCveToVexStatus(row, 100n)).toBe('under_investigation');
    const d = imageCveToDecisionResponse(row, 100n);
    expect(d.status).toBe('under_investigation');
  });

  it('imageCveToListItem includes severity from global CVE row', () => {
    const row = makeRow();
    const item = imageCveToListItem(row, makeCve(), 1n);
    expect(item.cveId).toBe('CVE-2021-44228');
    expect(item.vexStatus).toBe('under_investigation');
    expect(item.vexStateKind).toBe('under_investigation_fresh');
    expect(item.expiryTimeUnixSeconds).toBeNull();
    expect(item.severity).toBe('HIGH');
  });

  it('imageCveToDisableState returns disabled when explicitly disabled', () => {
    const row = makeRow({
      isDisabled: true,
      disabledReason: 'x',
    });
    expect(imageCveToDisableState(row)).toEqual({ state: 'disabled', reason: 'x' });
  });

  it('imageCveToListItem exposes expired vexStateKind with expiry timestamp', () => {
    const row = makeRow({
      storedInternalStatement: {
        status: 'affected',
        action_statement: 'upgrade',
        status_notes: 'reachable',
      },
      expiryTimeUnixSeconds: 10n,
      decisionRecordedAtUnixSeconds: 1n,
    });
    const item = imageCveToListItem(row, makeCve(), 20n);
    expect(item.vexStatus).toBe('under_investigation');
    expect(item.vexStateKind).toBe('under_investigation_expired');
    expect(item.expiryTimeUnixSeconds).toBe('10');
  });

  it('imageCveToListItem exposes carry_forward vexStateKind', () => {
    const row = makeRow({
      storedInternalStatement: {
        status: 'under_investigation',
        context: {
          type: 'carry_forward',
          priorDecision: {
            status: 'not_affected',
            justification: 'component_not_present',
            impact_statement: 'not present',
            status_notes: 'prior',
          },
        },
      },
    });
    const item = imageCveToListItem(row, makeCve(), 20n);
    expect(item.vexStateKind).toBe('under_investigation_carry_forward');
    expect(item.expiryTimeUnixSeconds).toBeNull();
  });

  it('imageCveToAdvice maps unset when advice is null', () => {
    expect(imageCveToAdvice(makeRow({ advice: null }))).toEqual({ state: 'unset' });
  });

  it('imageCveToAdvice maps stored advice with int64 timestamp string', () => {
    expect(
      imageCveToAdvice(
        makeRow({
          advice: {
            content: 'Mitigate via upgrade',
            adviceGeneratedAtUnixSeconds: '1700000000',
          },
        }),
      ),
    ).toEqual({
      state: 'set',
      content: 'Mitigate via upgrade',
      adviceGeneratedAtUnixSeconds: '1700000000',
    });
  });

  it('imageCveToAdvice maps unset when stored advice is incomplete', () => {
    expect(imageCveToAdvice(makeRow({ advice: { content: 'incomplete' } }))).toEqual({
      state: 'unset',
    });
  });
});
