import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodeLocationsService } from './node-locations.service';
import { CreateNodeLocationDto } from './dto/create-node-location.dto';
import { UpdateNodeLocationDto } from './dto/update-node-location.dto';
import { NodeLocationResponseDto } from './dto/node-location-response.dto';

@ApiTags('Node Locations')
@Controller('node-locations')
export class NodeLocationsController {
  constructor(private readonly nodeLocationsService: NodeLocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new node location' })
  @ApiResponse({ status: 201, type: NodeLocationResponseDto })
  create(@Body() createDto: CreateNodeLocationDto): Promise<NodeLocationResponseDto> {
    return this.nodeLocationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all node locations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idProject', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idProject') idProject?: string,
    @Query('type') type?: string,
  ) {
    return this.nodeLocationsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idProject,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node location by ID' })
  @ApiResponse({ status: 200, type: NodeLocationResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeLocationResponseDto> {
    return this.nodeLocationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update node location' })
  @ApiResponse({ status: 200, type: NodeLocationResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeLocationDto,
  ): Promise<NodeLocationResponseDto> {
    return this.nodeLocationsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node location' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nodeLocationsService.remove(id);
  }
}
