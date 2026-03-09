-- WebGIS Layer System Tables
-- Run this on the iot database

-- Create extensions if not exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Map Layer Category
CREATE TABLE IF NOT EXISTS map_layer_category (
    id_category UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_owner UUID,
    category_code VARCHAR(100) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    industry_code VARCHAR(50),
    parent_category_id UUID REFERENCES map_layer_category(id_category),
    allowed_geometry_types TEXT[] DEFAULT ARRAY['Point', 'LineString', 'Polygon'],
    template_fields JSONB DEFAULT '[]'::jsonb,
    default_style JSONB DEFAULT '{}'::jsonb,
    icon_default VARCHAR(255),
    color_default VARCHAR(50),
    is_system BOOLEAN DEFAULT false,
    is_operational BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_code_owner UNIQUE (id_owner, category_code)
);

CREATE INDEX IF NOT EXISTS idx_category_owner ON map_layer_category(id_owner);
CREATE INDEX IF NOT EXISTS idx_category_industry ON map_layer_category(industry_code);

-- 2. Map Layer
CREATE TABLE IF NOT EXISTS map_layer (
    id_layer UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_owner UUID,
    id_project UUID,
    layer_name VARCHAR(255) NOT NULL,
    layer_code VARCHAR(100),
    layer_description TEXT,
    layer_type VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (layer_type IN ('core', 'operational', 'custom')),
    source_type VARCHAR(20) NOT NULL DEFAULT 'geojson' CHECK (source_type IN ('system', 'geojson', 'shp', 'kml', 'csv', 'api')),
    category_code VARCHAR(100),
    geometry_type VARCHAR(50),
    srid INTEGER DEFAULT 4326,
    bbox JSONB,
    feature_count INTEGER DEFAULT 0,
    source_table VARCHAR(255),
    source_ref VARCHAR(500),
    style_json JSONB DEFAULT '{}'::jsonb,
    config_json JSONB DEFAULT '{}'::jsonb,
    is_visible_default BOOLEAN DEFAULT true,
    is_core BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_layer_code_project UNIQUE (id_project, layer_code)
);

CREATE INDEX IF NOT EXISTS idx_layer_owner ON map_layer(id_owner);
CREATE INDEX IF NOT EXISTS idx_layer_project ON map_layer(id_project);
CREATE INDEX IF NOT EXISTS idx_layer_type ON map_layer(layer_type);
CREATE INDEX IF NOT EXISTS idx_layer_category ON map_layer(category_code);

-- 3. Map Layer Feature (PostGIS)
CREATE TABLE IF NOT EXISTS map_layer_feature (
    id_feature UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_layer UUID NOT NULL REFERENCES map_layer(id_layer) ON DELETE CASCADE,
    geometry GEOMETRY(Geometry, 4326),
    properties_json JSONB DEFAULT '{}'::jsonb,
    label VARCHAR(500),
    external_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_layer ON map_layer_feature(id_layer);
CREATE INDEX IF NOT EXISTS idx_feature_geometry ON map_layer_feature USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_feature_external ON map_layer_feature(external_id);

-- 4. Spatial Upload File
CREATE TABLE IF NOT EXISTS spatial_upload_file (
    id_upload UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_owner UUID,
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500),
    file_path VARCHAR(1000),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'mapping', 'transforming', 'completed', 'failed')),
    parsed_result JSONB,
    field_mapping JSONB,
    error_message TEXT,
    id_layer UUID REFERENCES map_layer(id_layer),
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_upload_owner ON spatial_upload_file(id_owner);
CREATE INDEX IF NOT EXISTS idx_upload_status ON spatial_upload_file(status);

-- Seed system categories for common industries
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style)
VALUES
    ('pipe_network', 'Pipa Distribusi', 'water_utility', true, true, 
     '[{"name": "diameter", "type": "number", "aliases": ["pipe_diameter", "width"]}, {"name": "material", "type": "string", "aliases": ["pipe_material", "type"]}, {"name": "pressure_class", "type": "string", "aliases": ["class", "rating"]}]'::jsonb,
     '{"stroke": "#2196F3", "strokeWidth": 3}'::jsonb),
    ('valve', 'Valve/Katup', 'water_utility', true, true,
     '[{"name": "valve_type", "type": "string", "aliases": ["type", "jenis"]}, {"name": "status", "type": "string", "aliases": ["condition"]}, {"name": "diameter", "type": "number"}]'::jsonb,
     '{"icon": "valve", "fill": "#4CAF50"}'::jsonb),
    ('meter', 'Meter Air', 'water_utility', true, true,
     '[{"name": "meter_id", "type": "string", "aliases": ["serial", "no_meter"]}, {"name": "customer_name", "type": "string", "aliases": ["name", "pelanggan"]}, {"name": "tariff_class", "type": "string"}]'::jsonb,
     '{"icon": "meter", "fill": "#FF9800"}'::jsonb),
    ('dma_zone', 'Zona DMA', 'water_utility', true, true,
     '[{"name": "zone_name", "type": "string", "aliases": ["name", "zona"]}, {"name": "inflow_meter", "type": "string"}, {"name": "population", "type": "number"}]'::jsonb,
     '{"stroke": "#9C27B0", "fill": "rgba(156,39,176,0.2)", "strokeWidth": 2}'::jsonb),
    ('power_line', 'Jaringan Listrik', 'energy', true, true,
     '[{"name": "voltage", "type": "number", "aliases": ["tegangan", "kv"]}, {"name": "line_type", "type": "string"}, {"name": "capacity", "type": "number"}]'::jsonb,
     '{"stroke": "#F44336", "strokeWidth": 2}'::jsonb),
    ('transformer', 'Trafo', 'energy', true, true,
     '[{"name": "capacity_kva", "type": "number", "aliases": ["capacity", "kva"]}, {"name": "serial_number", "type": "string"}, {"name": "status", "type": "string"}]'::jsonb,
     '{"icon": "transformer", "fill": "#795548"}'::jsonb),
    ('custom_point', 'Titik Kustom', 'general', false, false,
     '[{"name": "name", "type": "string"}, {"name": "description", "type": "string"}]'::jsonb, 
     '{"fill": "#607D8B", "radius": 8}'::jsonb),
    ('custom_line', 'Garis Kustom', 'general', false, false,
     '[{"name": "name", "type": "string"}, {"name": "length", "type": "number"}]'::jsonb,
     '{"stroke": "#607D8B", "strokeWidth": 2}'::jsonb),
    ('custom_polygon', 'Area Kustom', 'general', false, false,
     '[{"name": "name", "type": "string"}, {"name": "area", "type": "number"}]'::jsonb,
     '{"stroke": "#607D8B", "fill": "rgba(96,125,139,0.2)"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS set_updated_at ON map_layer;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON map_layer
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON map_layer_category;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON map_layer_category
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON map_layer_feature;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON map_layer_feature
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

SELECT 'WebGIS tables created successfully!' AS status;
