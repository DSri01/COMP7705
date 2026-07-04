import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComponentsService } from './components.service.js';
import { CreateComponentDto } from './dto/create-component.dto.js';
import { UpdateComponentDto } from './dto/update-component.dto.js';
import { ComponentResponseDto } from './dto/component-response.dto.js';
import { ImageCveStatsResponseDto } from './dto/image-cve-stats-response.dto.js';

@ApiTags('components')
@Controller('projects/:projectId/components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Get()
  @ApiOperation({ summary: 'List components in a project' })
  @ApiOkResponse({ description: 'List of components', type: ComponentResponseDto, isArray: true })
  async list(@Param('projectId') projectId: string): Promise<ComponentResponseDto[]> {
    const components = await this.componentsService.list(projectId);
    return components.map(component => ({
      id: component.id,
      projectId: component.project.id,
      name: component.name,
      description: component.description,
      createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    }));
  }

  @Get(':componentId')
  @ApiOperation({ summary: 'Get a component by ID within a project' })
  @ApiOkResponse({ description: 'Component details', type: ComponentResponseDto })
  async getById(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<ComponentResponseDto> {
    const component = await this.componentsService.getById(projectId, componentId);
    return {
      id: component.id,
      projectId: component.project.id,
      name: component.name,
      description: component.description,
      createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    };
  }

  @Get(':componentId/vex')
  @ApiOperation({ summary: 'Generate OpenVEX document for the latest image in component chain' })
  @ApiOkResponse({ description: 'OpenVEX v0.2.0 document for latest image', schema: { type: 'object' } })
  async exportVex(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<Record<string, unknown>> {
    return this.componentsService.exportVex(projectId, componentId);
  }

  @Post(':componentId/scan')
  @ApiOperation({ summary: 'Trigger asynchronous scan for the current component image' })
  @ApiOkResponse({ description: 'Scan trigger feedback' })
  async triggerScan(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<{ status: 'ok' | 'container_not_uploaded' }> {
    return this.componentsService.triggerScan(projectId, componentId);
  }

  @Get(':componentId/stats')
  @ApiOperation({
    summary:
      'Get enabled image-CVE stats for the latest image in this component (vexStatus - severity distribution)',
  })
  @ApiOkResponse({ description: 'Component latest-image enabled CVE stats', type: ImageCveStatsResponseDto })
  @ApiNotFoundResponse({ description: 'Project or component not found' })
  async getStats(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
  ): Promise<ImageCveStatsResponseDto> {
    return this.componentsService.getStats(projectId, componentId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a component in a project' })
  @ApiCreatedResponse({ description: 'Component created', type: ComponentResponseDto })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateComponentDto,
  ): Promise<ComponentResponseDto> {
    const component = await this.componentsService.create(projectId, dto);
    return {
      id: component.id,
      projectId: component.project.id,
      name: component.name,
      description: component.description,
      createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    };
  }

  @Put(':componentId')
  @ApiOperation({ summary: 'Update a component by ID within a project' })
  @ApiOkResponse({ description: 'Component updated', type: ComponentResponseDto })
  async update(
    @Param('projectId') projectId: string,
    @Param('componentId') componentId: string,
    @Body() dto: UpdateComponentDto,
  ): Promise<ComponentResponseDto> {
    const component = await this.componentsService.update(projectId, componentId, dto);
    return {
      id: component.id,
      projectId: component.project.id,
      name: component.name,
      description: component.description,
      createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
      updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    };
  }
}
