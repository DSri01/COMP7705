import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ImageCvesController } from '../../../../src/server/components/image_cves/image_cves.controller.js';
import { ImageCvesService } from '../../../../src/server/components/image_cves/image_cves.service.js';

describe('ImageCvesController', () => {
  let controller: ImageCvesController;

  type ImageCvesServiceMock = Pick<
    jest.Mocked<ImageCvesService>,
    | 'list'
    | 'listDisabled'
    | 'linkToCurrentImage'
    | 'getById'
    | 'disable'
    | 'enable'
    | 'reuseDecision'
    | 'rejectDecisionReuse'
    | 'refreshDecisionExpiry'
    | 'updateDecision'
    | 'updateAdvice'
  >;

  const serviceMock: ImageCvesServiceMock = {
    list: jest.fn<ImageCvesService['list']>(),
    listDisabled: jest.fn<ImageCvesService['listDisabled']>(),
    linkToCurrentImage: jest.fn<ImageCvesService['linkToCurrentImage']>(),
    getById: jest.fn<ImageCvesService['getById']>(),
    disable: jest.fn<ImageCvesService['disable']>(),
    enable: jest.fn<ImageCvesService['enable']>(),
    reuseDecision: jest.fn<ImageCvesService['reuseDecision']>(),
    rejectDecisionReuse: jest.fn<ImageCvesService['rejectDecisionReuse']>(),
    refreshDecisionExpiry: jest.fn<ImageCvesService['refreshDecisionExpiry']>(),
    updateDecision: jest.fn<ImageCvesService['updateDecision']>(),
    updateAdvice: jest.fn<ImageCvesService['updateAdvice']>(),
  };

  const listPayload = { imageCves: [] };

  const detailPayload = {
    imageCveId: '00000000-0000-4000-8000-000000000001',
    cveId: 'CVE-2021-44228',
    source: 'manual' as const,
    severity: 'HIGH' as const,
    intelHighlights: null,
    disableState: { state: 'enabled' as const },
    decision: {
      status: 'under_investigation' as const,
      additionalData: { type: 'fresh' as const },
      createdAtUnixSeconds: '1',
    },
    advice: { state: 'unset' as const },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageCvesController],
      providers: [{ provide: ImageCvesService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ImageCvesController>(ImageCvesController);
    jest.clearAllMocks();
  });

  it('list() delegates to service', async () => {
    serviceMock.list.mockResolvedValue(listPayload);
    const result = await controller.list('proj-1', 'comp-1');
    expect(serviceMock.list).toHaveBeenCalledWith('proj-1', 'comp-1');
    expect(result).toEqual(listPayload);
  });

  it('link() delegates to service', async () => {
    serviceMock.linkToCurrentImage.mockResolvedValue({ status: 'ok' });
    const result = await controller.link('proj-1', 'comp-1', { cveIds: ['CVE-2021-44228'] });
    expect(serviceMock.linkToCurrentImage).toHaveBeenCalledWith('proj-1', 'comp-1', [
      'CVE-2021-44228',
    ]);
    expect(result).toEqual({ status: 'ok' });
  });

  it('listDisabled() delegates to service', async () => {
    serviceMock.listDisabled.mockResolvedValue(listPayload);
    const result = await controller.listDisabled('proj-1', 'comp-1');
    expect(serviceMock.listDisabled).toHaveBeenCalledWith('proj-1', 'comp-1');
    expect(result).toEqual(listPayload);
  });

  it('getById() delegates to service', async () => {
    serviceMock.getById.mockResolvedValue(detailPayload);
    const result = await controller.getById('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(serviceMock.getById).toHaveBeenCalledWith('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(result).toEqual(detailPayload);
  });

  it('propagates NotFoundException from service', async () => {
    const err = new NotFoundException('missing');
    serviceMock.getById.mockRejectedValue(err);
    await expect(controller.getById('p', 'c', 'id')).rejects.toBe(err);
  });

  it('disable() delegates to service', async () => {
    serviceMock.disable.mockResolvedValue(detailPayload);
    const result = await controller.disable('proj-1', 'comp-1', detailPayload.imageCveId, {
      reason: 'maintenance',
    });
    expect(serviceMock.disable).toHaveBeenCalledWith('proj-1', 'comp-1', detailPayload.imageCveId, 'maintenance');
    expect(result).toEqual(detailPayload);
  });

  it('enable() delegates to service', async () => {
    serviceMock.enable.mockResolvedValue(detailPayload);
    const result = await controller.enable('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(serviceMock.enable).toHaveBeenCalledWith('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(result).toEqual(detailPayload);
  });

  it('reuseDecision() delegates to service', async () => {
    serviceMock.reuseDecision.mockResolvedValue(detailPayload);
    const result = await controller.reuseDecision('proj-1', 'comp-1', detailPayload.imageCveId, {
      expiresAtUnixSeconds: '1798675200',
    });
    expect(serviceMock.reuseDecision).toHaveBeenCalledWith(
      'proj-1',
      'comp-1',
      detailPayload.imageCveId,
      '1798675200',
    );
    expect(result).toEqual(detailPayload);
  });

  it('rejectDecisionReuse() delegates to service', async () => {
    serviceMock.rejectDecisionReuse.mockResolvedValue(detailPayload);
    const result = await controller.rejectDecisionReuse('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(serviceMock.rejectDecisionReuse).toHaveBeenCalledWith(
      'proj-1',
      'comp-1',
      detailPayload.imageCveId,
    );
    expect(result).toEqual(detailPayload);
  });

  it('refreshDecisionExpiry() delegates to service', async () => {
    serviceMock.refreshDecisionExpiry.mockResolvedValue(detailPayload);
    const result = await controller.refreshDecisionExpiry('proj-1', 'comp-1', detailPayload.imageCveId);
    expect(serviceMock.refreshDecisionExpiry).toHaveBeenCalledWith(
      'proj-1',
      'comp-1',
      detailPayload.imageCveId,
    );
    expect(result).toEqual(detailPayload);
  });

  it('updateAdvice() delegates to service', async () => {
    serviceMock.updateAdvice.mockResolvedValue({
      ...detailPayload,
      advice: {
        state: 'set',
        content: 'Pin patched image',
        adviceGeneratedAtUnixSeconds: '1700000000',
      },
    });
    const result = await controller.updateAdvice('proj-1', 'comp-1', detailPayload.imageCveId, {
      content: 'Pin patched image',
    });
    expect(serviceMock.updateAdvice).toHaveBeenCalledWith(
      'proj-1',
      'comp-1',
      detailPayload.imageCveId,
      'Pin patched image',
    );
    expect(result.advice).toEqual({
      state: 'set',
      content: 'Pin patched image',
      adviceGeneratedAtUnixSeconds: '1700000000',
    });
  });

  it('updateDecision() delegates to service', async () => {
    serviceMock.updateDecision.mockResolvedValue({
      ...detailPayload,
      decision: {
        status: 'affected',
        action_statement: 'upgrade image',
        status_notes: 'reachable from network',
        expiryTimeUnixSeconds: '1798675200',
        createdAtUnixSeconds: '1',
      },
    });
    const payload = {
      status: 'affected',
      action_statement: 'upgrade image',
      status_notes: 'reachable from network',
      expiryTimeUnixSeconds: '1798675200',
    };
    const result = await controller.updateDecision('proj-1', 'comp-1', detailPayload.imageCveId, payload);
    expect(serviceMock.updateDecision).toHaveBeenCalledWith(
      'proj-1',
      'comp-1',
      detailPayload.imageCveId,
      payload,
    );
    expect(result.decision.status).toBe('affected');
  });
});
