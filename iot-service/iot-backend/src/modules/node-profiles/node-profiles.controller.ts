import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NodeProfilesService } from './node-profiles.service';
import { CreateNodeProfileDto } from './dto/create-node-profile.dto';
import { UpdateNodeProfileDto } from './dto/update-node-profile.dto';
import { NodeProfileResponseDto } from './dto/node-profile-response.dto';

@ApiTags('Node Profiles')
@Controller('node-profiles')
export class NodeProfilesController {
  constructor(private readonly nodeProfilesService: NodeProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new node profile' })
  @ApiResponse({ status: 201, type: NodeProfileResponseDto })
  create(@Body() createDto: CreateNodeProfileDto): Promise<NodeProfileResponseDto> {
    return this.nodeProfilesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all node profiles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idNodeModel', required: false, type: String })
  @ApiQuery({ name: 'idProject', required: false, type: String })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idNodeModel') idNodeModel?: string,
    @Query('idProject') idProject?: string,
    @Query('enabled') enabled?: string,
    @Query('search') search?: string,
  ) {
    return this.nodeProfilesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idNodeModel,
      idProject,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      search,
    });
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Get node profile by code' })
  @ApiResponse({ status: 200, type: NodeProfileResponseDto })
  findByCode(@Param('code') code: string): Promise<NodeProfileResponseDto> {
    return this.nodeProfilesService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node profile by ID' })
  @ApiResponse({ status: 200, type: NodeProfileResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NodeProfileResponseDto> {
    return this.nodeProfilesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update node profile' })
  @ApiResponse({ status: 200, type: NodeProfileResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNodeProfileDto,
  ): Promise<NodeProfileResponseDto> {
    return this.nodeProfilesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node profile' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nodeProfilesService.remove(id);
  }
}
