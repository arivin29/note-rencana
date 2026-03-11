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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService, CategoryQueryOptions } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import { MapLayerCategory } from '../../../entities/map-layer-category.entity';

@ApiTags('WebGIS - Categories')
@ApiBearerAuth()
@Controller('webgis/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new layer category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(
    @Request() req: any,
    @Body() dto: CreateCategoryDto,
  ): Promise<MapLayerCategory> {
    // Auto-assign owner if not admin
    if (req.user?.role !== 'admin' && req.user?.idOwner) {
      dto.idOwner = req.user.idOwner;
    }
    return this.categoriesService.create(dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'industryCode', required: false, description: 'Filter by industry code' })
  @ApiQuery({ name: 'isOperational', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSystem', required: false, type: Boolean, description: 'Include system categories (default: true)' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll(
    @Request() req: any,
    @Query('ownerId') ownerId?: string,
    @Query('industryCode') industryCode?: string,
    @Query('isOperational') isOperational?: string,
    @Query('includeSystem') includeSystem?: string,
  ): Promise<MapLayerCategory[]> {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner ? req.user.idOwner : ownerId;

    const options: CategoryQueryOptions = {
      ownerId: finalOwnerId,
      industryCode,
      isOperational: isOperational !== undefined ? isOperational === 'true' : undefined,
      includeSystem: includeSystem !== undefined ? includeSystem === 'true' : true,
    };

    return this.categoriesService.findAll(options);
  }

  @Get('industries')
  @ApiOperation({ summary: 'Get list of supported industries' })
  @ApiResponse({ status: 200, description: 'List of industry codes' })
  getIndustries(): { code: string; name: string }[] {
    return [
      { code: 'water_utility', name: 'Water Utility / PDAM' },
      { code: 'energy', name: 'Energy / Power Grid' },
      { code: 'manufacturing', name: 'Manufacturing' },
      { code: 'agriculture', name: 'Agriculture' },
      { code: 'smart_building', name: 'Smart Building' },
      { code: 'logistics', name: 'Logistics & Transportation' },
      { code: 'oil_gas', name: 'Oil & Gas' },
      { code: 'telecom', name: 'Telecommunications' },
      { code: 'general', name: 'General / Other' },
    ];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MapLayerCategory> {
    return this.categoriesService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get category by code' })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiResponse({ status: 200, description: 'Category found' })
  async findByCode(
    @Param('code') code: string,
    @Query('ownerId') ownerId?: string,
  ): Promise<MapLayerCategory | null> {
    return this.categoriesService.findByCode(code, ownerId);
  }

  @Get(':code/template-fields')
  @ApiOperation({ summary: 'Get template fields for a category (for auto-mapping)' })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiResponse({ status: 200, description: 'Template fields' })
  async getTemplateFields(
    @Param('code') code: string,
    @Query('ownerId') ownerId?: string,
  ): Promise<{ name: string; type: string; required: boolean; aliases: string[] }[]> {
    return this.categoriesService.getTemplateFields(code, ownerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<MapLayerCategory> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.categoriesService.remove(id);
    return { success: true };
  }

  @Post('seed-system')
  @ApiOperation({ summary: 'Seed default system categories (admin only)' })
  @ApiResponse({ status: 200, description: 'System categories seeded' })
  async seedSystemCategories(): Promise<{ success: boolean }> {
    await this.categoriesService.seedSystemCategories();
    return { success: true };
  }
}
