import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CveResearchDocumentsService } from './cve_research_documents.service.js';
import { CreateCveResearchDocumentDto } from './dto/create-cve-research-document.dto.js';
import { UpdateCveResearchDocumentDto } from './dto/update-cve-research-document.dto.js';
import { CveResearchDocumentResponseDto } from './dto/cve-research-document-response.dto.js';
import type { CveResearchDocument } from '../../../db/entities/cve_research_documents/definition.js';

function toDocResponseDto(doc: CveResearchDocument): CveResearchDocumentResponseDto {
  return {
    id: doc.id,
    cveId: doc.cve.cveId,
    source: doc.source,
    title: doc.title,
    content: doc.content,
    createdAtUnixSeconds: doc.createdAtUnixSeconds.toString(),
  };
}

@ApiTags('cve-research-documents')
@Controller('cves/:cveId/research-documents')
export class CveResearchDocumentsController {
  constructor(private readonly cveResearchDocumentsService: CveResearchDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List research documents for a CVE' })
  @ApiOkResponse({ description: 'Research documents', type: CveResearchDocumentResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE not found' })
  async list(@Param('cveId') cveId: string): Promise<CveResearchDocumentResponseDto[]> {
    const rows = await this.cveResearchDocumentsService.list(cveId);
    return rows.map(toDocResponseDto);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a research document by id (scoped to CVE)' })
  @ApiOkResponse({ description: 'Research document', type: CveResearchDocumentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE or document not found' })
  async getById(
    @Param('cveId') cveId: string,
    @Param('documentId') documentId: string,
  ): Promise<CveResearchDocumentResponseDto> {
    const doc = await this.cveResearchDocumentsService.getById(cveId, documentId);
    return toDocResponseDto(doc);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a user-upload research document for a CVE',
    description: 'Body is title + content only; `source` is always stored as `user_upload`.',
  })
  @ApiCreatedResponse({ description: 'Document created', type: CveResearchDocumentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE not found' })
  async create(
    @Param('cveId') cveId: string,
    @Body() dto: CreateCveResearchDocumentDto,
  ): Promise<CveResearchDocumentResponseDto> {
    const doc = await this.cveResearchDocumentsService.create(cveId, dto);
    return toDocResponseDto(doc);
  }

  @Patch(':documentId')
  @ApiOperation({ summary: 'Update title/content of a research document' })
  @ApiOkResponse({ description: 'Document updated', type: CveResearchDocumentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CVE id or empty patch body' })
  @ApiNotFoundResponse({ description: 'CVE or document not found' })
  async update(
    @Param('cveId') cveId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateCveResearchDocumentDto,
  ): Promise<CveResearchDocumentResponseDto> {
    const doc = await this.cveResearchDocumentsService.update(cveId, documentId, dto);
    return toDocResponseDto(doc);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a research document' })
  @ApiNoContentResponse({ description: 'Document deleted' })
  @ApiBadRequestResponse({ description: 'Invalid CVE id format' })
  @ApiNotFoundResponse({ description: 'CVE or document not found' })
  async delete(@Param('cveId') cveId: string, @Param('documentId') documentId: string): Promise<void> {
    await this.cveResearchDocumentsService.delete(cveId, documentId);
  }
}
