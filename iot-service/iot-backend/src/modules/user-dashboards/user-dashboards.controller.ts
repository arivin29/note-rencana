import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserDashboardsService } from './user-dashboards.service';
import { CreateUserDashboardDto } from './dto/create-user-dashboard.dto';
import { UpdateUserDashboardDto } from './dto/update-user-dashboard.dto';
import { UserDashboardResponseDto, UserDashboardDetailedResponseDto } from './dto/user-dashboard-response.dto';

@ApiTags('User Dashboards')
@Controller('user-dashboards')
export class UserDashboardsController {
  constructor(private readonly userDashboardsService: UserDashboardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({ status: 201, type: UserDashboardResponseDto })
  create(@Body() createDto: CreateUserDashboardDto): Promise<UserDashboardResponseDto> {
    return this.userDashboardsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dashboards' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idUser', required: false, type: String })
  @ApiQuery({ name: 'idProject', required: false, type: String })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idUser') idUser?: string,
    @Query('idProject') idProject?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    return this.userDashboardsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idUser,
      idProject,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({ status: 200, type: UserDashboardResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDashboardResponseDto> {
    return this.userDashboardsService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get dashboard with widgets' })
  @ApiResponse({ status: 200, type: UserDashboardDetailedResponseDto })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<UserDashboardDetailedResponseDto> {
    return this.userDashboardsService.findOneDetailed(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({ status: 200, type: UserDashboardResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDashboardDto,
  ): Promise<UserDashboardResponseDto> {
    return this.userDashboardsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userDashboardsService.remove(id);
  }
}
