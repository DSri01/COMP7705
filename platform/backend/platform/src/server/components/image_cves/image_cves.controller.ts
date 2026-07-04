import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ImageCvesService } from './image_cves.service.js';
import { LinkImageCvesDto } from './dto/link-image-cves.dto.js';
import { LinkImageCvesResponseDto } from './dto/link-image-cves-response.dto.js';
import { DisableImageCveDto } from './dto/disable-image-cve.dto.js';
import { ReuseImageCveDecisionDto } from './dto/reuse-image-cve-decision.dto.js';
import { UpdateImageCveAdviceDto } from './dto/update-image-cve-advice.dto.js';
import { UpdateImageCveDecisionDto } from './dto/update-image-cve-decision.dto.js';
import type { ImageCveDetailDto } from './image_cves.types.js';
import type { ImageCveListItemDto } from './image_cves.types.js';

const DisableStateSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['state'],
      properties: {
        state: { type: 'string', enum: ['enabled'] },
      },
    },
    {
      type: 'object',
      required: ['state', 'reason'],
      properties: {
        state: { type: 'string', enum: ['disabled'] },
        reason: { type: 'string' },
      },
    },
  ],
};

const DecisionSnapshotSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['status', 'justification', 'impact_statement', 'status_notes', 'expiryTimeUnixSeconds'],
      properties: {
        status: { type: 'string', enum: ['not_affected'] },
        justification: {
          type: 'string',
          enum: [
            'component_not_present',
            'vulnerable_code_not_present',
            'vulnerable_code_not_in_execute_path',
            'vulnerable_code_cannot_be_controlled_by_adversary',
            'inline_mitigations_already_exist',
          ],
        },
        impact_statement: { type: 'string' },
        status_notes: { type: 'string' },
        expiryTimeUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
    {
      type: 'object',
      required: ['status', 'action_statement', 'status_notes', 'expiryTimeUnixSeconds'],
      properties: {
        status: { type: 'string', enum: ['affected'] },
        action_statement: { type: 'string' },
        status_notes: { type: 'string' },
        expiryTimeUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
  ],
};

const AdditionalDataSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['fresh'] },
      },
    },
    {
      type: 'object',
      required: ['type', 'priorDecision'],
      properties: {
        type: { type: 'string', enum: ['carry_forward'] },
        priorDecision: DecisionSnapshotSchema,
      },
    },
    {
      type: 'object',
      required: ['type', 'expiredDecision'],
      properties: {
        type: { type: 'string', enum: ['expired'] },
        expiredDecision: DecisionSnapshotSchema,
      },
    },
  ],
};

const DecisionResponseSchema = {
  oneOf: [
    {
      type: 'object',
      required: [
        'status',
        'justification',
        'impact_statement',
        'status_notes',
        'expiryTimeUnixSeconds',
        'createdAtUnixSeconds',
      ],
      properties: {
        status: { type: 'string', enum: ['not_affected'] },
        justification: {
          type: 'string',
          enum: [
            'component_not_present',
            'vulnerable_code_not_present',
            'vulnerable_code_not_in_execute_path',
            'vulnerable_code_cannot_be_controlled_by_adversary',
            'inline_mitigations_already_exist',
          ],
        },
        impact_statement: { type: 'string' },
        status_notes: { type: 'string' },
        expiryTimeUnixSeconds: { type: 'string', format: 'int64' },
        createdAtUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
    {
      type: 'object',
      required: ['status', 'action_statement', 'status_notes', 'expiryTimeUnixSeconds', 'createdAtUnixSeconds'],
      properties: {
        status: { type: 'string', enum: ['affected'] },
        action_statement: { type: 'string' },
        status_notes: { type: 'string' },
        expiryTimeUnixSeconds: { type: 'string', format: 'int64' },
        createdAtUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
    {
      type: 'object',
      required: ['status', 'additionalData', 'createdAtUnixSeconds'],
      properties: {
        status: { type: 'string', enum: ['under_investigation'] },
        additionalData: AdditionalDataSchema,
        createdAtUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
  ],
};

const AdviceSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['state'],
      properties: {
        state: { type: 'string', enum: ['unset'] },
      },
    },
    {
      type: 'object',
      required: ['state', 'content', 'adviceGeneratedAtUnixSeconds'],
      properties: {
        state: { type: 'string', enum: ['set'] },
        content: { type: 'string' },
        adviceGeneratedAtUnixSeconds: { type: 'string', format: 'int64' },
      },
    },
  ],
};

const ImageCveListItemSchema = {
  type: 'object',
  required: [
    'imageCveId',
    'cveId',
    'source',
    'severity',
    'intelHighlights',
    'vexStatus',
    'vexStateKind',
    'expiryTimeUnixSeconds',
    'disableState',
  ],
  properties: {
    imageCveId: { type: 'string', format: 'uuid' },
    cveId: { type: 'string' },
    source: { type: 'string', enum: ['fromScan', 'manual', 'fromChain'] },
    severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
    intelHighlights: { type: 'object', nullable: true, additionalProperties: true },
    vexStatus: { type: 'string', enum: ['not_affected', 'affected', 'under_investigation'] },
    vexStateKind: {
      type: 'string',
      enum: [
        'not_affected',
        'affected',
        'under_investigation_fresh',
        'under_investigation_expired',
        'under_investigation_carry_forward',
      ],
    },
    expiryTimeUnixSeconds: { type: 'string', format: 'int64', nullable: true },
    disableState: DisableStateSchema,
  },
};

const ImageCveListResponseSchema = {
  type: 'object',
  required: ['imageCves'],
  properties: {
    imageCves: {
      type: 'array',
      items: ImageCveListItemSchema,
    },
  },
};

const ImageCveDetailSchema = {
  type: 'object',
  required: [
    'imageCveId',
    'cveId',
    'source',
    'severity',
    'intelHighlights',
    'disableState',
    'decision',
    'advice',
  ],
  properties: {
    imageCveId: { type: 'string', format: 'uuid' },
    cveId: { type: 'string' },
    source: { type: 'string', enum: ['fromScan', 'manual', 'fromChain'] },
    severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
    intelHighlights: { type: 'object', nullable: true, additionalProperties: true },
    disableState: DisableStateSchema,
    decision: DecisionResponseSchema,
    advice: AdviceSchema,
  },
};

@ApiTags('image-cves')
@Controller('projects/:projectId/components/:componentId/image-cves')
export class ImageCvesController {
  constructor(private readonly imageCvesService: ImageCvesService) {}

  @Get()
  @ApiOperation({
    summary: 'List CVE associations for the component current image',
    description:
      'Returns all image-CVE rows for the latest chain index. Empty when none linked.',
  })
  @ApiOkResponse({ description: 'List of image CVE rows', schema: ImageCveListResponseSchema as any })
  @ApiNotFoundResponse({ description: 'Project, component, or no container image' })
  async list(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<{ imageCves: ImageCveListItemDto[] }> {
    return this.imageCvesService.list(projectId, componentId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link existing CVEs to the current image',
    description:
      'Each CVE id must already exist in the global `cves` table. Existing associations only update `source` to manual.',
  })
  @ApiOkResponse({ description: 'Link completed', type: LinkImageCvesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'Component, image, or CVE not found' })
  async link(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Body() dto: LinkImageCvesDto,
  ): Promise<LinkImageCvesResponseDto> {
    return this.imageCvesService.linkToCurrentImage(projectId, componentId, dto.cveIds);
  }

  @Get('disabled')
  @ApiOperation({ summary: 'List disabled CVE associations for the current image' })
  @ApiOkResponse({ description: 'List of currently disabled image CVE rows', schema: ImageCveListResponseSchema as any })
  @ApiNotFoundResponse({ description: 'Project, component, or no container image' })
  async listDisabled(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<{ imageCves: ImageCveListItemDto[] }> {
    return this.imageCvesService.listDisabled(projectId, componentId);
  }

  @Get(':imageCveId')
  @ApiOperation({ summary: 'Get one image-CVE association (detail)' })
  @ApiOkResponse({ description: 'Image CVE detail', schema: ImageCveDetailSchema as any })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async getById(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.getById(projectId, componentId, imageCveId);
  }

  @Post(':imageCveId/disable')
  @ApiOperation({
    summary: 'Disable an image CVE',
    description:
      'Disables regardless of source. Decision expiry is not modified by disable/enable.',
  })
  @ApiOkResponse({ description: 'Image CVE detail after disable' })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async disable(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
    @Body() dto: DisableImageCveDto,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.disable(projectId, componentId, imageCveId, dto.reason);
  }

  @Post(':imageCveId/enable')
  @ApiOperation({ summary: 'Enable a previously disabled image CVE' })
  @ApiOkResponse({ description: 'Image CVE detail after enable' })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async enable(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.enable(projectId, componentId, imageCveId);
  }

  @Post(':imageCveId/decision/reuse')
  @ApiOperation({
    summary: 'Reuse prior decision snapshot with a new expiry',
    description:
      'Allowed only when current decision is under_investigation due to expired or carry_forward context.',
  })
  @ApiOkResponse({ description: 'Image CVE detail after reuse' })
  @ApiBadRequestResponse({
    description: 'Invalid expiresAtUnixSeconds or expiresAtUnixSeconds not in the future',
  })
  @ApiConflictResponse({
    description: 'Decision is not in reusable state (must be expired or carry_forward under_investigation)',
  })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async reuseDecision(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
    @Body() dto: ReuseImageCveDecisionDto,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.reuseDecision(
      projectId,
      componentId,
      imageCveId,
      dto.expiresAtUnixSeconds,
    );
  }

  @Post(':imageCveId/decision/reject')
  @ApiOperation({
    summary: 'Reject decision reuse and reset to default under_investigation',
    description:
      'Allowed only when current decision is under_investigation due to expired or carry_forward context.',
  })
  @ApiOkResponse({ description: 'Image CVE detail after reject' })
  @ApiConflictResponse({
    description: 'Decision is not in rejectable state (must be expired or carry_forward under_investigation)',
  })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async rejectDecisionReuse(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.rejectDecisionReuse(projectId, componentId, imageCveId);
  }

  @Post(':imageCveId/decision/refresh-expiry')
  @ApiOperation({
    summary: 'Materialize expired resolved decision into under_investigation context',
    description:
      'Transactional and idempotent. If expired, converts to under_investigation with expired context and clears expiry.',
  })
  @ApiOkResponse({ description: 'Image CVE detail after refresh (changed or unchanged)' })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async refreshDecisionExpiry(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.refreshDecisionExpiry(projectId, componentId, imageCveId);
  }

  @Put(':imageCveId/decision')
  @ApiOperation({
    summary: 'Save or overwrite the decision payload',
    description:
      'Uses internal-style decision payload. under_investigation resets to fresh and clears expiry.',
  })
  @ApiBody({
    description: 'Discriminated by `status`; resolved statuses require a future int64 `expiryTimeUnixSeconds`.',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['status', 'justification', 'impact_statement', 'status_notes', 'expiryTimeUnixSeconds'],
          properties: {
            status: { type: 'string', enum: ['not_affected'] },
            justification: {
              type: 'string',
              enum: [
                'component_not_present',
                'vulnerable_code_not_present',
                'vulnerable_code_not_in_execute_path',
                'vulnerable_code_cannot_be_controlled_by_adversary',
                'inline_mitigations_already_exist',
              ],
            },
            impact_statement: { type: 'string' },
            status_notes: { type: 'string' },
            expiryTimeUnixSeconds: { type: 'string', format: 'int64', example: '1798675200' },
          },
        },
        {
          type: 'object',
          required: ['status', 'action_statement', 'status_notes', 'expiryTimeUnixSeconds'],
          properties: {
            status: { type: 'string', enum: ['affected'] },
            action_statement: { type: 'string' },
            status_notes: { type: 'string' },
            expiryTimeUnixSeconds: { type: 'string', format: 'int64', example: '1798675200' },
          },
        },
        {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['under_investigation'] },
          },
        },
      ],
    },
    examples: {
      notAffected: {
        summary: 'Set not_affected decision',
        value: {
          status: 'not_affected',
          justification: 'component_not_present',
          impact_statement: 'Vulnerable component does not exist in this image.',
          status_notes: 'Confirmed by package inventory and file-system checks.',
          expiryTimeUnixSeconds: '1798675200',
        },
      },
      affected: {
        summary: 'Set affected decision',
        value: {
          status: 'affected',
          action_statement: 'Upgrade base image to patched version and redeploy.',
          status_notes: 'Exploit path is reachable from exposed service endpoint.',
          expiryTimeUnixSeconds: '1798675200',
        },
      },
      underInvestigation: {
        summary: 'Reset to fresh under_investigation',
        value: {
          status: 'under_investigation',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Image CVE detail after decision update' })
  @ApiBadRequestResponse({
    description:
      'Invalid decision payload or expiryTimeUnixSeconds not in int64/future format for resolved statuses',
  })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async updateDecision(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
    @Body() dto: UpdateImageCveDecisionDto,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.updateDecision(projectId, componentId, imageCveId, dto);
  }

  @Put(':imageCveId/advice')
  @ApiOperation({ summary: 'Save manual advice (full overwrite)' })
  @ApiOkResponse({ description: 'Image CVE detail after advice update' })
  @ApiNotFoundResponse({ description: 'Project, component, image, or image CVE not found' })
  async updateAdvice(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Param('imageCveId') imageCveId: string,
    @Body() dto: UpdateImageCveAdviceDto,
  ): Promise<ImageCveDetailDto> {
    return this.imageCvesService.updateAdvice(projectId, componentId, imageCveId, dto.content);
  }
}
