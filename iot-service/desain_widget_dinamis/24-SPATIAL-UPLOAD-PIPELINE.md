# Spatial Upload Pipeline - Technical Specification

## Document Info
| Key | Value |
|-----|-------|
| Version | 1.0 |
| Created | 2026-03-07 |
| Related | 21-WEBGIS-LAYER-SYSTEM.md |

---

## 1. Upload Wizard UI Flow

### 1.1 Step Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                      UPLOAD WIZARD                              │
├─────────────────────────────────────────────────────────────────┤
│  [1. Upload] → [2. Preview] → [3. Mapping] → [4. Style] → Done  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Step 1: File Upload
```
┌─────────────────────────────────────────────────────────────────┐
│  Upload Spatial File                                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │     📁  Drag & drop file here                          │    │
│  │         or click to browse                              │    │
│  │                                                         │    │
│  │     Supported: GeoJSON, Shapefile (ZIP), KML, CSV       │    │
│  │     Max size: 50 MB                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                │
│  Recent Uploads:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 pipa_distribusi.zip    10 MB   ✓ Completed   [View]  │   │
│  │ 📄 dma_boundary.geojson   2 MB    ⏳ Processing         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│                                          [Cancel] [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Step 2: Preview Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  Preview: pipa_distribusi.geojson                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │     Mini Map         │  │  File Information               │  │
│  │  ┌────────────────┐  │  │  ────────────────────────────   │  │
│  │  │    [preview]   │  │  │  Geometry: LineString           │  │
│  │  │    of data     │  │  │  Features: 1,247                │  │
│  │  │    on map      │  │  │  CRS: EPSG:4326 (WGS84)        │  │
│  │  └────────────────┘  │  │  Bounds: 106.7° - 107.0° E      │  │
│  └──────────────────────┘  │          -6.3° - -6.1° N        │  │
│                            └────────────────────────────────┘  │
│                                                                │
│  Field Analysis:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Field          │ Type    │ Sample         │ Nulls       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ nama_pipa      │ string  │ "Pipa Utama 1" │ 0%          │   │
│  │ diameter       │ number  │ 200            │ 5%          │   │
│  │ material       │ string  │ "PVC"          │ 12%         │   │
│  │ tahun_pasang   │ number  │ 2018           │ 30%         │   │
│  │ status         │ string  │ "aktif"        │ 0%          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ⚠️ Warning: 15 features have invalid geometry (will be fixed) │
│                                                                │
│                                    [← Back] [Cancel] [Next →]  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Step 3: Field Mapping

> **Note:** Layer categories are **dynamic** - fetched from `GET /api/spatial/categories`.
> Categories can be filtered by industry code. User can also create custom categories via admin panel.

```
┌─────────────────────────────────────────────────────────────────┐
│  Map Fields to Standard                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  Industry Filter: [▼ Water Utility                        ]    │
│  Layer Category:  [▼ Jaringan Pipa (pipe_network)         ]    │
│                   [+ Create New Category]                      │
│                                                                │
│  Layer Name:     [Pipa Distribusi Zona 1                  ]    │
│  Layer Code:     [pipa_dist_z1                            ]    │
│                                                                │
│  Field Mapping (auto-detected, adjust if needed):              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Standard Field   │ Source Field        │ Preview        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Label *          │ [▼ nama_pipa    ]   │ "Pipa Utama 1" │   │
│  │ External ID      │ [▼ kode_pipa    ]   │ "P001"         │   │
│  │ Diameter         │ [▼ diameter ✓   ]   │ 200            │   │
│  │ Material         │ [▼ material ✓   ]   │ "PVC"          │   │
│  │ Status           │ [▼ status ✓     ]   │ "aktif"        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  💡 Tip: Fields marked ✓ were auto-detected from aliases       │
│                                                                │
│  CRS/Projection:                                               │
│  [✓] Auto-detected: EPSG:4326 (WGS84)                         │
│  [ ] Override: [▼ Select CRS                             ]     │
│                                                                │
│                                    [← Back] [Cancel] [Next →]  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Step 4: Initial Style
```
┌─────────────────────────────────────────────────────────────────┐
│  Set Layer Style                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │     Preview Map      │  │  Style Settings                 │  │
│  │  ┌────────────────┐  │  │                                 │  │
│  │  │    [styled]    │  │  │  Line Color: [🎨 #2196F3    ]  │  │
│  │  │    preview     │  │  │  Line Width: [━━○━━ 3px     ]  │  │
│  │  │    here        │  │  │  Line Style: [▼ Solid       ]  │  │
│  │  └────────────────┘  │  │                                 │  │
│  └──────────────────────┘  │  Show Labels: [✓]               │  │
│                            │  Label Field: [▼ nama_pipa  ]  │  │
│                            │                                 │  │
│                            │  ─────────────────────────────  │  │
│                            │  Thematic Coloring:             │  │
│                            │  [ ] Enable by field            │  │
│                            │  Field: [▼ status           ]   │  │
│                            │  Colors:                        │  │
│                            │    aktif:  [🎨 #4CAF50 ]        │  │
│                            │    rusak:  [🎨 #F44336 ]        │  │
│                            │    baru:   [🎨 #2196F3 ]        │  │
│                            └────────────────────────────────┘  │
│                                                                │
│  Visibility:                                                   │
│  Zoom Min: [━━━━○━━━━━ 12]  Zoom Max: [━━━━━━━━━○ 20]         │
│                                                                │
│                              [← Back] [Cancel] [✓ Publish]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Implementation

### 2.1 Module Structure
```
src/
└── modules/
    └── spatial/
        ├── spatial.module.ts
        ├── spatial.controller.ts
        ├── services/
        │   ├── upload.service.ts
        │   ├── parser.service.ts
        │   ├── transform.service.ts
        │   ├── layer.service.ts
        │   └── feature.service.ts
        ├── entities/
        │   ├── map-layer.entity.ts
        │   ├── map-layer-feature.entity.ts
        │   ├── spatial-upload-file.entity.ts
        │   └── map-layer-category.entity.ts
        ├── dto/
        │   ├── upload.dto.ts
        │   ├── mapping.dto.ts
        │   └── layer.dto.ts
        └── parsers/
            ├── geojson.parser.ts
            ├── shapefile.parser.ts
            ├── kml.parser.ts
            └── csv.parser.ts
```

### 2.2 Upload Service
```typescript
// upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpatialUploadFile } from '../entities/spatial-upload-file.entity';
import { ParserService } from './parser.service';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class UploadService {
  private readonly uploadDir = process.env.SPATIAL_UPLOAD_DIR || './uploads/spatial';
  
  constructor(
    @InjectRepository(SpatialUploadFile)
    private uploadRepo: Repository<SpatialUploadFile>,
    private parserService: ParserService,
  ) {}

  async handleUpload(
    file: Express.Multer.File,
    ownerId: string,
    projectId: string,
  ): Promise<SpatialUploadFile> {
    // Validate file type
    const allowedTypes = ['.geojson', '.json', '.zip', '.kml', '.kmz', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      throw new BadRequestException(`File type ${ext} not supported`);
    }
    
    // Determine file type
    const fileType = this.detectFileType(ext, file.mimetype);
    
    // Generate stored filename
    const timestamp = Date.now();
    const storedFilename = `${timestamp}_${file.originalname}`;
    const filePath = path.join(this.uploadDir, ownerId, storedFilename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save file
    await fs.writeFile(filePath, file.buffer);
    
    // Create upload record
    const upload = this.uploadRepo.create({
      idOwner: ownerId,
      idProject: projectId,
      originalFilename: file.originalname,
      storedFilename,
      filePath,
      fileType,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'uploaded',
    });
    
    return this.uploadRepo.save(upload);
  }

  async parseUpload(uploadId: string): Promise<SpatialUploadFile> {
    const upload = await this.uploadRepo.findOneOrFail({
      where: { idUpload: uploadId }
    });
    
    // Update status
    upload.status = 'parsing';
    await this.uploadRepo.save(upload);
    
    try {
      // Parse based on file type
      const result = await this.parserService.parse(
        upload.filePath,
        upload.fileType
      );
      
      upload.status = 'parsed';
      upload.parsedResult = result;
      
    } catch (error) {
      upload.status = 'failed';
      upload.errorMessage = error.message;
      upload.errorDetail = { stack: error.stack };
    }
    
    return this.uploadRepo.save(upload);
  }

  private detectFileType(ext: string, mime: string): string {
    const mapping = {
      '.geojson': 'geojson',
      '.json': 'geojson',
      '.zip': 'shp',
      '.kml': 'kml',
      '.kmz': 'kml',
      '.csv': 'csv',
    };
    return mapping[ext] || 'unknown';
  }
}
```

### 2.3 Parser Service
```typescript
// parser.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ParseResult {
  geometryType: string;
  featureCount: number;
  detectedCrs: string;
  fields: FieldInfo[];
  sampleData: any[];
  bbox: [number, number, number, number];
  warnings: string[];
}

export interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  sample: any;
  nullCount: number;
  uniqueValues?: any[];
}

@Injectable()
export class ParserService {
  
  async parse(filePath: string, fileType: string): Promise<ParseResult> {
    switch (fileType) {
      case 'geojson':
        return this.parseGeoJSON(filePath);
      case 'shp':
        return this.parseShapefile(filePath);
      case 'kml':
        return this.parseKML(filePath);
      case 'csv':
        return this.parseCSV(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async parseGeoJSON(filePath: string): Promise<ParseResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const geojson = JSON.parse(content);
    
    // Validate GeoJSON structure
    if (!geojson.type || !['FeatureCollection', 'Feature'].includes(geojson.type)) {
      throw new Error('Invalid GeoJSON: missing or invalid type');
    }
    
    const features = geojson.type === 'FeatureCollection' 
      ? geojson.features 
      : [geojson];
    
    // Analyze geometry types
    const geometryTypes = new Set<string>();
    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    const warnings: string[] = [];
    
    features.forEach((f: any, idx: number) => {
      if (f.geometry) {
        geometryTypes.add(f.geometry.type);
        this.updateBBox(bbox, f.geometry);
      } else {
        warnings.push(`Feature ${idx} has no geometry`);
      }
    });
    
    // Analyze fields
    const fields = this.analyzeFields(features);
    
    // Get sample data
    const sampleData = features.slice(0, 5).map((f: any) => f.properties);
    
    // Detect CRS (GeoJSON is always WGS84 by spec)
    const detectedCrs = geojson.crs?.properties?.name || 'EPSG:4326';
    
    return {
      geometryType: geometryTypes.size === 1 
        ? [...geometryTypes][0] 
        : 'GeometryCollection',
      featureCount: features.length,
      detectedCrs,
      fields,
      sampleData,
      bbox: bbox as [number, number, number, number],
      warnings,
    };
  }

  private async parseShapefile(zipPath: string): Promise<ParseResult> {
    // Extract zip to temp directory
    const extractDir = zipPath.replace('.zip', '_extracted');
    await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`);
    
    // Find .shp file
    const files = await fs.readdir(extractDir);
    const shpFile = files.find(f => f.endsWith('.shp'));
    
    if (!shpFile) {
      throw new Error('No .shp file found in ZIP archive');
    }
    
    const shpPath = `${extractDir}/${shpFile}`;
    
    // Use ogr2ogr to convert to GeoJSON for analysis
    const tempGeoJSON = `${extractDir}/temp.geojson`;
    await execAsync(`ogr2ogr -f GeoJSON "${tempGeoJSON}" "${shpPath}"`);
    
    // Parse the converted GeoJSON
    const result = await this.parseGeoJSON(tempGeoJSON);
    
    // Read PRJ file for CRS
    const prjFile = files.find(f => f.endsWith('.prj'));
    if (prjFile) {
      const prjContent = await fs.readFile(`${extractDir}/${prjFile}`, 'utf-8');
      result.detectedCrs = this.parsePRJ(prjContent);
    }
    
    return result;
  }

  private async parseKML(filePath: string): Promise<ParseResult> {
    // Convert KML to GeoJSON using ogr2ogr
    const tempGeoJSON = filePath.replace(/\.(kml|kmz)$/i, '_temp.geojson');
    await execAsync(`ogr2ogr -f GeoJSON "${tempGeoJSON}" "${filePath}"`);
    
    return this.parseGeoJSON(tempGeoJSON);
  }

  private async parseCSV(filePath: string): Promise<ParseResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Detect lat/lon columns
    const latColumns = ['lat', 'latitude', 'y', 'lintang'];
    const lonColumns = ['lon', 'lng', 'longitude', 'x', 'bujur'];
    
    const latIdx = headers.findIndex(h => latColumns.includes(h));
    const lonIdx = headers.findIndex(h => lonColumns.includes(h));
    
    if (latIdx === -1 || lonIdx === -1) {
      throw new Error('CSV must have latitude and longitude columns');
    }
    
    // Parse rows to features
    const features: any[] = [];
    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const lat = parseFloat(values[latIdx]);
      const lon = parseFloat(values[lonIdx]);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const properties: any = {};
        headers.forEach((h, idx) => {
          if (idx !== latIdx && idx !== lonIdx) {
            properties[h] = values[idx];
          }
        });
        
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties
        });
        
        bbox[0] = Math.min(bbox[0], lon);
        bbox[1] = Math.min(bbox[1], lat);
        bbox[2] = Math.max(bbox[2], lon);
        bbox[3] = Math.max(bbox[3], lat);
      }
    }
    
    const fields = this.analyzeFields(features);
    
    return {
      geometryType: 'Point',
      featureCount: features.length,
      detectedCrs: 'EPSG:4326',
      fields,
      sampleData: features.slice(0, 5).map(f => f.properties),
      bbox: bbox as [number, number, number, number],
      warnings: [],
    };
  }

  private analyzeFields(features: any[]): FieldInfo[] {
    const fieldMap = new Map<string, FieldInfo>();
    
    features.forEach(f => {
      if (!f.properties) return;
      
      Object.entries(f.properties).forEach(([key, value]) => {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            name: key,
            type: this.detectType(value),
            sample: value,
            nullCount: 0,
          });
        }
        
        const field = fieldMap.get(key)!;
        if (value === null || value === undefined || value === '') {
          field.nullCount++;
        }
      });
    });
    
    return [...fieldMap.values()];
  }

  private detectType(value: any): 'string' | 'number' | 'boolean' | 'date' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Check if it's a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      // Check if it's a number string
      if (!isNaN(parseFloat(value))) return 'number';
    }
    return 'string';
  }

  private updateBBox(bbox: number[], geometry: any): void {
    const coords = this.flattenCoordinates(geometry);
    coords.forEach(([lon, lat]) => {
      bbox[0] = Math.min(bbox[0], lon);
      bbox[1] = Math.min(bbox[1], lat);
      bbox[2] = Math.max(bbox[2], lon);
      bbox[3] = Math.max(bbox[3], lat);
    });
  }

  private flattenCoordinates(geometry: any): number[][] {
    const coords: number[][] = [];
    
    const extract = (arr: any): void => {
      if (typeof arr[0] === 'number') {
        coords.push(arr);
      } else {
        arr.forEach(extract);
      }
    };
    
    extract(geometry.coordinates);
    return coords;
  }

  private parsePRJ(prjContent: string): string {
    // Simple PRJ parser - in production, use proj4 or similar
    if (prjContent.includes('WGS_1984') || prjContent.includes('WGS84')) {
      return 'EPSG:4326';
    }
    if (prjContent.includes('Mercator') && prjContent.includes('WGS')) {
      return 'EPSG:3857';
    }
    // For Indonesia-specific
    if (prjContent.includes('DGN95') || prjContent.includes('Indonesia')) {
      return 'EPSG:4755';
    }
    return 'UNKNOWN';
  }
}
```

### 2.4 Transform Service
```typescript
// transform.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MapLayer } from '../entities/map-layer.entity';
import { MapLayerFeature } from '../entities/map-layer-feature.entity';
import { SpatialUploadFile } from '../entities/spatial-upload-file.entity';
import * as fs from 'fs/promises';

export interface MappingConfig {
  layerName: string;
  layerCode: string;
  categoryCode: string;
  description?: string;
  fieldMapping: Record<string, string>;
  sourceSrid?: number;
  targetSrid?: number;
  style?: any;
}

@Injectable()
export class TransformService {
  constructor(
    @InjectRepository(MapLayer)
    private layerRepo: Repository<MapLayer>,
    @InjectRepository(MapLayerFeature)
    private featureRepo: Repository<MapLayerFeature>,
    @InjectRepository(SpatialUploadFile)
    private uploadRepo: Repository<SpatialUploadFile>,
    private dataSource: DataSource,
  ) {}

  async transformAndPublish(
    uploadId: string,
    config: MappingConfig,
  ): Promise<MapLayer> {
    const upload = await this.uploadRepo.findOneOrFail({
      where: { idUpload: uploadId }
    });
    
    // Update status
    upload.status = 'transforming';
    await this.uploadRepo.save(upload);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // 1. Create layer
      const layer = queryRunner.manager.create(MapLayer, {
        idOwner: upload.idOwner,
        idProject: upload.idProject,
        layerName: config.layerName,
        layerCode: config.layerCode,
        categoryCode: config.categoryCode,
        layerDescription: config.description,
        layerType: 'custom',
        sourceType: upload.fileType,
        geometryType: upload.parsedResult.geometryType,
        srid: config.targetSrid || 4326,
        styleJson: config.style || {},
        configJson: {
          labelField: config.fieldMapping.label,
          idField: config.fieldMapping.externalId,
        },
        sourceRef: upload.filePath,
      });
      
      await queryRunner.manager.save(layer);
      
      // 2. Read and transform features
      const geojson = await this.loadGeoJSON(upload);
      const features = geojson.type === 'FeatureCollection' 
        ? geojson.features 
        : [geojson];
      
      // 3. Insert features with geometry transformation
      let featureCount = 0;
      const batchSize = 100;
      
      for (let i = 0; i < features.length; i += batchSize) {
        const batch = features.slice(i, i + batchSize);
        const insertValues: string[] = [];
        
        for (const feature of batch) {
          if (!feature.geometry) continue;
          
          // Build properties from mapping
          const props: any = {};
          for (const [targetField, sourceField] of Object.entries(config.fieldMapping)) {
            if (sourceField && feature.properties[sourceField] !== undefined) {
              props[targetField] = feature.properties[sourceField];
            }
          }
          
          // Keep original properties too
          props._original = feature.properties;
          
          const label = props.label || props[config.fieldMapping.label] || '';
          const externalId = props.externalId || props[config.fieldMapping.externalId] || '';
          
          // Build SQL for geometry
          const geomJson = JSON.stringify(feature.geometry);
          const sourceSrid = config.sourceSrid || 4326;
          const targetSrid = config.targetSrid || 4326;
          
          insertValues.push(`(
            '${layer.idLayer}',
            ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('${geomJson}'), ${sourceSrid}), ${targetSrid}),
            '${JSON.stringify(props).replace(/'/g, "''")}',
            '${label.replace(/'/g, "''")}',
            '${externalId.replace(/'/g, "''")}'
          )`);
          
          featureCount++;
        }
        
        if (insertValues.length > 0) {
          await queryRunner.query(`
            INSERT INTO map_layer_feature (id_layer, geom, properties_json, label, external_id)
            VALUES ${insertValues.join(',\n')}
          `);
        }
      }
      
      // 4. Update layer metadata
      layer.featureCount = featureCount;
      
      // Calculate bbox
      const bboxResult = await queryRunner.query(`
        SELECT 
          ST_XMin(ST_Extent(geom)) as minx,
          ST_YMin(ST_Extent(geom)) as miny,
          ST_XMax(ST_Extent(geom)) as maxx,
          ST_YMax(ST_Extent(geom)) as maxy
        FROM map_layer_feature
        WHERE id_layer = $1
      `, [layer.idLayer]);
      
      if (bboxResult[0]) {
        layer.bbox = {
          minX: bboxResult[0].minx,
          minY: bboxResult[0].miny,
          maxX: bboxResult[0].maxx,
          maxY: bboxResult[0].maxy,
        };
      }
      
      await queryRunner.manager.save(layer);
      
      // 5. Update centroid for all features
      await queryRunner.query(`
        UPDATE map_layer_feature
        SET 
          centroid = ST_Centroid(geom),
          bbox = Box2D(geom)
        WHERE id_layer = $1
      `, [layer.idLayer]);
      
      // 6. Update upload status
      upload.status = 'completed';
      upload.idLayer = layer.idLayer;
      upload.processedAt = new Date();
      await queryRunner.manager.save(upload);
      
      await queryRunner.commitTransaction();
      
      return layer;
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      upload.status = 'failed';
      upload.errorMessage = error.message;
      await this.uploadRepo.save(upload);
      
      throw error;
      
    } finally {
      await queryRunner.release();
    }
  }

  private async loadGeoJSON(upload: SpatialUploadFile): Promise<any> {
    if (upload.fileType === 'geojson') {
      const content = await fs.readFile(upload.filePath, 'utf-8');
      return JSON.parse(content);
    }
    
    // For other formats, use converted GeoJSON from parsing step
    const tempPath = upload.filePath.replace(/\.[^.]+$/, '_temp.geojson');
    const content = await fs.readFile(tempPath, 'utf-8');
    return JSON.parse(content);
  }
}
```

### 2.5 Layer Service
```typescript
// layer.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapLayer } from '../entities/map-layer.entity';
import { MapLayerFeature } from '../entities/map-layer-feature.entity';

@Injectable()
export class LayerService {
  constructor(
    @InjectRepository(MapLayer)
    private layerRepo: Repository<MapLayer>,
    @InjectRepository(MapLayerFeature)
    private featureRepo: Repository<MapLayerFeature>,
  ) {}

  async findLayersByProject(
    projectId: string,
    options?: {
      type?: 'core' | 'operational' | 'custom';
      includeHidden?: boolean;
    }
  ): Promise<MapLayer[]> {
    const qb = this.layerRepo.createQueryBuilder('l')
      .where('l.id_project = :projectId', { projectId })
      .orWhere('l.is_core = true');
    
    if (options?.type) {
      qb.andWhere('l.layer_type = :type', { type: options.type });
    }
    
    if (!options?.includeHidden) {
      qb.andWhere('l.is_visible_default = true');
    }
    
    qb.orderBy('l.display_order', 'ASC')
      .addOrderBy('l.created_at', 'DESC');
    
    return qb.getMany();
  }

  async getLayerAsGeoJSON(
    layerId: string,
    options?: {
      bbox?: [number, number, number, number];
      limit?: number;
      simplify?: number; // tolerance for ST_Simplify
    }
  ): Promise<any> {
    let query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', f.id_feature,
            'geometry', ST_AsGeoJSON(
              ${options?.simplify ? `ST_Simplify(f.geom, ${options.simplify})` : 'f.geom'}
            )::jsonb,
            'properties', f.properties_json || jsonb_build_object(
              'idFeature', f.id_feature,
              'label', f.label,
              'externalId', f.external_id
            )
          )
        ), '[]'::jsonb)
      ) as geojson
      FROM map_layer_feature f
      WHERE f.id_layer = $1
    `;
    
    const params: any[] = [layerId];
    
    if (options?.bbox) {
      const [minX, minY, maxX, maxY] = options.bbox;
      query += ` AND f.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)`;
      params.push(minX, minY, maxX, maxY);
    }
    
    if (options?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }
    
    const result = await this.featureRepo.query(query, params);
    return result[0]?.geojson || { type: 'FeatureCollection', features: [] };
  }

  async updateLayerStyle(
    layerId: string,
    style: any
  ): Promise<MapLayer> {
    const layer = await this.layerRepo.findOneOrFail({
      where: { idLayer: layerId }
    });
    
    layer.styleJson = { ...layer.styleJson, ...style };
    return this.layerRepo.save(layer);
  }

  async toggleVisibility(
    layerId: string,
    isVisible: boolean
  ): Promise<MapLayer> {
    const layer = await this.layerRepo.findOneOrFail({
      where: { idLayer: layerId }
    });
    
    layer.isVisibleDefault = isVisible;
    return this.layerRepo.save(layer);
  }

  async deleteLayer(layerId: string): Promise<void> {
    const layer = await this.layerRepo.findOneOrFail({
      where: { idLayer: layerId }
    });
    
    if (layer.isCore || layer.isLocked) {
      throw new Error('Cannot delete core or locked layer');
    }
    
    // Features will be cascade deleted
    await this.layerRepo.remove(layer);
  }
}
```

---

## 3. Frontend Components

### 3.1 Upload Modal Component
```typescript
// layer-upload-modal.component.ts
@Component({
  selector: 'app-layer-upload-modal',
  templateUrl: './layer-upload-modal.component.html'
})
export class LayerUploadModalComponent implements OnInit {
  @Output() uploaded = new EventEmitter<MapLayer>();
  
  currentStep = 1;
  totalSteps = 4;
  
  // Step 1: Upload
  selectedFile: File | null = null;
  uploading = false;
  uploadProgress = 0;
  
  // Step 2: Preview
  uploadResult: SpatialUpload | null = null;
  parseResult: ParseResult | null = null;
  
  // Step 3: Mapping
  categories: LayerCategory[] = [];
  selectedCategory: string = '';
  layerName = '';
  layerCode = '';
  fieldMapping: Record<string, string> = {};
  autoMappedFields: string[] = [];
  
  // Step 4: Style
  styleConfig = {
    color: '#2196F3',
    strokeWidth: 2,
    fill: 'rgba(33, 150, 243, 0.2)',
    showLabels: true,
    labelField: ''
  };
  
  constructor(
    private uploadService: SpatialUploadService,
    private layerService: LayerService
  ) {}
  
  // Step 1: File selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }
  
  async uploadFile() {
    if (!this.selectedFile) return;
    
    this.uploading = true;
    try {
      this.uploadResult = await this.uploadService.upload(this.selectedFile);
      await this.parseFile();
      this.currentStep = 2;
    } finally {
      this.uploading = false;
    }
  }
  
  // Step 2: Parse
  async parseFile() {
    if (!this.uploadResult) return;
    
    this.parseResult = await this.uploadService.parse(this.uploadResult.idUpload);
    
    // Auto-suggest layer name from filename
    this.layerName = this.uploadResult.originalFilename
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    // Generate layer code
    this.layerCode = this.generateLayerCode(this.layerName);
    
    // Auto-map fields
    this.autoMapFields();
  }
  
  // Step 3: Mapping
  onCategoryChange() {
    const category = this.categories.find(c => c.categoryCode === this.selectedCategory);
    if (category?.templateFields) {
      this.autoMapFields(category.templateFields);
    }
  }
  
  autoMapFields(templateFields?: TemplateField[]) {
    if (!this.parseResult) return;
    
    const sourceFields = this.parseResult.fields.map(f => f.name);
    
    // Smart field matching
    const aliases: Record<string, string[]> = {
      label: ['nama', 'name', 'nm', 'label', 'title', 'nama_pipa', 'nama_jalan'],
      externalId: ['id', 'kode', 'code', 'no', 'nomor'],
      diameter: ['dia', 'diameter', 'ukuran', 'd', 'size'],
      material: ['mat', 'material', 'bahan'],
      status: ['status', 'kondisi', 'state'],
      type: ['type', 'tipe', 'jenis'],
    };
    
    this.fieldMapping = {};
    this.autoMappedFields = [];
    
    for (const [target, aliasList] of Object.entries(aliases)) {
      const matched = sourceFields.find(sf => 
        aliasList.some(alias => sf.toLowerCase().includes(alias))
      );
      if (matched) {
        this.fieldMapping[target] = matched;
        this.autoMappedFields.push(target);
      }
    }
  }
  
  // Step 4: Publish
  async publish() {
    if (!this.uploadResult) return;
    
    const config: MappingConfig = {
      layerName: this.layerName,
      layerCode: this.layerCode,
      categoryCode: this.selectedCategory,
      fieldMapping: this.fieldMapping,
      style: {
        stroke: this.styleConfig.color,
        strokeWidth: this.styleConfig.strokeWidth,
        fill: this.styleConfig.fill,
        labelField: this.styleConfig.showLabels ? this.styleConfig.labelField : undefined,
      }
    };
    
    const layer = await this.uploadService.publish(
      this.uploadResult.idUpload,
      config
    );
    
    this.uploaded.emit(layer);
    this.close();
  }
  
  private generateLayerCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }
}
```

### 3.2 Field Mapper Component
```html
<!-- field-mapper.component.html -->
<div class="field-mapper">
  <div class="field-row" *ngFor="let field of standardFields">
    <label class="field-label">
      {{ field.label }}
      <span class="required" *ngIf="field.required">*</span>
    </label>
    
    <select 
      class="field-select"
      [(ngModel)]="fieldMapping[field.key]"
      [class.auto-mapped]="autoMappedFields.includes(field.key)"
    >
      <option value="">-- Select field --</option>
      <option *ngFor="let sf of sourceFields" [value]="sf.name">
        {{ sf.name }} ({{ sf.type }})
      </option>
    </select>
    
    <span class="preview" *ngIf="fieldMapping[field.key]">
      {{ getPreviewValue(field.key) }}
    </span>
    
    <span class="auto-badge" *ngIf="autoMappedFields.includes(field.key)">
      ✓ Auto
    </span>
  </div>
</div>

<style>
.field-mapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-row {
  display: grid;
  grid-template-columns: 150px 1fr 150px auto;
  gap: 0.5rem;
  align-items: center;
}

.field-select.auto-mapped {
  border-color: #4CAF50;
}

.auto-badge {
  color: #4CAF50;
  font-size: 0.75rem;
}

.preview {
  color: #666;
  font-size: 0.875rem;
  font-style: italic;
}
</style>
```

---

## 4. Error Handling

### 4.1 Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_GEOJSON` | GeoJSON structure invalid | Validate structure before upload |
| `NO_GEOMETRY` | Features missing geometry | Skip or warn user |
| `UNKNOWN_CRS` | CRS not detected | Allow manual override |
| `GEOMETRY_INVALID` | Self-intersection, etc | Use ST_MakeValid |
| `FILE_TOO_LARGE` | Exceeds 50MB limit | Reject with message |
| `PARSE_FAILED` | Cannot read file | Show detailed error |

### 4.2 Geometry Validation
```sql
-- Fix invalid geometries during import
UPDATE map_layer_feature
SET geom = ST_MakeValid(geom)
WHERE id_layer = $1 AND NOT ST_IsValid(geom);

-- Check for common issues
SELECT 
  id_feature,
  CASE
    WHEN NOT ST_IsValid(geom) THEN 'invalid'
    WHEN ST_IsEmpty(geom) THEN 'empty'
    WHEN GeometryType(geom) = 'GEOMETRYCOLLECTION' THEN 'collection'
    ELSE 'ok'
  END as issue
FROM map_layer_feature
WHERE id_layer = $1 AND (
  NOT ST_IsValid(geom) OR 
  ST_IsEmpty(geom) OR
  GeometryType(geom) = 'GEOMETRYCOLLECTION'
);
```

---

## 5. Performance Optimization

### 5.1 Large File Handling
```typescript
// Streaming parser for large GeoJSON
async function* parseGeoJSONStream(filePath: string) {
  const parser = JSONStream.parse('features.*');
  const stream = fs.createReadStream(filePath).pipe(parser);
  
  for await (const feature of stream) {
    yield feature;
  }
}

// Batch insert
async function insertFeaturesBatch(features: any[], layerId: string) {
  const batchSize = 500;
  
  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    await insertBatch(batch, layerId);
    
    // Progress callback
    const progress = Math.round((i + batch.length) / features.length * 100);
    notifyProgress(progress);
  }
}
```

### 5.2 Spatial Indexing
```sql
-- Create spatial index on features
CREATE INDEX CONCURRENTLY idx_mlf_geom_gist 
ON map_layer_feature USING GIST(geom);

-- Create partial indexes per layer for frequent queries
CREATE INDEX CONCURRENTLY idx_mlf_layer_<layerid>_geom 
ON map_layer_feature USING GIST(geom) 
WHERE id_layer = '<layerid>';
```

### 5.3 Geometry Simplification
```typescript
// Simplify geometry based on zoom level
function getSimplifyTolerance(zoom: number): number {
  const tolerances: Record<number, number> = {
    0: 0.1,
    5: 0.05,
    10: 0.001,
    15: 0.0001,
    20: 0,
  };
  
  const keys = Object.keys(tolerances).map(Number).sort((a, b) => b - a);
  const key = keys.find(k => zoom >= k) || 0;
  return tolerances[key];
}
```

---

**End of Document**
