import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { z } from 'zod';
import { NVD_CVE_APIClient } from '../../../apiClients/nvd_cve/definition.js';
import { EPSS_APIClient } from '../../../apiClients/epss/definition.js';
import { Cve } from '../../../db/entities/cves/definition.js';
import { refreshCveIntel } from '../../../cveIntelRefresh/definition.js';
import { getCurrentTimeUnixSeconds } from '../../../utils/time.js';
import { DATA_SOURCE } from '../../database/database.constants.js';
import { APP_CONFIGURATION } from '../../configuration/configuration.constants.js';
import { AppConfigurationSchema } from '../../../configuration/schema.js';
import { assertCanonicalCveId } from './cve-id.util.js';
import type { CreateCveDto } from './dto/create-cve.dto.js';

@Injectable()
export class CvesService {
  private readonly cveRepo: Repository<Cve>;
  private readonly nvdClient: NVD_CVE_APIClient;
  private readonly epssClient: EPSS_APIClient;

  constructor(
    @Inject(DATA_SOURCE) private readonly dataSource: DataSource,
    @Inject(APP_CONFIGURATION) configuration: z.infer<typeof AppConfigurationSchema>,
  ) {
    this.cveRepo = dataSource.getRepository(Cve);
    this.nvdClient = new NVD_CVE_APIClient(configuration.secrets.nvdApiKey);
    this.epssClient = new EPSS_APIClient();
  }

  async list(offset: number, limit: number): Promise<Cve[]> {
    return this.cveRepo.find({
      order: { cveId: 'ASC' },
      skip: offset,
      take: limit,
    });
  }

  async getById(cveId: string): Promise<Cve> {
    assertCanonicalCveId(cveId);
    const cve = await this.cveRepo.findOne({ where: { cveId } });
    if (!cve) {
      throw new NotFoundException(`CVE ${cveId} not found`);
    }
    return cve;
  }

  async create(dto: CreateCveDto): Promise<Cve> {
    assertCanonicalCveId(dto.cveId);
    const existing = await this.cveRepo.findOne({ where: { cveId: dto.cveId } });
    if (existing) {
      throw new ConflictException(`CVE ${dto.cveId} already exists`);
    }
    const cve = this.cveRepo.create({
      cveId: dto.cveId,
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
    });
    return this.cveRepo.save(cve);
  }

  async refreshIntel(cveId: string): Promise<Cve> {
    assertCanonicalCveId(cveId);
    const result = await refreshCveIntel(
      this.dataSource,
      { nvd: this.nvdClient, epss: this.epssClient },
      cveId,
      getCurrentTimeUnixSeconds,
    );
    if (!result.ok) {
      throw new NotFoundException(`CVE ${cveId} not found`);
    }
    return this.getById(cveId);
  }

  async updateResearchSummary(cveId: string, researchSummary: string): Promise<Cve> {
    const cve = await this.getById(cveId);
    cve.researchSummary = researchSummary;
    return this.cveRepo.save(cve);
  }
}
