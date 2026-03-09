import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MapLayer } from '../../../entities/map-layer.entity';
import { MapLayerFeature } from '../../../entities/map-layer-feature.entity';
import { CreateFeatureDto, UpdateFeatureDto, BulkCreateFeaturesDto, FeatureResponseDto } from '../dto';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(MapLayer)
    private readonly layerRepository: Repository<MapLayer>,
    @InjectRepository(MapLayerFeature)
    private readonly featureRepository: Repository<MapLayerFeature>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a single feature (using JSONB geometry instead of PostGIS)
   */
  async create(layerId: string, dto: CreateFeatureDto): Promise<FeatureResponseDto> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: layerId } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${layerId}" not found`);
    }

    if (layer.isLocked) {
      throw new BadRequestException('Cannot add features to locked layer');
    }

    const feature = this.featureRepository.create({
      idLayer: layerId,
      geometryJson: dto.geometry,
      propertiesJson: dto.properties || {},
      label: dto.label,
      externalId: dto.externalId,
    });

    const saved = await this.featureRepository.save(feature);

    // Update feature count
    await this.updateFeatureCount(layerId);

    return this.toResponse(saved);
  }

  /**
   * Bulk create features
   */
  async bulkCreate(dto: BulkCreateFeaturesDto): Promise<{ created: number; failed: number; errors: string[] }> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: dto.idLayer } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${dto.idLayer}" not found`);
    }

    if (layer.isLocked) {
      throw new BadRequestException('Cannot add features to locked layer');
    }

    let created = 0;
    const errors: string[] = [];

    await this.dataSource.transaction(async manager => {
      for (let i = 0; i < dto.features.length; i++) {
        const feature = dto.features[i];
        try {
          await manager.query(
            `INSERT INTO map_layer_feature (id_layer, geometry_json, properties_json, label, external_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [dto.idLayer, JSON.stringify(feature.geometry), feature.properties || {}, feature.label, feature.externalId],
          );
          created++;
        } catch (error: any) {
          errors.push(`Feature ${i}: ${error.message}`);
        }
      }
    });

    // Update feature count and bbox
    await this.updateFeatureCount(dto.idLayer);
    await this.updateBoundingBox(dto.idLayer);

    return {
      created,
      failed: dto.features.length - created,
      errors,
    };
  }

  /**
   * Get features for a layer with optional bbox filter
   */
  async findByLayer(
    layerId: string,
    options?: { bbox?: [number, number, number, number]; limit?: number; offset?: number },
  ): Promise<{ data: FeatureResponseDto[]; total: number }> {
    const { limit = 1000, offset = 0 } = options || {};

    const countQuery = `SELECT COUNT(*) as total FROM map_layer_feature WHERE id_layer = $1`;
    const query = `
      SELECT 
        id_feature,
        id_layer,
        geometry_json,
        properties_json,
        label,
        external_id,
        created_at,
        updated_at
      FROM map_layer_feature
      WHERE id_layer = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Note: BBOX filtering without PostGIS is handled client-side
    // If needed, could implement JS-based bbox filtering here

    const [countResult, features] = await Promise.all([
      this.dataSource.query(countQuery, [layerId]),
      this.dataSource.query(query, [layerId, limit, offset]),
    ]);

    return {
      data: features.map((f: any) => this.toResponseFromRow(f)),
      total: parseInt(countResult[0].total, 10),
    };
  }

  /**
   * Get single feature
   */
  async findOne(featureId: string): Promise<FeatureResponseDto> {
    const feature = await this.featureRepository.findOne({ where: { idFeature: featureId } });

    if (!feature) {
      throw new NotFoundException(`Feature with ID "${featureId}" not found`);
    }

    return this.toResponse(feature);
  }

  /**
   * Update feature
   */
  async update(featureId: string, dto: UpdateFeatureDto): Promise<FeatureResponseDto> {
    const feature = await this.featureRepository.findOne({ where: { idFeature: featureId } });

    if (!feature) {
      throw new NotFoundException(`Feature with ID "${featureId}" not found`);
    }

    // Check if layer is locked
    const layer = await this.layerRepository.findOne({ where: { idLayer: feature.idLayer } });
    if (layer?.isLocked) {
      throw new BadRequestException('Cannot modify features in locked layer');
    }

    if (dto.geometry !== undefined) {
      feature.geometryJson = dto.geometry;
    }
    if (dto.properties !== undefined) {
      feature.propertiesJson = dto.properties;
    }
    if (dto.label !== undefined) {
      feature.label = dto.label;
    }
    if (dto.externalId !== undefined) {
      feature.externalId = dto.externalId;
    }

    const saved = await this.featureRepository.save(feature);

    // Update bbox if geometry changed
    if (dto.geometry) {
      await this.updateBoundingBox(feature.idLayer);
    }

    return this.toResponse(saved);
  }

  /**
   * Delete feature
   */
  async remove(featureId: string): Promise<void> {
    const feature = await this.featureRepository.findOne({ where: { idFeature: featureId } });

    if (!feature) {
      throw new NotFoundException(`Feature with ID "${featureId}" not found`);
    }

    // Check if layer is locked
    const layer = await this.layerRepository.findOne({ where: { idLayer: feature.idLayer } });
    if (layer?.isLocked) {
      throw new BadRequestException('Cannot delete features from locked layer');
    }

    const layerId = feature.idLayer;
    await this.featureRepository.remove(feature);

    // Update feature count
    await this.updateFeatureCount(layerId);
  }

  /**
   * Delete all features in a layer
   */
  async removeByLayer(layerId: string): Promise<{ deleted: number }> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: layerId } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${layerId}" not found`);
    }

    if (layer.isLocked) {
      throw new BadRequestException('Cannot delete features from locked layer');
    }

    const result = await this.dataSource.query(
      `DELETE FROM map_layer_feature WHERE id_layer = $1`,
      [layerId],
    );

    await this.layerRepository.update(layerId, { featureCount: 0, bbox: null });

    return { deleted: result.rowCount || 0 };
  }

  /**
   * Update feature count for a layer
   */
  private async updateFeatureCount(layerId: string): Promise<void> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM map_layer_feature WHERE id_layer = $1`,
      [layerId],
    );
    await this.layerRepository.update(layerId, { featureCount: parseInt(result[0].count, 10) });
  }

  /**
   * Update bounding box for a layer (calculated from JSONB geometry)
   */
  private async updateBoundingBox(layerId: string): Promise<void> {
    // For JSONB geometry, we need to calculate bbox manually
    const features = await this.featureRepository.find({ where: { idLayer: layerId } });

    if (features.length === 0) {
      await this.layerRepository.update(layerId, { bbox: null });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const feature of features) {
      const coords = this.extractCoordinates(feature.geometryJson);
      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (minX !== Infinity) {
      await this.layerRepository.update(layerId, {
        bbox: { minX, minY, maxX, maxY },
      });
    }
  }

  /**
   * Extract all coordinates from GeoJSON geometry
   */
  private extractCoordinates(geometry: any): [number, number][] {
    if (!geometry) return [];

    const coords: [number, number][] = [];
    
    const extract = (item: any) => {
      if (Array.isArray(item)) {
        if (typeof item[0] === 'number' && typeof item[1] === 'number') {
          coords.push([item[0], item[1]]);
        } else {
          item.forEach(extract);
        }
      }
    };

    if (geometry.coordinates) {
      extract(geometry.coordinates);
    }

    return coords;
  }

  private toResponse(feature: MapLayerFeature): FeatureResponseDto {
    return {
      idFeature: feature.idFeature,
      idLayer: feature.idLayer,
      geometry: feature.geometryJson,
      properties: feature.propertiesJson || {},
      label: feature.label,
      externalId: feature.externalId,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    };
  }

  private toResponseFromRow(row: any): FeatureResponseDto {
    return {
      idFeature: row.id_feature,
      idLayer: row.id_layer,
      geometry: row.geometry_json,
      properties: row.properties_json || {},
      label: row.label,
      externalId: row.external_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
