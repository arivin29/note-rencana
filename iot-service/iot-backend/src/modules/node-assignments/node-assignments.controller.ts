import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodeAssignmentsService } from './node-assignments.service';
import { CreateNodeAssignmentDto } from './dto/create-node-assignment.dto';
import { UpdateNodeAssignmentDto } from './dto/update-node-assignment.dto';
import { NodeAssignmentResponseDto } from './dto/node-assignment-response.dto';

@ApiTags('Node Assignments')
@Controller('node-assignments')
export class NodeAssignmentsController {
  constructor(private readonly nodeAssignmentsService: NodeAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new node assignment' })
  @ApiResponse({ status: 201, type: NodeAssignmentResponseDto })
  create(@Body() createDto: CreateNodeAssignmentDto): Promise<NodeAssignmentResponseDto> {
    return this.nodeAssignmentsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all node assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idNode', required: false, type: String })
  @ApiQuery({ name: 'idProject', required: false, type: String })
  @ApiQuery({ name: 'idOwner', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idNode') idNode?: string,
    @Query('idProject') idProject?: string,
    @Query('idOwner') idOwner?: string,
  ) {
    return this.nodeAssignmentsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idNode,
      idProject,
      idOwner,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node assignment by ID' })
  @ApiResponse({ status: 200, type: NodeAssignmentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeAssignmentResponseDto> {
    return this.nodeAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update node assignment' })
  @ApiResponse({ status: 200, type: NodeAssignmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeAssignmentDto,
  ): Promise<NodeAssignmentResponseDto> {
    return this.nodeAssignmentsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node assignment' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nodeAssignmentsService.remove(id);
  }
}
