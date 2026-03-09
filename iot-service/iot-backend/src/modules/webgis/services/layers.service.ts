import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { MapLayer, LayerType, SourceType } from '../../../entities/map-layer.entity';
import { MapLayerFeature } from '../../../entities/map-layer-feature.entity';
import { CreateLayerDto, UpdateLayerDto, LayerResponseDto, GeoJSONResponseDto } from '../dto';

export interface LayerQueryOptions {
  page?: number;
  limit?: number;
  projectId?: string;
  ownerId?: string;
  layerType?: LayerType;
  categoryCode?: string;
  search?: string;
}

@Injectable()
export class LayersService {
  constructor(
    @InjectRepository(MapLayer)
    private readonly layerRepository: Repository<MapLayer>,
    @InjectRepository(MapLayerFeature)
    private readonly featureRepository: Repository<MapLayerFeature>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new layer
   */
  async create(dto: CreateLayerDto, userId?: string): Promise<LayerResponseDto> {
    // Check for duplicate layer_code in same project
    if (dto.layerCode && dto.idProject) {
      const existing = await this.layerRepository.findOne({
        where: { idProject: dto.idProject, layerCode: dto.layerCode },
      });
      if (existing) {
        throw new ConflictException(`Layer with code "${dto.layerCode}" already exists in this project`);
      }
    }

    const layer = this.layerRepository.create({
      ...dto,
      createdBy: userId,
      isCore: dto.layerType === LayerType.CORE,
      isLocked: dto.layerType === LayerType.CORE,
    });

    const saved = await this.layerRepository.save(layer);
    return this.toResponse(saved);
  }

  /**
   * Get all layers with filters
   */
  async findAll(options: LayerQueryOptions): Promise<{ data: LayerResponseDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, projectId, ownerId, layerType, categoryCode, search } = options;
    const skip = (page - 1) * limit;

    const qb = this.layerRepository.createQueryBuilder('layer');

    if (projectId) {
      qb.andWhere('layer.id_project = :projectId', { projectId });
    }

    if (ownerId) {
      qb.andWhere('(layer.id_owner = :ownerId OR layer.is_core = true)', { ownerId });
    }

    if (layerType) {
      qb.andWhere('layer.layer_type = :layerType', { layerType });
    }

    if (categoryCode) {
      qb.andWhere('layer.category_code = :categoryCode', { categoryCode });
    }

    if (search) {
      qb.andWhere('(layer.layer_name ILIKE :search OR layer.layer_code ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('layer.display_order', 'ASC')
      .addOrderBy('layer.layer_type', 'ASC')
      .addOrderBy('layer.layer_name', 'ASC');

    const [layers, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: layers.map(l => this.toResponse(l)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get single layer by ID
   */
  async findOne(id: string): Promise<LayerResponseDto> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: id } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${id}" not found`);
    }
    return this.toResponse(layer);
  }

  /**
   * Update layer
   */
  async update(id: string, dto: UpdateLayerDto): Promise<LayerResponseDto> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: id } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${id}" not found`);
    }

    // Prevent modifying core layers
    if (layer.isLocked && dto.layerType && dto.layerType !== layer.layerType) {
      throw new ConflictException('Cannot change type of locked layer');
    }

    // Check for duplicate layer_code
    if (dto.layerCode && dto.layerCode !== layer.layerCode) {
      const existing = await this.layerRepository.findOne({
        where: { idProject: layer.idProject, layerCode: dto.layerCode },
      });
      if (existing) {
        throw new ConflictException(`Layer with code "${dto.layerCode}" already exists in this project`);
      }
    }

    Object.assign(layer, dto);
    const saved = await this.layerRepository.save(layer);
    return this.toResponse(saved);
  }

  /**
   * Delete layer
   */
  async remove(id: string): Promise<void> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: id } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${id}" not found`);
    }

    if (layer.isLocked) {
      throw new ConflictException('Cannot delete locked layer');
    }

    await this.layerRepository.remove(layer);
  }

  /**
   * Get layer features as GeoJSON
   */
  async getGeoJSON(layerId: string, bbox?: [number, number, number, number]): Promise<GeoJSONResponseDto> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: layerId } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${layerId}" not found`);
    }

    // If it's a core layer, generate from source table
    if (layer.layerType === LayerType.CORE && layer.sourceTable) {
      return this.getCoreLayerGeoJSON(layer, bbox);
    }

    // For custom/operational layers, first try to query map_layer_feature
    const query = `
      SELECT 
        id_feature,
        geometry_json as geometry,
        properties_json as properties,
        label,
        external_id
      FROM map_layer_feature
      WHERE id_layer = $1
    `;
    const params: any[] = [layerId];

    const features = await this.dataSource.query(query, params);

    // If features exist in database, return them
    if (features.length > 0) {
      return {
        type: 'FeatureCollection',
        features: features.map((f: any) => ({
          type: 'Feature',
          id: f.id_feature,
          geometry: f.geometry,
          properties: {
            ...f.properties,
            label: f.label,
            externalId: f.external_id,
          },
        })),
        metadata: {
          layerId: layer.idLayer,
          layerName: layer.layerName,
          featureCount: features.length,
          geometryType: layer.geometryType,
          bbox: bbox || (layer.bbox ? [layer.bbox.minX, layer.bbox.minY, layer.bbox.maxX, layer.bbox.maxY] : undefined),
        },
      };
    }

    // If no features in DB, try to read from uploaded GeoJSON file
    const configJson = layer.configJson as any;
    if (configJson?.filePath) {
      try {
        // filePath is relative from project root (e.g., "uploads/documents/project/xxx.geojson")
        const filePath = path.resolve(process.cwd(), configJson.filePath);
        
        console.log('Reading GeoJSON file from:', filePath);
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const geoJson = JSON.parse(fileContent);
          
          // Handle both FeatureCollection and single Feature
          let geoJsonFeatures: any[] = [];
          if (geoJson.type === 'FeatureCollection') {
            geoJsonFeatures = geoJson.features || [];
          } else if (geoJson.type === 'Feature') {
            geoJsonFeatures = [geoJson];
          } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(geoJson.type)) {
            geoJsonFeatures = [{ type: 'Feature', geometry: geoJson, properties: {} }];
          }

          return {
            type: 'FeatureCollection',
            features: geoJsonFeatures,
            metadata: {
              layerId: layer.idLayer,
              layerName: layer.layerName,
              featureCount: geoJsonFeatures.length,
              geometryType: layer.geometryType,
              bbox: configJson.bounds || (layer.bbox ? [layer.bbox.minX, layer.bbox.minY, layer.bbox.maxX, layer.bbox.maxY] : undefined),
            },
          };
        }
      } catch (err) {
        console.error('Error reading GeoJSON file:', err);
      }
    }

    // Empty result if nothing found
    return {
      type: 'FeatureCollection',
      features: [],
      metadata: {
        layerId: layer.idLayer,
        layerName: layer.layerName,
        featureCount: 0,
        geometryType: layer.geometryType,
        bbox: bbox || (layer.bbox ? [layer.bbox.minX, layer.bbox.minY, layer.bbox.maxX, layer.bbox.maxY] : undefined),
      },
    };
  }

  /**
   * Get core layer GeoJSON (from nodes/sensors tables)
   */
  private async getCoreLayerGeoJSON(layer: MapLayer, bbox?: [number, number, number, number]): Promise<GeoJSONResponseDto> {
    let query: string;
    const params: any[] = [];

    if (layer.sourceTable === 'nodes') {
      query = `
        SELECT 
          id_node as id,
          code,
          name,
          address as label,
          connectivity_status,
          last_seen_at,
          latitude,
          longitude
        FROM nodes
        WHERE id_project = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      `;
      params.push(layer.idProject);
    } else if (layer.sourceTable === 'sensors') {
      query = `
        SELECT 
          s.id_sensor as id,
          s.sensor_code as code,
          s.label,
          n.latitude,
          n.longitude,
          n.name as node_name,
          n.connectivity_status
        FROM sensors s
        JOIN nodes n ON s.id_node = n.id_node
        WHERE n.id_project = $1 AND n.latitude IS NOT NULL AND n.longitude IS NOT NULL
      `;
      params.push(layer.idProject);
    } else if (layer.sourceTable === 'alert_events') {
      query = `
        SELECT 
          ae.id_alert_event as id,
          ar.severity,
          ar.rule_type,
          ae.status,
          ae.value,
          ae.triggered_at,
          ae.cleared_at,
          s.label as sensor_label,
          n.latitude,
          n.longitude,
          n.name as node_name
        FROM alert_events ae
        JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
        JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
        JOIN sensors s ON sc.id_sensor = s.id_sensor
        JOIN nodes n ON s.id_node = n.id_node
        WHERE n.id_project = $1 
          AND n.latitude IS NOT NULL 
          AND n.longitude IS NOT NULL
          AND ae.cleared_at IS NULL
      `;
      params.push(layer.idProject);
    } else {
      return { type: 'FeatureCollection', features: [] };
    }

    if (bbox && bbox.length === 4) {
      const bboxCondition = ` AND longitude >= $${params.length + 1} AND latitude >= $${params.length + 2} AND longitude <= $${params.length + 3} AND latitude <= $${params.length + 4}`;
      query += bboxCondition;
      params.push(...bbox);
    }

    const rows = await this.dataSource.query(query, params);

    // Map properties based on source table
    const mapProperties = (r: any) => {
      if (layer.sourceTable === 'nodes') {
        return {
          code: r.code,
          name: r.name,
          label: r.label,
          connectivityStatus: r.connectivity_status,
          lastSeenAt: r.last_seen_at,
        };
      } else if (layer.sourceTable === 'sensors') {
        return {
          code: r.code,
          label: r.label,
          nodeName: r.node_name,
          connectivityStatus: r.connectivity_status,
        };
      } else if (layer.sourceTable === 'alert_events') {
        return {
          severity: r.severity,
          ruleType: r.rule_type,
          status: r.status,
          value: r.value,
          sensorLabel: r.sensor_label,
          nodeName: r.node_name,
          triggeredAt: r.triggered_at,
        };
      }
      return r;
    };

    return {
      type: 'FeatureCollection',
      features: rows.map((r: any) => ({
        type: 'Feature',
        id: r.id,
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
        },
        properties: mapProperties(r),
      })),
      metadata: {
        layerId: layer.idLayer,
        layerName: layer.layerName,
        featureCount: rows.length,
        geometryType: 'Point',
      },
    };
  }

  /**
   * Reorder layers
   */
  async reorder(projectId: string, layerOrders: { idLayer: string; displayOrder: number }[]): Promise<void> {
    await this.dataSource.transaction(async manager => {
      for (const { idLayer, displayOrder } of layerOrders) {
        await manager.update(MapLayer, { idLayer, idProject: projectId }, { displayOrder });
      }
    });
  }

  /**
   * Update layer style
   */
  async updateStyle(id: string, styleJson: Record<string, any>): Promise<LayerResponseDto> {
    const layer = await this.layerRepository.findOne({ where: { idLayer: id } });
    if (!layer) {
      throw new NotFoundException(`Layer with ID "${id}" not found`);
    }

    layer.styleJson = { ...layer.styleJson, ...styleJson };
    const saved = await this.layerRepository.save(layer);
    return this.toResponse(saved);
  }

  /**
   * Seed core layers for a project (auto-creates nodes & sensors layers)
   */
  async seedCoreLayers(projectId: string, ownerId?: string): Promise<LayerResponseDto[]> {
    const coreLayers = [
      {
        layerCode: 'nodes',
        layerName: 'Nodes',
        layerDescription: 'IoT Nodes / Device location',
        layerType: LayerType.CORE,
        sourceType: SourceType.SYSTEM,
        sourceTable: 'nodes',
        geometryType: 'Point',
        categoryCode: 'node',
        displayOrder: 1,
        isVisibleDefault: true,
        styleJson: {
          icon: 'router',
          color: '#4CAF50',
          radius: 8,
          thematic: {
            field: 'connectivity_status',
            mapping: {
              online: '#4CAF50',
              offline: '#F44336',
              degraded: '#FF9800',
            },
          },
        },
      },
      {
        layerCode: 'sensors',
        layerName: 'Sensors',
        layerDescription: 'Sensor locations (inherit from nodes)',
        layerType: LayerType.CORE,
        sourceType: SourceType.SYSTEM,
        sourceTable: 'sensors',
        geometryType: 'Point',
        categoryCode: 'sensor',
        displayOrder: 2,
        isVisibleDefault: false,
        styleJson: {
          icon: 'sensors',
          color: '#2196F3',
          radius: 6,
        },
      },
      {
        layerCode: 'alerts',
        layerName: 'Alerts',
        layerDescription: 'Active alert locations',
        layerType: LayerType.CORE,
        sourceType: SourceType.SYSTEM,
        sourceTable: 'alert_events',
        geometryType: 'Point',
        categoryCode: 'alert',
        displayOrder: 3,
        isVisibleDefault: true,
        styleJson: {
          icon: 'warning',
          color: '#F44336',
          radius: 10,
          thematic: {
            field: 'severity',
            mapping: {
              critical: '#D32F2F',
              warning: '#FF9800',
              info: '#2196F3',
            },
          },
        },
      },
    ];

    const createdLayers: LayerResponseDto[] = [];

    for (const coreLayer of coreLayers) {
      // Check if already exists
      const existing = await this.layerRepository.findOne({
        where: { idProject: projectId, layerCode: coreLayer.layerCode },
      });

      if (!existing) {
        const layer = this.layerRepository.create({
          ...coreLayer,
          idProject: projectId,
          idOwner: ownerId,
          isCore: true,
          isLocked: true,
        });
        const saved = await this.layerRepository.save(layer);
        createdLayers.push(this.toResponse(saved));
      } else {
        createdLayers.push(this.toResponse(existing));
      }
    }

    return createdLayers;
  }

  private toResponse(layer: MapLayer): LayerResponseDto {
    return {
      idLayer: layer.idLayer,
      idOwner: layer.idOwner,
      idProject: layer.idProject,
      layerName: layer.layerName,
      layerCode: layer.layerCode,
      layerDescription: layer.layerDescription,
      layerType: layer.layerType,
      sourceType: layer.sourceType,
      categoryCode: layer.categoryCode,
      geometryType: layer.geometryType,
      srid: layer.srid,
      bbox: layer.bbox,
      featureCount: layer.featureCount,
      sourceTable: layer.sourceTable,
      sourceRef: layer.sourceRef,
      styleJson: layer.styleJson,
      configJson: layer.configJson,
      isVisibleDefault: layer.isVisibleDefault,
      isCore: layer.isCore,
      isLocked: layer.isLocked,
      displayOrder: layer.displayOrder,
      createdAt: layer.createdAt,
      updatedAt: layer.updatedAt,
    };
  }
}
