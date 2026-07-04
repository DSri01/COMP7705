import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { Cve } from '../../../db/entities/cves/definition.js';
import { CveResearchDocument } from '../../../db/entities/cve_research_documents/definition.js';
import { getCurrentTimeUnixSeconds } from '../../../utils/time.js';
import { DATA_SOURCE } from '../../database/database.constants.js';
import { assertCanonicalCveId } from '../cves/cve-id.util.js';
import type { CreateCveResearchDocumentDto } from './dto/create-cve-research-document.dto.js';
import type { UpdateCveResearchDocumentDto } from './dto/update-cve-research-document.dto.js';

@Injectable()
export class CveResearchDocumentsService {
  private readonly cveRepo: Repository<Cve>;
  private readonly docRepo: Repository<CveResearchDocument>;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    this.cveRepo = dataSource.getRepository(Cve);
    this.docRepo = dataSource.getRepository(CveResearchDocument);
  }

  private async requireCve(cveId: string): Promise<Cve> {
    assertCanonicalCveId(cveId);
    const cve = await this.cveRepo.findOne({ where: { cveId } });
    if (!cve) {
      throw new NotFoundException(`CVE ${cveId} not found`);
    }
    return cve;
  }

  async list(cveId: string): Promise<CveResearchDocument[]> {
    const cve = await this.requireCve(cveId);
    return this.docRepo.find({
      where: { cve: { cveId: cve.cveId } },
      relations: { cve: true },
      order: { createdAtUnixSeconds: 'DESC' },
    });
  }

  async getById(cveId: string, documentId: string): Promise<CveResearchDocument> {
    await this.requireCve(cveId);
    const doc = await this.docRepo.findOne({
      where: { id: documentId, cve: { cveId } },
      relations: { cve: true },
    });
    if (!doc) {
      throw new NotFoundException(`Research document ${documentId} not found for CVE ${cveId}`);
    }
    return doc;
  }

  async create(cveId: string, dto: CreateCveResearchDocumentDto): Promise<CveResearchDocument> {
    const cve = await this.requireCve(cveId);
    const now = getCurrentTimeUnixSeconds();
    const entity = this.docRepo.create({
      cve,
      source: 'user_upload',
      title: dto.title,
      content: dto.content,
      createdAtUnixSeconds: now,
    });
    return this.docRepo.save(entity);
  }

  /** Agent web fetch snapshot (`source: agent_lookup`). */
  async createAgentLookup(
    cveId: string,
    input: { title: string; content: string; createdAtUnixSeconds: bigint },
  ): Promise<CveResearchDocument> {
    const cve = await this.requireCve(cveId);
    const entity = this.docRepo.create({
      cve,
      source: 'agent_lookup',
      title: input.title,
      content: input.content,
      createdAtUnixSeconds: input.createdAtUnixSeconds,
    });
    return this.docRepo.save(entity);
  }

  async update(
    cveId: string,
    documentId: string,
    dto: UpdateCveResearchDocumentDto,
  ): Promise<CveResearchDocument> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('At least one of title, content must be provided');
    }
    const doc = await this.getById(cveId, documentId);
    if (dto.title !== undefined) {
      doc.title = dto.title;
    }
    if (dto.content !== undefined) {
      doc.content = dto.content;
    }
    return this.docRepo.save(doc);
  }

  async delete(cveId: string, documentId: string): Promise<void> {
    await this.getById(cveId, documentId);
    await this.docRepo.delete({ id: documentId, cve: { cveId } });
  }
}
