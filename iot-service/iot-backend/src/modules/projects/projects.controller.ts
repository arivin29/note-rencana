import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto, ProjectDetailedResponseDto } from './dto/project-response.dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully', type: ProjectResponseDto })
  create(@Body() createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'areaType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of projects' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('ownerId') ownerId?: string,
    @Query('areaType') areaType?: string,
    @Query('status') status?: string,
  ) {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
      ? req.user.idOwner 
      : ownerId;
      console.log('Final ownerId used for filtering:', finalOwnerId);

    return this.projectsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      ownerId: finalOwnerId,
      areaType,
      status,
    });
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get projects statistics overview' })
  @ApiQuery({ name: 'ownerId', required: false, type: String, description: 'Filter by owner ID' })
  @ApiResponse({ status: 200, description: 'Aggregated statistics' })
  async getStatistics(
    @Request() req: any,
    @Query('ownerId') ownerId?: string
  ) {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
      ? req.user.idOwner 
      : ownerId;

    return this.projectsService.getStatistics(finalOwnerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project found', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get project with detailed information' })
  @ApiResponse({ status: 200, description: 'Detailed project information', type: ProjectDetailedResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailedResponseDto> {
    return this.projectsService.findOneDetailed(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectsService.remove(id);
  }
}
