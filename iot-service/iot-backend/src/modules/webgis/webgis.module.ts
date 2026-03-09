import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

// Entities
import { MapLayer } from '../../entities/map-layer.entity';
import { MapLayerFeature } from '../../entities/map-layer-feature.entity';
import { MapLayerCategory } from '../../entities/map-layer-category.entity';
import { SpatialUploadFile } from '../../entities/spatial-upload-file.entity';

// Services
import { LayersService } from './services/layers.service';
import { CategoriesService } from './services/categories.service';
import { FeaturesService } from './services/features.service';
import { UploadService } from './services/upload.service';
import { CoreGeoJsonService } from './services/core-geojson.service';

// Controllers
import { LayersController } from './controllers/layers.controller';
import { CategoriesController } from './controllers/categories.controller';
import { FeaturesController } from './controllers/features.controller';
import { UploadController } from './controllers/upload.controller';
import { CoreGeoJsonController } from './controllers/core-geojson.controller';

/**
 * WebGIS Module
 * 
 * Provides spatial data management capabilities:
 * - Layer management (core, operational, custom)
 * - Feature CRUD with PostGIS geometry
 * - Category templates for field auto-mapping
 * - File upload pipeline (GeoJSON, CSV, Shapefile)
 * 
 * API Routes:
 * - /api/webgis/layers - Layer management
 * - /api/webgis/categories - Category templates
 * - /api/webgis/features - Feature CRUD
 * - /api/webgis/upload - File upload pipeline
 * 
 * This module is designed to be easily separated into its own microservice.
 * All dependencies are self-contained and can be extracted with minimal changes.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapLayer,
      MapLayerFeature,
      MapLayerCategory,
      SpatialUploadFile,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  ],
  controllers: [
    LayersController,
    CategoriesController,
    FeaturesController,
    UploadController,
    CoreGeoJsonController,
  ],
  providers: [
    LayersService,
    CategoriesService,
    FeaturesService,
    UploadService,
    CoreGeoJsonService,
  ],
  exports: [
    LayersService,
    CategoriesService,
    FeaturesService,
    UploadService,
    CoreGeoJsonService,
  ],
})
export class WebgisModule {}
