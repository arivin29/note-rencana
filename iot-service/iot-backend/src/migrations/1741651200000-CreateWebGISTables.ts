import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebGISTables1741651200000 implements MigrationInterface {
  name = 'CreateWebGISTables1741651200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension if not exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // Create map_layer_category table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "map_layer_category" (
        "id_category" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_owner" UUID REFERENCES "owners"("id_owner") ON DELETE CASCADE,
        "category_code" VARCHAR(50) NOT NULL,
        "category_name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "industry_code" VARCHAR(50),
        "parent_category_id" UUID REFERENCES "map_layer_category"("id_category") ON DELETE SET NULL,
        "allowed_geometry_types" VARCHAR[] DEFAULT ARRAY['Point', 'LineString', 'Polygon'],
        "template_fields" JSONB DEFAULT '[]',
        "default_style" JSONB DEFAULT '{}',
        "icon_default" VARCHAR(100),
        "color_default" VARCHAR(20),
        "is_system" BOOLEAN DEFAULT false,
        "is_operational" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "display_order" INTEGER DEFAULT 0,
        "created_by" UUID,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create unique index for category per owner
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_category_owner_code" 
      ON "map_layer_category" ("id_owner", "category_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_category_industry" 
      ON "map_layer_category" ("industry_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_category_active" 
      ON "map_layer_category" ("is_active")
    `);

    // Create map_layer table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "map_layer" (
        "id_layer" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_owner" UUID REFERENCES "owners"("id_owner") ON DELETE CASCADE,
        "id_project" UUID REFERENCES "projects"("id_project") ON DELETE SET NULL,
        "layer_name" VARCHAR(255) NOT NULL,
        "layer_code" VARCHAR(100),
        "layer_description" TEXT,
        "layer_type" VARCHAR(20) NOT NULL CHECK ("layer_type" IN ('core', 'operational', 'custom')),
        "source_type" VARCHAR(20) NOT NULL CHECK ("source_type" IN ('system', 'geojson', 'shp', 'kml', 'csv', 'api')),
        "category_code" VARCHAR(50),
        "geometry_type" VARCHAR(50),
        "srid" INTEGER DEFAULT 4326,
        "bbox" JSONB,
        "feature_count" INTEGER DEFAULT 0,
        "source_table" VARCHAR(255),
        "source_ref" TEXT,
        "style_json" JSONB DEFAULT '{}',
        "config_json" JSONB DEFAULT '{}',
        "is_visible_default" BOOLEAN DEFAULT true,
        "is_core" BOOLEAN DEFAULT false,
        "is_locked" BOOLEAN DEFAULT false,
        "display_order" INTEGER DEFAULT 0,
        "created_by" UUID,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create unique index for layer code per project
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_layer_project_code" 
      ON "map_layer" ("id_project", "layer_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_layer_owner" 
      ON "map_layer" ("id_owner")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_layer_type" 
      ON "map_layer" ("layer_type")
    `);

    // Create map_layer_feature table with PostGIS geometry
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "map_layer_feature" (
        "id_feature" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_layer" UUID NOT NULL REFERENCES "map_layer"("id_layer") ON DELETE CASCADE,
        "geom" GEOMETRY(Geometry, 4326) NOT NULL,
        "properties_json" JSONB DEFAULT '{}',
        "label" VARCHAR(500),
        "external_id" VARCHAR(255),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_feature_layer" 
      ON "map_layer_feature" ("id_layer")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_feature_external" 
      ON "map_layer_feature" ("external_id")
    `);

    // Create spatial index for geometry
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_feature_geom" 
      ON "map_layer_feature" USING GIST ("geom")
    `);

    // Create spatial_upload_file table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spatial_upload_file" (
        "id_upload" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_owner" UUID NOT NULL REFERENCES "owners"("id_owner") ON DELETE CASCADE,
        "id_project" UUID REFERENCES "projects"("id_project") ON DELETE SET NULL,
        "original_filename" VARCHAR(500) NOT NULL,
        "stored_filename" VARCHAR(500) NOT NULL,
        "file_path" TEXT NOT NULL,
        "file_type" VARCHAR(50) NOT NULL,
        "file_size" BIGINT,
        "mime_type" VARCHAR(100),
        "status" VARCHAR(20) DEFAULT 'uploaded' CHECK ("status" IN ('uploaded', 'parsing', 'parsed', 'mapping', 'transforming', 'completed', 'failed')),
        "parsed_result" JSONB,
        "field_mapping" JSONB,
        "error_message" TEXT,
        "error_detail" JSONB,
        "id_layer" UUID REFERENCES "map_layer"("id_layer") ON DELETE SET NULL,
        "uploaded_by" UUID,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "processed_at" TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_upload_owner" 
      ON "spatial_upload_file" ("id_owner")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_upload_status" 
      ON "spatial_upload_file" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_upload_created" 
      ON "spatial_upload_file" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "spatial_upload_file" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "map_layer_feature" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "map_layer" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "map_layer_category" CASCADE`);
  }
}
