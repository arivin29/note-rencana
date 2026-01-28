import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { NodeResponseDto, NodeDetailedResponseDto } from './dto/node-response.dto';

@ApiTags('Nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new node (device)' })
  @ApiResponse({ status: 201, description: 'Node created successfully', type: NodeResponseDto })
  create(@Body() createDto: CreateNodeDto): Promise<NodeResponseDto> {
    return this.nodesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nodes with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by code' })
  @ApiQuery({ name: 'idProject', required: false, type: String })
  @ApiQuery({ name: 'idNodeModel', required: false, type: String })
  @ApiQuery({ name: 'idNodeProfile', required: false, type: String, description: 'Filter by node profile ID' })
  @ApiQuery({ name: 'idNodeProfileIsNull', required: false, type: Boolean, description: 'Filter nodes without node profile (unpaired)' })
  @ApiQuery({ name: 'connectivityStatus', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String, description: 'Filter by owner ID' })
  @ApiResponse({ status: 200, description: 'List of nodes' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('idProject') idProject?: string,
    @Query('idNodeModel') idNodeModel?: string,
    @Query('idNodeProfile') idNodeProfile?: string,
    @Query('idNodeProfileIsNull') idNodeProfileIsNull?: string,
    @Query('connectivityStatus') connectivityStatus?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
      ? req.user.idOwner 
      : ownerId;

    return this.nodesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      idProject,
      idNodeModel,
      idNodeProfile,
      idNodeProfileIsNull: idNodeProfileIsNull === 'true',
      connectivityStatus,
      ownerId: finalOwnerId,
    });
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get aggregated node statistics' })
  @ApiQuery({ name: 'ownerId', required: false, type: String, description: 'Filter by owner ID' })
  @ApiResponse({ status: 200, description: 'Node statistics overview' })
  getStatistics(
    @Request() req: any,
    @Query('ownerId') ownerId?: string
  ) {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
      ? req.user.idOwner 
      : ownerId;

    return this.nodesService.getStatisticsOverview(finalOwnerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node by ID' })
  @ApiResponse({ status: 200, description: 'Node found', type: NodeResponseDto })
  @ApiResponse({ status: 404, description: 'Node not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeResponseDto> {
    return this.nodesService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get node with detailed information (sensors, stats)' })
  @ApiResponse({ status: 200, description: 'Detailed node information', type: NodeDetailedResponseDto })
  @ApiResponse({ status: 404, description: 'Node not found' })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<NodeDetailedResponseDto> {
    return this.nodesService.findOneDetailed(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get node dashboard data with health status and sensors' })
  @ApiResponse({ status: 200, description: 'Node dashboard data' })
  getDashboard(@Param('id') id: string) {
    return this.nodesService.getDashboard(id);
  }

  @Get(':id/sensors')
  @ApiOperation({ summary: 'Get all sensors attached to this node' })
  @ApiResponse({ status: 200, description: 'List of sensors with channels' })
  getSensors(@Param('id') id: string) {
    return this.nodesService.getSensors(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update node' })
  @ApiResponse({ status: 200, description: 'Node updated successfully', type: NodeResponseDto })
  @ApiResponse({ status: 404, description: 'Node not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeDto,
  ): Promise<NodeResponseDto> {
    return this.nodesService.update(id, updateDto);
  }

  @Patch(':id/connectivity')
  @ApiOperation({ summary: 'Update node connectivity status' })
  @ApiResponse({ status: 200, description: 'Connectivity status updated', type: NodeResponseDto })
  updateConnectivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ): Promise<NodeResponseDto> {
    return this.nodesService.updateConnectivityStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node' })
  @ApiResponse({ status: 200, description: 'Node deleted successfully' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nodesService.remove(id);
  }
}
