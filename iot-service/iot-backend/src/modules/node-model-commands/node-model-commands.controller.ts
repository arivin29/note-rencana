import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodeModelCommandsService } from './node-model-commands.service';
import { CreateNodeModelCommandDto } from './dto/create-node-model-command.dto';
import { UpdateNodeModelCommandDto } from './dto/update-node-model-command.dto';
import { NodeModelCommandResponseDto, NodeModelCommandWithModelResponseDto } from './dto/node-model-command-response.dto';

@ApiTags('Node Model Commands')
@Controller('node-model-commands')
export class NodeModelCommandsController {
  constructor(private readonly commandsService: NodeModelCommandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new command template for a node model' })
  @ApiResponse({ status: 201, description: 'Command created successfully', type: NodeModelCommandResponseDto })
  @ApiResponse({ status: 409, description: 'Command code already exists for this node model' })
  create(@Body() createDto: CreateNodeModelCommandDto): Promise<NodeModelCommandResponseDto> {
    return this.commandsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all commands with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'idNodeModel', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of commands' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('idNodeModel') idNodeModel?: string,
    @Query('channel') channel?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.commandsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      idNodeModel,
      channel,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('by-node-model/:idNodeModel')
  @ApiOperation({ summary: 'Get all active commands for a specific node model' })
  @ApiResponse({ status: 200, description: 'List of commands for node model', type: [NodeModelCommandResponseDto] })
  findByNodeModel(
    @Param('idNodeModel', ParseUUIDPipe) idNodeModel: string,
  ): Promise<NodeModelCommandResponseDto[]> {
    return this.commandsService.findByNodeModel(idNodeModel);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get command by ID' })
  @ApiResponse({ status: 200, description: 'Command found', type: NodeModelCommandResponseDto })
  @ApiResponse({ status: 404, description: 'Command not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeModelCommandResponseDto> {
    return this.commandsService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get command with node model details' })
  @ApiResponse({ status: 200, description: 'Command with model details', type: NodeModelCommandWithModelResponseDto })
  @ApiResponse({ status: 404, description: 'Command not found' })
  findOneWithModel(@Param('id', ParseUUIDPipe) id: string): Promise<NodeModelCommandWithModelResponseDto> {
    return this.commandsService.findOneWithModel(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update command' })
  @ApiResponse({ status: 200, description: 'Command updated successfully', type: NodeModelCommandResponseDto })
  @ApiResponse({ status: 404, description: 'Command not found' })
  @ApiResponse({ status: 409, description: 'Command code already exists for this node model' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeModelCommandDto,
  ): Promise<NodeModelCommandResponseDto> {
    return this.commandsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete command' })
  @ApiResponse({ status: 200, description: 'Command deleted successfully' })
  @ApiResponse({ status: 404, description: 'Command not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commandsService.remove(id);
  }
}
