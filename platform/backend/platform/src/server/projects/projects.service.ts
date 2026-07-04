import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../database/database.constants.js';
import { Project } from '../../db/entities/projects/definition.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { getCurrentTimeUnixSeconds } from '../../utils/time.js';
import { Component } from '../../db/entities/components/definition.js';
import { ContainerImage } from '../../db/entities/container_images/definition.js';
import { ImageCve } from '../../db/entities/image_cve/definition.js';
import {
  accumulateImageCveStats,
  createEmptyImageCveStats,
  type ImageCveStats,
} from '../components/image_cves/image_cve_stats.js';

@Injectable()
export class ProjectsService {
  private readonly projectRepo: Repository<Project>;

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {
    this.projectRepo = dataSource.getRepository(Project);
  }

  list(): Promise<Project[]> {
    return this.projectRepo.find();
  }

  async getById(id: string): Promise<Project> {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const now = getCurrentTimeUnixSeconds();
    const project = this.projectRepo.create({
      name: dto.name,
      description: dto.description,
      createdAtUnixSeconds: now,
      updatedAtUnixSeconds: now,
    });
    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.getById(id);

    project.description = dto.description;
    project.updatedAtUnixSeconds = getCurrentTimeUnixSeconds();

    return this.projectRepo.save(project);
  }

  async getStats(projectId: string): Promise<ImageCveStats> {
    await this.getById(projectId);
    const stats = createEmptyImageCveStats();
    const componentRepo = this.dataSource.getRepository(Component);
    const containerImageRepo = this.dataSource.getRepository(ContainerImage);
    const imageCveRepo = this.dataSource.getRepository(ImageCve);
    const components = await componentRepo.find({
      where: { project: { id: projectId } },
    });
    for (const component of components) {
      const latestImage = await containerImageRepo.findOne({
        where: { component: { id: component.id } },
        order: { chainIndex: 'DESC' },
      });
      if (!latestImage) {
        continue;
      }
      const rows = await imageCveRepo.find({
        where: {
          containerImage: { id: latestImage.id },
          isDisabled: false,
        },
        relations: { cve: true },
      });
      accumulateImageCveStats(stats, rows, getCurrentTimeUnixSeconds());
    }
    return stats;
  }
}