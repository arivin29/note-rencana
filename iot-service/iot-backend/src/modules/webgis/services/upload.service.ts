import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SpatialUploadFile, UploadStatus, ParsedResult, FieldMapping } from '../../../entities/spatial-upload-file.entity';
import { MapLayer, LayerType, SourceType } from '../../../entities/map-layer.entity';
import { MapLayerCategory } from '../../../entities/map-layer-category.entity';
import { UploadStatusResponseDto, ParsedResultResponseDto, SubmitMappingDto } from '../dto';
import * as fs from 'fs';
import * as path from 'path';

// Note: For production, you'd want to use proper GeoJSON parsing libraries
// like @turf/turf or geojson-validation

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(SpatialUploadFile)
    private readonly uploadRepository: Repository<SpatialUploadFile>,
    @InjectRepository(MapLayer)
    private readonly layerRepository: Repository<MapLayer>,
    @InjectRepository(MapLayerCategory)
    private readonly categoryRepository: Repository<MapLayerCategory>,
    private readonly dataSource: DataSource,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || '/tmp/webgis-uploads';
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Handle file upload and create record
   */
  async createUpload(
    file: Express.Multer.File,
    ownerId: string,
    projectId?: string,
    userId?: string,
  ): Promise<UploadStatusResponseDto> {
    const storedFilename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, storedFilename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Determine file type
    const fileType = this.detectFileType(file.originalname, file.mimetype);

    const upload = this.uploadRepository.create({
      idOwner: ownerId,
      idProject: projectId,
      originalFilename: file.originalname,
      storedFilename,
      filePath,
      fileType,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: UploadStatus.UPLOADED,
      uploadedBy: userId,
    });

    const saved = await this.uploadRepository.save(upload);

    // Start parsing asynchronously
    this.parseFileAsync(saved.idUpload).catch(err => {
      console.error(`Failed to parse upload ${saved.idUpload}:`, err);
    });

    return this.toStatusResponse(saved);
  }

  /**
   * Get upload status
   */
  async getStatus(uploadId: string): Promise<UploadStatusResponseDto> {
    const upload = await this.uploadRepository.findOne({ where: { idUpload: uploadId } });
    if (!upload) {
      throw new NotFoundException(`Upload with ID "${uploadId}" not found`);
    }
    return this.toStatusResponse(upload);
  }

  /**
   * Get parsed result with field suggestions
   */
  async getParsedResult(uploadId: string, categoryCode?: string): Promise<ParsedResultResponseDto> {
    const upload = await this.uploadRepository.findOne({ where: { idUpload: uploadId } });
    if (!upload) {
      throw new NotFoundException(`Upload with ID "${uploadId}" not found`);
    }

    if (upload.status === UploadStatus.UPLOADED || upload.status === UploadStatus.PARSING) {
      throw new BadRequestException('File is still being parsed');
    }

    if (upload.status === UploadStatus.FAILED) {
      throw new BadRequestException(`Parsing failed: ${upload.errorMessage}`);
    }

    const result = upload.parsedResult;
    let suggestedMappings: { sourceField: string; targetField: string; confidence: number }[] = [];

    // Get suggested mappings based on category
    if (categoryCode) {
      suggestedMappings = await this.getSuggestedMappings(result.fields, categoryCode, upload.idOwner);
    }

    return {
      idUpload: upload.idUpload,
      status: upload.status,
      geometryType: result.geometryType,
      featureCount: result.featureCount,
      detectedCrs: result.detectedCrs,
      fields: result.fields,
      bbox: result.bbox,
      warnings: result.warnings,
      suggestedMappings,
    };
  }

  /**
   * Submit field mapping and create layer
   */
  async submitMapping(uploadId: string, dto: SubmitMappingDto): Promise<{ idLayer: string; featureCount: number }> {
    const upload = await this.uploadRepository.findOne({ where: { idUpload: uploadId } });
    if (!upload) {
      throw new NotFoundException(`Upload with ID "${uploadId}" not found`);
    }

    if (upload.status !== UploadStatus.PARSED && upload.status !== UploadStatus.MAPPING) {
      throw new BadRequestException(`Upload is not ready for mapping. Current status: ${upload.status}`);
    }

    // Update status
    upload.status = UploadStatus.TRANSFORMING;
    upload.fieldMapping = dto.fieldMappings;
    await this.uploadRepository.save(upload);

    try {
      // Create the layer
      const layer = await this.layerRepository.save(
        this.layerRepository.create({
          idOwner: upload.idOwner,
          idProject: upload.idProject,
          layerName: dto.layerName,
          layerCode: dto.layerCode,
          layerType: dto.categoryCode ? LayerType.OPERATIONAL : LayerType.CUSTOM,
          sourceType: this.getSourceType(upload.fileType),
          categoryCode: dto.categoryCode,
          geometryType: upload.parsedResult.geometryType,
          srid: 4326,
          styleJson: dto.styleJson || {},
          isVisibleDefault: true,
          createdBy: upload.uploadedBy,
        }),
      );

      // Transform and insert features
      const featureCount = await this.transformAndInsertFeatures(
        upload,
        layer.idLayer,
        dto.fieldMappings,
        dto.labelField,
      );

      // Update layer with feature count and bbox
      await this.updateLayerStats(layer.idLayer);

      // Update upload status
      upload.status = UploadStatus.COMPLETED;
      upload.idLayer = layer.idLayer;
      upload.processedAt = new Date();
      await this.uploadRepository.save(upload);

      return {
        idLayer: layer.idLayer,
        featureCount,
      };
    } catch (error: any) {
      upload.status = UploadStatus.FAILED;
      upload.errorMessage = error.message;
      upload.errorDetail = { stack: error.stack };
      await this.uploadRepository.save(upload);
      throw error;
    }
  }

  /**
   * Delete upload and associated file
   */
  async remove(uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findOne({ where: { idUpload: uploadId } });
    if (!upload) {
      throw new NotFoundException(`Upload with ID "${uploadId}" not found`);
    }

    // Delete file if exists
    if (fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    await this.uploadRepository.remove(upload);
  }

  /**
   * Parse file asynchronously
   */
  private async parseFileAsync(uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findOne({ where: { idUpload: uploadId } });
    if (!upload) return;

    upload.status = UploadStatus.PARSING;
    await this.uploadRepository.save(upload);

    try {
      const result = await this.parseFile(upload);
      upload.parsedResult = result;
      upload.status = UploadStatus.PARSED;
      await this.uploadRepository.save(upload);
    } catch (error: any) {
      upload.status = UploadStatus.FAILED;
      upload.errorMessage = error.message;
      upload.errorDetail = { stack: error.stack };
      await this.uploadRepository.save(upload);
    }
  }

  /**
   * Parse uploaded file and extract metadata
   */
  private async parseFile(upload: SpatialUploadFile): Promise<ParsedResult> {
    const content = fs.readFileSync(upload.filePath, 'utf-8');

    switch (upload.fileType) {
      case 'geojson':
        return this.parseGeoJSON(content);
      case 'csv':
        return this.parseCSV(content);
      // Add more parsers as needed (shp, kml, etc.)
      default:
        throw new Error(`Unsupported file type: ${upload.fileType}`);
    }
  }

  /**
   * Parse GeoJSON file
   */
  private parseGeoJSON(content: string): ParsedResult {
    const geojson = JSON.parse(content);

    if (geojson.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON: expected FeatureCollection');
    }

    const features = geojson.features || [];
    const featureCount = features.length;

    if (featureCount === 0) {
      throw new Error('GeoJSON contains no features');
    }

    // Detect geometry type
    const geometryTypes = new Set<string>();
    features.forEach((f: any) => {
      if (f.geometry?.type) {
        geometryTypes.add(f.geometry.type);
      }
    });
    const geometryType = geometryTypes.size === 1 ? [...geometryTypes][0] : 'Mixed';

    // Detect fields from properties
    const fieldStats: Record<string, { type: string; samples: any[]; nullCount: number }> = {};

    features.forEach((f: any) => {
      const props = f.properties || {};
      Object.keys(props).forEach(key => {
        if (!fieldStats[key]) {
          fieldStats[key] = { type: 'string', samples: [], nullCount: 0 };
        }

        const value = props[key];
        if (value === null || value === undefined) {
          fieldStats[key].nullCount++;
        } else {
          if (fieldStats[key].samples.length < 3) {
            fieldStats[key].samples.push(value);
          }
          // Detect type
          if (typeof value === 'number') {
            fieldStats[key].type = 'number';
          } else if (typeof value === 'boolean') {
            fieldStats[key].type = 'boolean';
          } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            fieldStats[key].type = 'date';
          }
        }
      });
    });

    const fields = Object.entries(fieldStats).map(([name, stats]) => ({
      name,
      type: stats.type,
      sample: stats.samples[0],
      nullCount: stats.nullCount,
    }));

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    features.forEach((f: any) => {
      this.expandBbox(f.geometry, (x: number, y: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });

    return {
      geometryType,
      featureCount,
      detectedCrs: geojson.crs?.properties?.name || 'EPSG:4326',
      fields,
      bbox: [minX, minY, maxX, maxY],
      warnings: geometryTypes.size > 1 ? ['GeoJSON contains mixed geometry types'] : undefined,
    };
  }

  /**
   * Parse CSV file (expects lat/lon columns)
   */
  private parseCSV(content: string): ParsedResult {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    // Find lat/lon columns
    const latCol = headers.findIndex(h => /^(lat|latitude|y)$/i.test(h));
    const lonCol = headers.findIndex(h => /^(lon|lng|longitude|x)$/i.test(h));

    if (latCol === -1 || lonCol === -1) {
      throw new Error('CSV must contain latitude and longitude columns');
    }

    // Detect field types
    const fieldStats: Record<string, { type: string; samples: any[]; nullCount: number }> = {};

    dataRows.forEach(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      headers.forEach((header, i) => {
        if (i === latCol || i === lonCol) return; // Skip geometry columns

        if (!fieldStats[header]) {
          fieldStats[header] = { type: 'string', samples: [], nullCount: 0 };
        }

        const value = values[i];
        if (!value) {
          fieldStats[header].nullCount++;
        } else {
          if (fieldStats[header].samples.length < 3) {
            fieldStats[header].samples.push(value);
          }
          // Type detection
          if (!isNaN(parseFloat(value))) {
            fieldStats[header].type = 'number';
          }
        }
      });
    });

    const fields = Object.entries(fieldStats).map(([name, stats]) => ({
      name,
      type: stats.type,
      sample: stats.samples[0],
      nullCount: stats.nullCount,
    }));

    // Calculate bbox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    dataRows.forEach(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const lat = parseFloat(values[latCol]);
      const lon = parseFloat(values[lonCol]);
      if (!isNaN(lat) && !isNaN(lon)) {
        minX = Math.min(minX, lon);
        minY = Math.min(minY, lat);
        maxX = Math.max(maxX, lon);
        maxY = Math.max(maxY, lat);
      }
    });

    return {
      geometryType: 'Point',
      featureCount: dataRows.length,
      detectedCrs: 'EPSG:4326',
      fields,
      bbox: [minX, minY, maxX, maxY],
    };
  }

  /**
   * Get suggested field mappings based on category template
   */
  private async getSuggestedMappings(
    fields: { name: string; type: string }[],
    categoryCode: string,
    ownerId: string,
  ): Promise<{ sourceField: string; targetField: string; confidence: number }[]> {
    // Get category template
    const category = await this.categoryRepository.findOne({
      where: [
        { categoryCode, idOwner: ownerId },
        { categoryCode, isSystem: true },
      ],
    });

    if (!category || !category.templateFields?.length) {
      return [];
    }

    const suggestions: { sourceField: string; targetField: string; confidence: number }[] = [];

    category.templateFields.forEach(template => {
      const aliases = [template.name.toLowerCase(), ...(template.aliases || []).map(a => a.toLowerCase())];

      fields.forEach(field => {
        const fieldNameLower = field.name.toLowerCase();
        for (const alias of aliases) {
          if (fieldNameLower === alias || fieldNameLower.includes(alias) || alias.includes(fieldNameLower)) {
            const confidence = fieldNameLower === alias ? 1.0 : 0.7;
            suggestions.push({
              sourceField: field.name,
              targetField: template.name,
              confidence,
            });
            break;
          }
        }
      });
    });

    // Sort by confidence and remove duplicates
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter((s, i, arr) => arr.findIndex(x => x.sourceField === s.sourceField) === i);
  }

  /**
   * Transform and insert features from parsed file
   */
  private async transformAndInsertFeatures(
    upload: SpatialUploadFile,
    layerId: string,
    fieldMappings: FieldMapping[],
    labelField?: string,
  ): Promise<number> {
    const content = fs.readFileSync(upload.filePath, 'utf-8');
    let inserted = 0;

    if (upload.fileType === 'geojson') {
      const geojson = JSON.parse(content);
      const features = geojson.features || [];

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < features.length; i += batchSize) {
        const batch = features.slice(i, i + batchSize);
        await this.insertFeatureBatch(layerId, batch, fieldMappings, labelField);
        inserted += batch.length;
      }
    } else if (upload.fileType === 'csv') {
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const latCol = headers.findIndex(h => /^(lat|latitude|y)$/i.test(h));
      const lonCol = headers.findIndex(h => /^(lon|lng|longitude|x)$/i.test(h));

      const batchSize = 100;
      const dataRows = lines.slice(1);

      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, i + batchSize);
        const features = batch.map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const lat = parseFloat(values[latCol]);
          const lon = parseFloat(values[lonCol]);

          const properties: Record<string, any> = {};
          headers.forEach((h, idx) => {
            if (idx !== latCol && idx !== lonCol) {
              properties[h] = values[idx];
            }
          });

          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties,
          };
        });

        await this.insertFeatureBatch(layerId, features, fieldMappings, labelField);
        inserted += features.length;
      }
    }

    return inserted;
  }

  /**
   * Insert a batch of features
   */
  private async insertFeatureBatch(
    layerId: string,
    features: any[],
    fieldMappings: FieldMapping[],
    labelField?: string,
  ): Promise<void> {
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    features.forEach(feature => {
      const props = feature.properties || {};

      // Apply field mappings
      const mappedProps: Record<string, any> = {};
      fieldMappings.forEach(mapping => {
        let value = props[mapping.sourceField];

        // Apply transform if specified
        if (mapping.transform && value !== undefined) {
          switch (mapping.transform) {
            case 'trim':
              value = String(value).trim();
              break;
            case 'uppercase':
              value = String(value).toUpperCase();
              break;
            case 'lowercase':
              value = String(value).toLowerCase();
              break;
            case 'number':
              value = parseFloat(value);
              break;
          }
        }

        mappedProps[mapping.targetField] = value;
      });

      // Also include unmapped fields
      Object.keys(props).forEach(key => {
        if (!fieldMappings.find(m => m.sourceField === key)) {
          mappedProps[key] = props[key];
        }
      });

      const label = labelField ? props[labelField] : null;

      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(layerId, JSON.stringify(feature.geometry), mappedProps, label);
    });

    if (values.length > 0) {
      await this.dataSource.query(
        `INSERT INTO map_layer_feature (id_layer, geometry_json, properties_json, label) VALUES ${values.join(', ')}`,
        params,
      );
    }
  }

  /**
   * Update layer statistics after import (without PostGIS)
   */
  private async updateLayerStats(layerId: string): Promise<void> {
    // Get count
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM map_layer_feature WHERE id_layer = $1`,
      [layerId],
    );

    // Get all geometries to calculate bbox
    const features = await this.dataSource.query(
      `SELECT geometry_json FROM map_layer_feature WHERE id_layer = $1`,
      [layerId],
    );

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const f of features) {
      if (f.geometry_json) {
        this.expandBbox(f.geometry_json, (x: number, y: number) => {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });
      }
    }

    await this.layerRepository.update(layerId, {
      featureCount: parseInt(countResult[0].count, 10),
      bbox: minX !== Infinity ? { minX, minY, maxX, maxY } : null,
    });
  }

  private detectFileType(filename: string, mimeType: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'geojson' || ext === 'json') return 'geojson';
    if (ext === 'csv') return 'csv';
    if (ext === 'kml') return 'kml';
    if (ext === 'zip') return 'shp'; // Assume shapefile
    if (ext === 'gpkg') return 'gpkg';
    if (mimeType.includes('json')) return 'geojson';
    if (mimeType.includes('csv')) return 'csv';
    return 'unknown';
  }

  private getSourceType(fileType: string): SourceType {
    switch (fileType) {
      case 'geojson':
        return SourceType.GEOJSON;
      case 'shp':
        return SourceType.SHP;
      case 'kml':
        return SourceType.KML;
      case 'csv':
        return SourceType.CSV;
      default:
        return SourceType.GEOJSON;
    }
  }

  private expandBbox(geometry: any, callback: (x: number, y: number) => void): void {
    if (!geometry) return;

    if (geometry.type === 'Point') {
      callback(geometry.coordinates[0], geometry.coordinates[1]);
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      geometry.coordinates.forEach((coord: number[]) => callback(coord[0], coord[1]));
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      geometry.coordinates.forEach((ring: number[][]) => {
        ring.forEach((coord: number[]) => callback(coord[0], coord[1]));
      });
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          ring.forEach((coord: number[]) => callback(coord[0], coord[1]));
        });
      });
    }
  }

  private toStatusResponse(upload: SpatialUploadFile): UploadStatusResponseDto {
    return {
      idUpload: upload.idUpload,
      status: upload.status,
      originalFilename: upload.originalFilename,
      fileType: upload.fileType,
      parsedResult: upload.parsedResult,
      fieldMapping: upload.fieldMapping,
      errorMessage: upload.errorMessage,
      idLayer: upload.idLayer,
      createdAt: upload.createdAt,
      processedAt: upload.processedAt,
    };
  }
}
