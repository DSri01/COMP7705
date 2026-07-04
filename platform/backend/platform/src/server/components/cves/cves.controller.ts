import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Cve } from '../../../db/entities/cves/definition.js';
import { CvesService } from './cves.service.js';
import { CreateCveDto } from './dto/create-cve.dto.js';
import { CveResponseDto } from './dto/cve-response.dto.js';
import { UpdateCveResearchSummaryDto } from './dto/update-cve-research-summary.dto.js';

function toCveResponseDto(cve: Cve): CveResponseDto {
  return {
    cveId: cve.cveId,
    severity: cve.severity,
    intelHighlights: cve.intelHighlights,
    intelLastAttemptAtUnixSeconds: cve.intelLastAttemptAtUnixSeconds.toString(),
    intelUpdatedAtUnixSeconds: cve.intelUpdatedAtUnixSeconds.toString(),
    researchSummary: cve.researchSummary,
  };
}

@ApiTags('cves')
@Controller('cves')
export class CvesController {
  constructor(private readonly cvesService: CvesService) {}

  @Get()
  @ApiOperation({ summary: 'List CVEs (includes severity)' })
  @ApiQuery({ name: 'offset', required: false, example: 0, description: 'Number of rows to skip' })
  @ApiQuery({ name: 'limit', required: false, example: 50, description: 'Max rows to return (capped at 200)' })
  @ApiOkResponse({ description: 'Paged list of CVEs', type: CveResponseDto, isArray: true })
  async list(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<CveResponseDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.cvesService.list(safeOffset, safeLimit);
    return rows.map(toCveResponseDto);
  }

  @Post()
  @ApiOperation({ summary: 'Register a CVE by id only' })
  @ApiCreatedResponse({ description: 'CVE created', type: CveResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiConflictResponse({ description: 'CVE already exists' })
  async create(@Body() dto: CreateCveDto): Promise<CveResponseDto> {
    const cve = await this.cvesService.create(dto);
    return toCveResponseDto(cve);
  }

  @Post(':cveId/intel/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh NVD/EPSS intel and merge KEV from the database' })
  @ApiOkResponse({ description: 'CVE after intel refresh', type: CveResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE not found' })
  async refreshIntel(@Param('cveId') cveId: string): Promise<CveResponseDto> {
    const cve = await this.cvesService.refreshIntel(cveId);
    return toCveResponseDto(cve);
  }

  @Put(':cveId/research-summary')
  @ApiOperation({ summary: 'Save manual research summary (full overwrite)' })
  @ApiOkResponse({ description: 'CVE after research summary update', type: CveResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format or invalid body' })
  @ApiNotFoundResponse({ description: 'CVE not found' })
  async updateResearchSummary(
    @Param('cveId') cveId: string,
    @Body() dto: UpdateCveResearchSummaryDto,
  ): Promise<CveResponseDto> {
    const cve = await this.cvesService.updateResearchSummary(cveId, dto.researchSummary);
    return toCveResponseDto(cve);
  }

  @Get(':cveId')
  @ApiOperation({ summary: 'Get a CVE by id' })
  @ApiOkResponse({ description: 'CVE details', type: CveResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE not found' })
  async getById(@Param('cveId') cveId: string): Promise<CveResponseDto> {
    const cve = await this.cvesService.getById(cveId);
    return toCveResponseDto(cve);
  }
}
