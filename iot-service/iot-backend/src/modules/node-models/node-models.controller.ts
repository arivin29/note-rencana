import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodeModelsService } from './node-models.service';
import { CreateNodeModelDto } from './dto/create-node-model.dto';
import { UpdateNodeModelDto } from './dto/update-node-model.dto';
import { NodeModelResponseDto, NodeModelDetailedResponseDto } from './dto/node-model-response.dto';

@ApiTags('Node Models')
@Controller('node-models')
export class NodeModelsController {
  constructor(private readonly nodeModelsService: NodeModelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new node model (hardware catalog)' })
  @ApiResponse({ status: 201, description: 'Node model created successfully', type: NodeModelResponseDto })
  create(@Body() createDto: CreateNodeModelDto): Promise<NodeModelResponseDto> {
    return this.nodeModelsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all node models with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'vendor', required: false, type: String })
  @ApiQuery({ name: 'protocol', required: false, type: String })
  @ApiQuery({ name: 'hardwareClass', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of node models' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('vendor') vendor?: string,
    @Query('protocol') protocol?: string,
    @Query('hardwareClass') hardwareClass?: string,
  ) {
    return this.nodeModelsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      vendor,
      protocol,
      hardwareClass,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node model by ID' })
  @ApiResponse({ status: 200, description: 'Node model found', type: NodeModelResponseDto })
  @ApiResponse({ status: 404, description: 'Node model not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeModelResponseDto> {
    return this.nodeModelsService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get node model with nodes and usage stats' })
  @ApiResponse({ status: 200, description: 'Detailed node model information', type: NodeModelDetailedResponseDto })
  @ApiResponse({ status: 404, description: 'Node model not found' })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<NodeModelDetailedResponseDto> {
    return this.nodeModelsService.findOneDetailed(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update node model' })
  @ApiResponse({ status: 200, description: 'Node model updated successfully', type: NodeModelResponseDto })
  @ApiResponse({ status: 404, description: 'Node model not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeModelDto,
  ): Promise<NodeModelResponseDto> {
    return this.nodeModelsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node model' })
  @ApiResponse({ status: 200, description: 'Node model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Node model not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nodeModelsService.remove(id);
  }
}
