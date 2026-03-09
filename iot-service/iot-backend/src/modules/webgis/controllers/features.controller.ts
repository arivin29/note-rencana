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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FeaturesService } from '../services/features.service';
import {
  CreateFeatureDto,
  UpdateFeatureDto,
  BulkCreateFeaturesDto,
  FeatureResponseDto,
} from '../dto';

@ApiTags('WebGIS - Features')
@ApiBearerAuth()
@Controller('webgis/features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post(':layerId')
  @ApiOperation({ summary: 'Create a new feature in a layer' })
  @ApiResponse({ status: 201, type: FeatureResponseDto })
  async create(
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @Body() dto: CreateFeatureDto,
  ): Promise<FeatureResponseDto> {
    return this.featuresService.create(layerId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create features' })
  @ApiResponse({ status: 201, description: 'Features created' })
  async bulkCreate(
    @Body() dto: BulkCreateFeaturesDto,
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    return this.featuresService.bulkCreate(dto);
  }

  @Get('layer/:layerId')
  @ApiOperation({ summary: 'Get all features in a layer' })
  @ApiQuery({ name: 'bbox', required: false, description: 'Bounding box filter: minX,minY,maxX,maxY' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of features' })
  async findByLayer(
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @Query('bbox') bboxStr?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ data: FeatureResponseDto[]; total: number }> {
    let bbox: [number, number, number, number] | undefined;
    if (bboxStr) {
      const parts = bboxStr.split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        bbox = parts as [number, number, number, number];
      }
    }

    return this.featuresService.findByLayer(layerId, {
      bbox,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, type: FeatureResponseDto })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FeatureResponseDto> {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feature' })
  @ApiResponse({ status: 200, type: FeatureResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureDto,
  ): Promise<FeatureResponseDto> {
    return this.featuresService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feature' })
  @ApiResponse({ status: 200, description: 'Feature deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.featuresService.remove(id);
    return { success: true };
  }

  @Delete('layer/:layerId')
  @ApiOperation({ summary: 'Delete all features in a layer' })
  @ApiResponse({ status: 200, description: 'Features deleted' })
  async removeByLayer(
    @Param('layerId', ParseUUIDPipe) layerId: string,
  ): Promise<{ deleted: number }> {
    return this.featuresService.removeByLayer(layerId);
  }
}
