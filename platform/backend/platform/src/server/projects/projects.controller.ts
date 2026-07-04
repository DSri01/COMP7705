import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectResponseDto } from './dto/project-response.dto.js';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImageCveStatsResponseDto } from '../components/dto/image-cve-stats-response.dto.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiOkResponse({ description: 'List of projects', type: ProjectResponseDto, isArray: true })
  async list(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectsService.list();
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiOkResponse({ description: 'Project details', type: ProjectResponseDto })
  async getById(@Param('id') id: string): Promise<ProjectResponseDto> {
    const project = await this.projectsService.getById(id);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    };
  }

  @Get(':id/stats')
  @ApiOperation({
    summary:
      'Get project enabled image-CVE stats aggregated over latest image of each component (vexStatus - severity)',
  })
  @ApiOkResponse({ description: 'Project latest-image enabled CVE stats', type: ImageCveStatsResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async getStats(@Param('id') id: string): Promise<ImageCveStatsResponseDto> {
    return this.projectsService.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({ description: 'Project created', type: ProjectResponseDto })
  async create(@Body() dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(dto);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiOkResponse({ description: 'Project updated', type: ProjectResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(id, dto);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    };
  }
}