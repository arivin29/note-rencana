# Helios WebGIS Layer System

## Document Info
| Key | Value |
|-----|-------|
| Version | 1.0 |
| Created | 2026-03-07 |
| Author | Devetek Team |
| Status | Draft |
| Target URL | `/iot/projects/:projectId/map` |

---

## 1. Overview

### 1.1 Tujuan
Membangun sistem WebGIS yang fleksibel untuk menampilkan data spasial IoT dengan kemampuan:
- **Fixed Core Layers** - Data sensor, node, alert yang terhubung ke sistem telemetry
- **Operational Layers** - Layer standar operasional PDAM yang bisa dimapping
- **Custom Layers** - Layer dinamis yang bisa diupload user dalam berbagai format

### 1.2 Prinsip Desain
```
┌─────────────────────────────────────────────────────────────┐
│                    HELIOS WEBGIS                            │
├─────────────────────────────────────────────────────────────┤
│  Fixed Core GIS Engine                                      │
│  ├── Sensor Layer (realtime)                                │
│  ├── Node/Device Layer                                      │
│  ├── Alert/Anomaly Layer                                    │
│  └── Network Topology Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  Dynamic Spatial Workspace                                  │
│  ├── Operational Layers (semi-fixed, category-based)        │
│  └── Custom Layers (user upload, normalized)                │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Keuntungan Arsitektur
| Aspek | Benefit |
|-------|---------|
| Scalability | User bisa upload layer sendiri tanpa ubah schema inti |
| Flexibility | Dukung berbagai format (SHP, GeoJSON, KML, CSV) |
| Consistency | Data dinormalisasi ke format standar internal |
| Performance | Core layer dioptimasi, custom layer di-index |
| Multi-tenant | Layer terisolasi per owner/project |

---

## 2. Layer Architecture

### 2.1 Layer Categories

#### A. System Core Layer (Fixed)
Layer yang dimiliki sistem, tidak bebas ubah struktur.

| Layer | Source | Realtime | Style |
|-------|--------|----------|-------|
| `sensor` | PostgreSQL + ClickHouse | ✅ Live | By status (online/offline/warning) |
| `node` | PostgreSQL | ✅ Live | By connectivity status |
| `alert` | PostgreSQL | ✅ Live | By severity (critical/warning/info) |
| `anomaly` | PostgreSQL | ✅ Live | By anomaly grade |
| `network_topology` | PostGIS | ❌ | By pipe type |

**Karakteristik:**
- Schema fix
- Style fix by status
- Relasi ke telemetry fix
- Dipakai untuk analitik, AI, dashboard
- **Note:** Sensor/Node tidak punya geometry column - gunakan ST_MakePoint(longitude, latitude) dari Node

#### B. Operational Layer (Semi-Fixed, Dynamic Categories)

> **Kategori disimpan di database** - bisa ditambah/edit via API. Lihat Section 3.2 (`map_layer_category`) untuk detail.

Layer operasional dengan template yang bervariasi per industri:

| Industry | Example Categories |
|----------|-------------------|
| Water Utility | `pipe_network`, `valve`, `hydrant`, `dma_boundary`, `reservoir` |
| Energy | `transmission_line`, `substation`, `transformer` |
| Manufacturing | `production_zone`, `warehouse`, `machine_location` |
| Agriculture | `field_boundary`, `irrigation_line`, `sensor_zone` |
| Smart Building | `floor_plan`, `hvac_zone`, `parking_area` |

**Karakteristik:**
- ✅ Kategori dinamis - CRUD via API
- ✅ Template fields per kategori dengan `aliases` untuk auto-mapping
- ✅ Style bisa dikustomisasi per kategori
- ✅ Multi-tenant: setiap owner bisa punya kategori custom

> Detail lengkap template fields ada di Section 3.2 seed data.

#### C. User Custom Layer (Dynamic)
Layer bebas yang diupload user.

| Format Support | Extension | Notes |
|----------------|-----------|-------|
| GeoJSON | `.geojson`, `.json` | Native support |
| Shapefile | `.zip` (contain .shp, .dbf, .shx, .prj) | Perlu ekstraksi |
| KML | `.kml`, `.kmz` | Google Earth format |
| CSV | `.csv` | Dengan kolom lat/lon |
| GPKG | `.gpkg` | GeoPackage (future) |

**Contoh Use Case:**
- Peta desa/kecamatan
- Jalur pipa hasil survey lapangan
- Titik pelanggan prioritas
- Area rawan kebocoran
- Layer aset lama

---

## 3. Database Design

### 3.1 ERD Overview
```
┌─────────────────────┐      ┌─────────────────────┐
│   map_layer         │      │  map_layer_feature  │
├─────────────────────┤      ├─────────────────────┤
│ id_layer (PK)       │──┐   │ id_feature (PK)     │
│ id_owner (FK)       │  │   │ id_layer (FK)       │──┐
│ id_project (FK)     │  └──▶│ geom (geometry)     │  │
│ layer_name          │      │ properties_json     │  │
│ layer_code          │      │ label               │  │
│ layer_type          │      │ external_id         │  │
│ source_type         │      │ bbox                │  │
│ geometry_type       │      │ created_at          │  │
│ srid                │      └─────────────────────┘  │
│ style_json          │                               │
│ config_json         │      ┌─────────────────────┐  │
│ ...                 │      │  map_layer_style    │  │
└─────────────────────┘      ├─────────────────────┤  │
                             │ id_style (PK)       │  │
┌─────────────────────┐      │ id_layer (FK)       │──┘
│ spatial_upload_file │      │ style_type          │
├─────────────────────┤      │ style_config        │
│ id_upload (PK)      │      │ zoom_min            │
│ id_owner (FK)       │      │ zoom_max            │
│ filename            │      └─────────────────────┘
│ file_type           │
│ file_size           │      ┌─────────────────────┐
│ status              │      │ map_layer_category  │
│ parsed_result       │      ├─────────────────────┤
│ created_at          │      │ id_category (PK)    │
└─────────────────────┘      │ category_code       │
                             │ category_name       │
                             │ template_fields     │
                             │ icon_default        │
                             └─────────────────────┘
```

### 3.2 Table Definitions

#### `map_layer` - Metadata Layer
```sql
CREATE TABLE map_layer (
    id_layer UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID REFERENCES owners(id_owner) ON DELETE CASCADE,
    id_project UUID REFERENCES projects(id_project) ON DELETE SET NULL,
    
    -- Layer identity
    layer_name VARCHAR(255) NOT NULL,
    layer_code VARCHAR(100), -- NOT globally unique, unique per project via constraint
    layer_description TEXT,
    
    -- Layer classification
    layer_type VARCHAR(50) NOT NULL CHECK (layer_type IN ('core', 'operational', 'custom')),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('system', 'geojson', 'shp', 'kml', 'csv', 'api')),
    category_code VARCHAR(50), -- FK ke map_layer_category
    
    -- Geometry info
    geometry_type VARCHAR(50) CHECK (geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection')),
    srid INTEGER DEFAULT 4326,
    bbox JSONB, -- {minX, minY, maxX, maxY}
    feature_count INTEGER DEFAULT 0,
    
    -- Source reference
    source_table VARCHAR(255), -- untuk core layer, nama tabel sumber
    source_ref TEXT, -- untuk custom layer, referensi file/url
    
    -- Styling
    style_json JSONB DEFAULT '{}',
    
    -- Configuration
    config_json JSONB DEFAULT '{}',
    -- config_json example:
    -- {
    --   "labelField": "name",
    --   "idField": "external_id",
    --   "popupFields": ["name", "status", "diameter"],
    --   "zoomMin": 10,
    --   "zoomMax": 20,
    --   "clustering": true,
    --   "clusterDistance": 40
    -- }
    
    -- Visibility & Access
    is_visible_default BOOLEAN DEFAULT true,
    is_core BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false, -- prevent edit/delete
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_layer_per_project UNIQUE (id_project, layer_code)
);

-- Indexes
CREATE INDEX idx_map_layer_owner ON map_layer(id_owner);
CREATE INDEX idx_map_layer_project ON map_layer(id_project);
CREATE INDEX idx_map_layer_type ON map_layer(layer_type);
CREATE INDEX idx_map_layer_category ON map_layer(category_code);
```

#### `map_layer_feature` - Feature Data (Generik)
```sql
CREATE TABLE map_layer_feature (
    id_feature UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_layer UUID NOT NULL REFERENCES map_layer(id_layer) ON DELETE CASCADE,
    
    -- Geometry (PostGIS)
    geom GEOMETRY NOT NULL,
    
    -- Properties
    properties_json JSONB DEFAULT '{}',
    label VARCHAR(500),
    external_id VARCHAR(255), -- ID dari file asli
    
    -- Computed
    bbox BOX2D,
    centroid GEOMETRY(Point, 4326),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial Index
CREATE INDEX idx_map_layer_feature_geom ON map_layer_feature USING GIST(geom);
CREATE INDEX idx_map_layer_feature_layer ON map_layer_feature(id_layer);
CREATE INDEX idx_map_layer_feature_label ON map_layer_feature(label);
CREATE INDEX idx_map_layer_feature_external ON map_layer_feature(external_id);
CREATE INDEX idx_map_layer_feature_props ON map_layer_feature USING GIN(properties_json);
```

#### `spatial_upload_file` - Upload Tracking
```sql
CREATE TABLE spatial_upload_file (
    id_upload UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    id_project UUID REFERENCES projects(id_project) ON DELETE SET NULL,
    
    -- File info
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- geojson, shp, kml, csv
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN (
        'uploaded',      -- file tersimpan
        'parsing',       -- sedang di-parse
        'parsed',        -- parsing selesai, menunggu mapping
        'mapping',       -- user sedang mapping field
        'transforming',  -- sedang transform ke internal
        'completed',     -- berhasil jadi layer
        'failed'         -- gagal
    )),
    
    -- Parsed result (after parsing)
    parsed_result JSONB,
    -- Example:
    -- {
    --   "geometry_type": "Point",
    --   "feature_count": 150,
    --   "detected_crs": "EPSG:4326",
    --   "fields": [
    --     {"name": "nama", "type": "string", "sample": "Pipa Utama"},
    --     {"name": "diameter", "type": "number", "sample": 200}
    --   ],
    --   "bbox": [106.7, -6.3, 107.0, -6.1]
    -- }
    
    -- Error tracking
    error_message TEXT,
    error_detail JSONB,
    
    -- Result reference
    id_layer UUID REFERENCES map_layer(id_layer) ON DELETE SET NULL,
    
    -- Audit
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_spatial_upload_owner ON spatial_upload_file(id_owner);
CREATE INDEX idx_spatial_upload_status ON spatial_upload_file(status);
```

#### `map_layer_category` - Dynamic Layer Template
```sql
CREATE TABLE map_layer_category (
    id_category UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership (NULL = global/system category)
    id_owner UUID REFERENCES owners(id_owner) ON DELETE CASCADE,
    
    -- Identity
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Industry/Domain classification
    industry_code VARCHAR(50), -- 'water_utility', 'energy', 'manufacturing', 'agriculture', 'building'
    
    -- Parent category (for inheritance)
    parent_category_id UUID REFERENCES map_layer_category(id_category) ON DELETE SET NULL,
    
    -- Expected geometry types
    allowed_geometry_types VARCHAR(100)[] DEFAULT ARRAY['Point', 'LineString', 'Polygon'],
    
    -- Template fields (dynamic schema)
    template_fields JSONB DEFAULT '[]',
    -- Example:
    -- [
    --   {"name": "label", "type": "string", "required": true, "aliases": ["nama", "name", "nm"]},
    --   {"name": "diameter", "type": "number", "required": false, "aliases": ["dia", "ukuran", "size"], "unit": "mm"},
    --   {"name": "material", "type": "string", "required": false, "aliases": ["mat", "bahan"], "options": ["PVC", "HDPE", "Steel"]},
    --   {"name": "status", "type": "string", "required": false, "aliases": ["kondisi", "state"], "options": ["active", "inactive", "maintenance"]}
    -- ]
    
    -- Default styling
    default_style JSONB DEFAULT '{}',
    icon_default VARCHAR(100),
    color_default VARCHAR(20),
    
    -- Flags
    is_system BOOLEAN DEFAULT false,      -- true = system-defined, cannot delete
    is_operational BOOLEAN DEFAULT false, -- true = operational layer template
    is_active BOOLEAN DEFAULT true,       -- soft delete
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique per owner (or global if owner is NULL)
    CONSTRAINT unique_category_per_owner UNIQUE (id_owner, category_code)
);

-- Indexes
CREATE INDEX idx_category_owner ON map_layer_category(id_owner);
CREATE INDEX idx_category_industry ON map_layer_category(industry_code);
CREATE INDEX idx_category_parent ON map_layer_category(parent_category_id);

-- Seed data: System-level categories (global, available to all tenants)
-- Industry: water_utility (PDAM)
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style) VALUES
('pipe_network', 'Jaringan Pipa', 'water_utility', true, true, '[
    {"name": "label", "type": "string", "required": true, "aliases": ["nama", "name", "nm_pipa"]},
    {"name": "diameter", "type": "number", "required": false, "aliases": ["dia", "ukuran"], "unit": "mm"},
    {"name": "material", "type": "string", "required": false, "aliases": ["mat", "bahan"], "options": ["PVC", "HDPE", "GIP", "Steel", "AC"]},
    {"name": "status", "type": "string", "required": false, "aliases": ["kondisi"], "options": ["active", "inactive", "maintenance"]}
]', '{"stroke": "#2196F3", "strokeWidth": 3}'),
('valve', 'Valve', 'water_utility', true, true, '[
    {"name": "label", "type": "string", "required": true, "aliases": ["nama", "name"]},
    {"name": "type", "type": "string", "required": false, "aliases": ["jenis", "tipe"], "options": ["gate", "butterfly", "check", "pressure_reducing"]},
    {"name": "status", "type": "string", "required": false, "aliases": ["kondisi"], "options": ["open", "closed", "partial", "broken"]}
]', '{"icon": "valve", "color": "#FF9800"}'),
('hydrant', 'Hydrant', 'water_utility', true, true, '[
    {"name": "label", "type": "string", "required": true, "aliases": ["nama", "name"]},
    {"name": "type", "type": "string", "required": false, "aliases": ["jenis"], "options": ["pillar", "underground", "wall"]},
    {"name": "status", "type": "string", "required": false, "options": ["functional", "broken", "maintenance"]}
]', '{"icon": "hydrant", "color": "#F44336"}'),
('dma_boundary', 'DMA Boundary', 'water_utility', true, true, '[
    {"name": "label", "type": "string", "required": true, "aliases": ["nama", "zone_name"]},
    {"name": "zone_code", "type": "string", "required": false, "aliases": ["kode", "code"]},
    {"name": "population", "type": "number", "required": false}
]', '{"fill": "rgba(33, 150, 243, 0.2)", "stroke": "#2196F3"}'),
('reservoir', 'Reservoir', 'water_utility', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "capacity", "type": "number", "required": false, "aliases": ["kapasitas"], "unit": "m3"}
]', '{"icon": "reservoir", "color": "#00BCD4"}');

-- Industry: energy (PLN / Power Utility)
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style) VALUES
('transmission_line', 'Saluran Transmisi', 'energy', true, true, '[
    {"name": "label", "type": "string", "required": true, "aliases": ["nama", "name"]},
    {"name": "voltage", "type": "number", "required": false, "aliases": ["tegangan"], "unit": "kV"},
    {"name": "length", "type": "number", "required": false, "aliases": ["panjang"], "unit": "km"},
    {"name": "status", "type": "string", "required": false, "options": ["energized", "de-energized", "maintenance"]}
]', '{"stroke": "#FFC107", "strokeWidth": 3}'),
('substation', 'Gardu Induk', 'energy', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "capacity", "type": "number", "required": false, "unit": "MVA"},
    {"name": "status", "type": "string", "required": false, "options": ["online", "offline", "overload"]}
]', '{"icon": "substation", "color": "#FF5722"}'),
('transformer', 'Trafo', 'energy', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "capacity", "type": "number", "required": false, "unit": "kVA"},
    {"name": "type", "type": "string", "required": false, "options": ["distribution", "power", "instrument"]}
]', '{"icon": "transformer", "color": "#9C27B0"}');

-- Industry: manufacturing
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style) VALUES
('production_zone', 'Zona Produksi', 'manufacturing', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "capacity", "type": "number", "required": false},
    {"name": "shift_count", "type": "number", "required": false}
]', '{"fill": "rgba(156, 39, 176, 0.2)", "stroke": "#9C27B0"}'),
('warehouse', 'Gudang', 'manufacturing', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "capacity", "type": "number", "required": false, "unit": "m3"},
    {"name": "type", "type": "string", "required": false, "options": ["raw_material", "finished_goods", "cold_storage"]}
]', '{"fill": "rgba(96, 125, 139, 0.3)", "stroke": "#607D8B"}');

-- Industry: agriculture
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style) VALUES
('field_boundary', 'Batas Lahan', 'agriculture', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "area_ha", "type": "number", "required": false, "unit": "ha"},
    {"name": "crop_type", "type": "string", "required": false}
]', '{"fill": "rgba(76, 175, 80, 0.2)", "stroke": "#4CAF50"}'),
('irrigation_line', 'Saluran Irigasi', 'agriculture', true, true, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "flow_rate", "type": "number", "required": false, "unit": "l/s"},
    {"name": "status", "type": "string", "required": false, "options": ["flowing", "dry", "maintenance"]}
]', '{"stroke": "#03A9F4", "strokeWidth": 2, "lineDash": [5, 5]}');

-- Generic/Universal categories (available to all industries)
INSERT INTO map_layer_category (category_code, category_name, industry_code, is_system, is_operational, template_fields, default_style) VALUES
('custom_reference', 'Custom Reference', null, true, false, '[]', '{"fill": "rgba(158, 158, 158, 0.3)", "stroke": "#9E9E9E"}'),
('boundary', 'Boundary/Batas Wilayah', null, true, false, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "code", "type": "string", "required": false}
]', '{"fill": "rgba(158, 158, 158, 0.1)", "stroke": "#616161", "strokeWidth": 2}'),
('poi', 'Point of Interest', null, true, false, '[
    {"name": "label", "type": "string", "required": true},
    {"name": "type", "type": "string", "required": false},
    {"name": "description", "type": "string", "required": false}
]', '{"icon": "marker", "color": "#E91E63"}');
```

---

## 4. Upload Pipeline

### 4.1 Flow Diagram
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   UPLOAD    │───▶│    PARSE    │───▶│   PREVIEW   │───▶│   MAPPING   │
│    FILE     │    │   DETECT    │    │  STRUCTURE  │    │   FIELDS    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   PUBLISH   │◀───│  TRANSFORM  │◀───│  VALIDATE   │◀──────────┘
│   LAYER     │    │  NORMALIZE  │    │  GEOMETRY   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 4.2 Step Details

#### Step 1: Upload File
```typescript
// POST /api/spatial/upload
// Content-Type: multipart/form-data

interface UploadRequest {
  file: File;
  projectId?: string;
  description?: string;
}

interface UploadResponse {
  uploadId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'uploaded';
}
```

#### Step 2: Parse & Detect Format
```typescript
// POST /api/spatial/upload/:uploadId/parse

// System detects:
// - File format (GeoJSON, SHP, KML, CSV)
// - Geometry type (Point, LineString, Polygon)
// - CRS/SRID
// - Field list with types
// - Feature count
// - Bounding box

interface ParseResult {
  uploadId: string;
  status: 'parsed';
  geometryType: string;
  featureCount: number;
  detectedCrs: string;
  fields: FieldInfo[];
  sampleData: any[];
  bbox: [number, number, number, number];
}

interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  sample: any;
  uniqueValues?: any[]; // for categorical
  nullCount: number;
}
```

#### Step 3: Preview Structure
Frontend menampilkan:
- Geometry type dengan preview mini-map
- Daftar field dengan sample data
- Detected CRS
- Feature count
- Warning jika ada masalah

#### Step 4: Field Mapping
```typescript
// POST /api/spatial/upload/:uploadId/map

interface MappingRequest {
  layerName: string;
  layerCode?: string;
  categoryCode: string; // 'pipe_network', 'valve', 'custom_reference', etc.
  description?: string;
  
  fieldMapping: {
    label: string;        // field mana jadi label
    externalId?: string;  // field mana jadi ID
    [standardField: string]: string; // mapping ke template
  };
  
  // CRS override (jika auto-detect salah)
  sourceSrid?: number;
  targetSrid?: number; // default 4326
  
  // Initial style
  style?: {
    color?: string;
    strokeWidth?: number;
    icon?: string;
    fill?: string;
  };
}
```

#### Step 5: Transform & Normalize
System melakukan:
```typescript
// Backend process:
1. Read source features
2. Transform CRS jika perlu (SRID conversion)
3. Validate geometry (fix self-intersection, remove empty)
4. Map fields ke properties_json
5. Calculate bbox dan centroid
6. Insert ke map_layer_feature
7. Update layer metadata
```

#### Step 6: Publish Layer
```typescript
// POST /api/spatial/upload/:uploadId/publish

interface PublishResponse {
  layerId: string;
  layerName: string;
  featureCount: number;
  bbox: [number, number, number, number];
  status: 'completed';
}
```

### 4.3 Smart Field Mapper

Auto-detect field mapping berdasarkan nama:

```typescript
const FIELD_ALIASES: Record<string, string[]> = {
  label: ['nama', 'name', 'nm', 'nm_pipa', 'nama_jalan', 'label', 'title'],
  diameter: ['dia', 'diameter', 'ukuran', 'size', 'd'],
  material: ['mat', 'material', 'bahan', 'jenis_bahan'],
  status: ['status', 'kondisi', 'state', 'sts'],
  type: ['type', 'tipe', 'jenis', 'kategori'],
  depth: ['depth', 'kedalaman', 'dalam'],
  pressure: ['pressure', 'tekanan', 'psi', 'bar'],
  zone: ['zone', 'zona', 'wilayah', 'area'],
  code: ['code', 'kode', 'id', 'kd'],
};

function autoMapFields(sourceFields: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const [standardField, aliases] of Object.entries(FIELD_ALIASES)) {
    const matched = sourceFields.find(f => 
      aliases.some(alias => f.toLowerCase().includes(alias.toLowerCase()))
    );
    if (matched) {
      mapping[standardField] = matched;
    }
  }
  
  return mapping;
}
```

---

## 5. API Specification

### 5.1 Layer Management

#### Get Layers for Project
```
GET /api/spatial/projects/:projectId/layers
Query: ?type=core|operational|custom&visible=true

Response:
{
  "layers": [
    {
      "idLayer": "uuid",
      "layerName": "Sensor Nodes",
      "layerType": "core",
      "geometryType": "Point",
      "featureCount": 150,
      "isVisible": true,
      "style": {...}
    }
  ]
}
```

#### Get Layer Features (GeoJSON)
```
GET /api/spatial/layers/:layerId/features
Query: ?bbox=minX,minY,maxX,maxY&limit=1000

Response: GeoJSON FeatureCollection
```

#### Update Layer Style
```
PATCH /api/spatial/layers/:layerId/style
Body:
{
  "style": {
    "stroke": "#FF0000",
    "strokeWidth": 2,
    "fill": "rgba(255,0,0,0.3)",
    "icon": "sensor",
    "labelField": "name"
  }
}
```

#### Toggle Layer Visibility
```
PATCH /api/spatial/layers/:layerId/visibility
Body: { "isVisible": true }
```

### 5.2 Upload Endpoints

```
POST   /api/spatial/upload                    # Upload file
GET    /api/spatial/upload/:id                # Get upload status
POST   /api/spatial/upload/:id/parse          # Parse file
GET    /api/spatial/upload/:id/preview        # Get preview data
POST   /api/spatial/upload/:id/map            # Map fields
POST   /api/spatial/upload/:id/publish        # Publish as layer
DELETE /api/spatial/upload/:id                # Cancel/delete upload
```

### 5.3 Core Layer APIs (Realtime)

#### Sensor Layer
```
GET /api/spatial/core/sensors
Query: ?projectId=xxx&status=online|offline|warning

Response: GeoJSON with realtime values
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [106.8, -6.2] },
      "properties": {
        "idSensor": "uuid",
        "label": "Tekanan-001",
        "status": "online",
        "lastValue": 2.5,
        "unit": "bar",
        "lastSeen": "2026-03-07T15:30:00Z",
        "nodeCode": "HELIO-353691843831016"
      }
    }
  ]
}
```

#### Alert Layer
```
GET /api/spatial/core/alerts
Query: ?projectId=xxx&severity=critical|warning|info&active=true
```

### 5.4 Category Management APIs (Dynamic)

> **Categories are dynamic** - Tenants can create their own categories via these APIs.

#### List Categories
```
GET /api/spatial/categories
Query: ?industry=water_utility|energy|manufacturing|agriculture&includeSystem=true

Response:
{
  "categories": [
    {
      "idCategory": "uuid",
      "categoryCode": "pipe_network",
      "categoryName": "Jaringan Pipa",
      "industryCode": "water_utility",
      "isSystem": true,
      "isOperational": true,
      "allowedGeometryTypes": ["LineString", "MultiLineString"],
      "templateFields": [...],
      "defaultStyle": {...}
    }
  ]
}
```

#### Get Category by ID
```
GET /api/spatial/categories/:id

Response: Single category object with full details
```

#### Create Custom Category
```
POST /api/spatial/categories
Body:
{
  "categoryCode": "custom_pipeline",
  "categoryName": "Custom Pipeline",
  "industryCode": "water_utility",  // optional
  "allowedGeometryTypes": ["LineString"],
  "templateFields": [
    {"name": "label", "type": "string", "required": true, "aliases": ["nama"]},
    {"name": "diameter", "type": "number", "required": false, "unit": "mm"},
    {"name": "custom_field", "type": "string", "required": false}
  ],
  "defaultStyle": {
    "stroke": "#4CAF50",
    "strokeWidth": 3
  }
}

Response: Created category object
```

#### Update Category
```
PATCH /api/spatial/categories/:id
Body:
{
  "categoryName": "Updated Name",
  "templateFields": [...],
  "defaultStyle": {...}
}

Note: Cannot update system categories (is_system = true)
```

#### Delete Category
```
DELETE /api/spatial/categories/:id

Note: 
- Cannot delete system categories
- Cannot delete if layers are using this category
```

#### Clone System Category
```
POST /api/spatial/categories/:id/clone
Body:
{
  "newCategoryCode": "my_pipe_network",
  "newCategoryName": "My Custom Pipe Network"
}

Use case: Create custom version of system category with additional fields
```

### 5.5 Industry Codes Reference

| Code | Name | Description |
|------|------|-------------|
| `water_utility` | Water/PDAM | Perusahaan air minum |
| `energy` | Energy/PLN | Kelistrikan dan energi |
| `manufacturing` | Manufacturing | Pabrik dan industri |
| `agriculture` | Agriculture | Pertanian dan perkebunan |
| `building` | Smart Building | Gedung dan fasilitas |
| `logistics` | Logistics | Transportasi dan logistik |
| `oil_gas` | Oil & Gas | Minyak dan gas |
| `telecom` | Telecommunications | Telekomunikasi |
| `general` | General | Umum / tidak spesifik |

---

## 6. Frontend Integration (OpenLayers + Angular)

### 6.1 Component Structure
```
map-page/
├── map-page.component.ts
├── map-page.component.html
├── map-page.component.scss
├── services/
│   ├── map.service.ts           # OpenLayers map management
│   ├── layer.service.ts         # Layer CRUD operations
│   └── upload.service.ts        # File upload handling
├── components/
│   ├── map-container/           # Main map container
│   ├── layer-panel/             # Layer switcher sidebar
│   ├── layer-upload-modal/      # Upload wizard
│   ├── field-mapper/            # Field mapping UI
│   ├── style-editor/            # Layer style editor
│   ├── feature-popup/           # Feature info popup
│   └── legend/                  # Map legend
└── models/
    └── map.models.ts            # Interfaces
```

### 6.2 Map Service
```typescript
@Injectable({ providedIn: 'root' })
export class MapService {
  private map: Map;
  private layers: Map<string, VectorLayer<VectorSource>> = new Map();
  
  initMap(target: string, center: [number, number], zoom: number): void {
    this.map = new Map({
      target,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat(center),
        zoom
      })
    });
  }
  
  addGeoJSONLayer(layerId: string, geojson: any, style: Style): void {
    const source = new VectorSource({
      features: new GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
    
    const layer = new VectorLayer({
      source,
      style
    });
    
    layer.set('layerId', layerId);
    this.layers.set(layerId, layer);
    this.map.addLayer(layer);
  }
  
  toggleLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setVisible(visible);
    }
  }
  
  updateLayerStyle(layerId: string, style: Style): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setStyle(style);
    }
  }
  
  fitToLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      const extent = layer.getSource()?.getExtent();
      if (extent) {
        this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
      }
    }
  }
}
```

### 6.3 Layer Style Builder
```typescript
// Convert style_json to OpenLayers Style
function buildStyle(styleJson: any, geometryType: string): Style {
  switch (geometryType) {
    case 'Point':
      return new Style({
        image: new Circle({
          radius: styleJson.radius || 6,
          fill: new Fill({ color: styleJson.fill || '#3388ff' }),
          stroke: new Stroke({
            color: styleJson.stroke || '#fff',
            width: styleJson.strokeWidth || 2
          })
        }),
        text: styleJson.labelField ? new Text({
          text: '', // set per feature
          font: '12px sans-serif',
          fill: new Fill({ color: '#333' }),
          stroke: new Stroke({ color: '#fff', width: 2 })
        }) : undefined
      });
      
    case 'LineString':
      return new Style({
        stroke: new Stroke({
          color: styleJson.stroke || '#3388ff',
          width: styleJson.strokeWidth || 3,
          lineDash: styleJson.lineDash
        })
      });
      
    case 'Polygon':
      return new Style({
        fill: new Fill({
          color: styleJson.fill || 'rgba(51, 136, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: styleJson.stroke || '#3388ff',
          width: styleJson.strokeWidth || 2
        })
      });
  }
}

// Dynamic style function (for status-based coloring)
function createDynamicStyleFunction(styleJson: any, statusField: string): StyleFunction {
  const statusColors = {
    online: '#4CAF50',
    offline: '#F44336',
    warning: '#FF9800',
    degraded: '#FFC107'
  };
  
  return (feature: Feature) => {
    const status = feature.get(statusField);
    const color = statusColors[status] || '#9E9E9E';
    
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#fff', width: 2 })
      })
    });
  };
}
```

### 6.4 Realtime Layer Updates
```typescript
// For core layers with realtime data
@Injectable()
export class RealtimeLayerService {
  private updateInterval$ = interval(30000); // 30 seconds
  
  startRealtimeUpdates(layerId: string, apiEndpoint: string): Subscription {
    return this.updateInterval$.pipe(
      switchMap(() => this.http.get<GeoJSON>(apiEndpoint)),
      tap(geojson => this.mapService.updateLayerData(layerId, geojson))
    ).subscribe();
  }
  
  // Or use WebSocket for truly realtime
  connectWebSocket(projectId: string): Observable<any> {
    return webSocket(`wss://api/spatial/realtime?projectId=${projectId}`);
  }
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Basic map display with core layers

**Tasks:**
- [ ] Setup PostGIS tables (map_layer, map_layer_feature)
- [ ] NestJS module: SpatialModule
- [ ] Basic map-page component with OpenLayers
- [ ] Core layer: Sensor display from existing nodes
- [ ] Core layer: Node display with status
- [ ] Basic layer panel (show/hide layers)

**Deliverables:**
- Map page showing sensors/nodes from project
- Layer toggle functionality

### Phase 2: Upload Pipeline (Week 3-4)
**Goal:** User can upload spatial files

**Tasks:**
- [ ] File upload endpoint with validation
- [ ] GeoJSON parser
- [ ] Shapefile parser (using gdal/ogr2ogr CLI)
- [ ] KML parser
- [ ] CSV parser (lat/lon detection)
- [ ] Parse result storage
- [ ] Upload status tracking

**Deliverables:**
- Upload API working for all formats
- Parse results stored in database

### Phase 3: Mapping & Transform (Week 5-6)
**Goal:** User can map fields and publish layer

**Tasks:**
- [ ] Field preview UI
- [ ] Smart field mapper (auto-detect)
- [ ] Category selection
- [ ] CRS transformation
- [ ] Geometry validation
- [ ] Feature insertion to PostGIS
- [ ] Layer publishing

**Deliverables:**
- Complete upload wizard UI
- Published layers visible on map

### Phase 4: Layer Management (Week 7-8)
**Goal:** Full layer CRUD and styling

**Tasks:**
- [ ] Layer list in sidebar
- [ ] Layer reordering
- [ ] Style editor UI
- [ ] Legend generation
- [ ] Feature popup with properties
- [ ] Layer delete/rename
- [ ] Visibility by zoom level

**Deliverables:**
- Complete layer management UI
- Professional map experience

### Phase 5: Advanced Features (Week 9-10)
**Goal:** Production-ready features

**Tasks:**
- [ ] Realtime layer updates (WebSocket)
- [ ] Alert/anomaly layer
- [ ] Clustering for large datasets
- [ ] Layer versioning
- [ ] Export layer (download GeoJSON)
- [ ] Print/export map image
- [ ] Performance optimization

**Deliverables:**
- Production-ready WebGIS module

---

## 8. Technical Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | NestJS |
| Database | PostgreSQL + PostGIS |
| File Storage | Local / S3 |
| Spatial Parser | gdal/ogr2ogr (CLI), GeoJSON native |
| CRS Transform | PostGIS ST_Transform |
| Geometry Validation | PostGIS ST_IsValid, ST_MakeValid |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | Angular 15+ |
| Map Library | OpenLayers 7+ |
| UI Components | Bootstrap 5 + Custom |
| State | Component state + Service |

### Dependencies
```json
// Frontend (package.json)
{
  "ol": "^7.5.0",
  "ol-ext": "^4.0.0" // optional, for extra controls
}

// Backend (package.json)  
{
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.0",
  "pg": "^8.0.0",
  "multer": "^1.4.0", // file upload
  "geojson": "^0.5.0",
  "turf": "^6.5.0" // optional, for spatial operations
}
```

---

## 9. Security Considerations

### Multi-tenant Isolation
```typescript
// All layer queries MUST include owner/project filter
@Injectable()
export class LayerService {
  async findLayers(ownerId: string, projectId: string): Promise<MapLayer[]> {
    return this.layerRepo.find({
      where: [
        { idOwner: ownerId, idProject: projectId },
        { isCore: true } // Core layers visible to all
      ]
    });
  }
}
```

### File Upload Security
- Max file size: 50MB
- Allowed extensions: .geojson, .json, .zip, .kml, .kmz, .csv
- Virus scan (optional)
- Sanitize filenames
- Store outside web root

### API Rate Limiting
- Upload: 10 per hour per user
- Feature query: 100 per minute
- Heavy operations: queue-based

---

## 10. Future Enhancements

### Potential Features
- [ ] Drawing tools (create features on map)
- [ ] Spatial analysis (buffer, intersection)
- [ ] Routing (shortest path)
- [ ] Heatmap visualization
- [ ] Time-series animation
- [ ] 3D buildings
- [ ] Offline support (vector tiles)
- [ ] Mobile-optimized view
- [ ] Collaboration (shared editing)
- [ ] Version history with diff

### Integration Points
- [ ] Widget Builder: Map widget type
- [ ] Alerts: Spatial alert zones
- [ ] Dashboard: Mini-map widgets
- [ ] Reports: Map snapshots
- [ ] AI: Anomaly location clustering

---

## Appendix A: Core Layer SQL Examples

### Sensor Layer Query
```sql
-- Get sensors for map with latest values
-- NOTE: Sensors inherit location from Node (no geometry column on sensor)
SELECT 
    s.id_sensor,
    s.label,
    -- Generate geometry from Node's lat/lon
    ST_SetSRID(ST_MakePoint(n.longitude, n.latitude), 4326) as geom,
    n.address as node_address,
    n.code as node_code,
    n.latitude,
    n.longitude,
    CASE 
        WHEN n.last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN n.last_seen_at > NOW() - INTERVAL '1 hour' THEN 'degraded'
        ELSE 'offline'
    END as status,
    n.connectivity_status,
    n.last_seen_at
FROM sensors s
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = $1
  AND n.latitude IS NOT NULL 
  AND n.longitude IS NOT NULL;
```

### Node Layer Query
```sql
-- Get nodes for map with connectivity status
SELECT 
    n.id_node,
    n.code,
    n.name,
    n.address,
    ST_SetSRID(ST_MakePoint(n.longitude, n.latitude), 4326) as geom,
    n.latitude,
    n.longitude,
    n.connectivity_status as status,
    n.last_seen_at,
    n.status as node_status,
    (SELECT COUNT(*) FROM sensors s WHERE s.id_node = n.id_node) as sensor_count
FROM nodes n
WHERE n.id_project = $1
  AND n.latitude IS NOT NULL 
  AND n.longitude IS NOT NULL;
```

### Alert Layer Query
```sql
-- Get active alerts with locations
SELECT 
    a.id_alert,
    a.severity,
    a.message,
    a.detected_at,
    s.label as sensor_label,
    ST_SetSRID(ST_MakePoint(n.longitude, n.latitude), 4326) as geom
FROM alerts a
JOIN sensors s ON a.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = $1
  AND a.is_active = true
  AND a.resolved_at IS NULL;
```

---

## Appendix B: Style JSON Schema

```typescript
interface LayerStyle {
  // Point styles
  icon?: string;          // Icon name from icon set
  iconUrl?: string;       // Custom icon URL
  radius?: number;        // Circle radius (default: 6)
  
  // Stroke (line/polygon border)
  stroke?: string;        // Color hex
  strokeWidth?: number;   // Width in pixels
  lineDash?: number[];    // Dash pattern [4, 4]
  
  // Fill (polygon/circle fill)
  fill?: string;          // Color with alpha
  
  // Label
  labelField?: string;    // Field name for label
  labelFont?: string;     // Font spec
  labelColor?: string;
  labelOffset?: [number, number];
  
  // Clustering
  clustering?: boolean;
  clusterDistance?: number;
  
  // Zoom visibility
  zoomMin?: number;
  zoomMax?: number;
  
  // Thematic (status-based coloring)
  thematic?: {
    field: string;
    mapping: Record<string, string>; // value -> color
  };
}
```

---

## Appendix C: TypeORM Entity Definitions

### MapLayer Entity
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { MapLayerFeature } from './map-layer-feature.entity';

export enum LayerType {
  CORE = 'core',
  OPERATIONAL = 'operational',
  CUSTOM = 'custom',
}

export enum SourceType {
  SYSTEM = 'system',
  GEOJSON = 'geojson',
  SHP = 'shp',
  KML = 'kml',
  CSV = 'csv',
  API = 'api',
}

@Entity('map_layer')
@Index(['idProject', 'layerCode'], { unique: true })
export class MapLayer {
  @PrimaryGeneratedColumn('uuid', { name: 'id_layer' })
  idLayer: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'varchar', length: 255, name: 'layer_name' })
  layerName: string;

  @Column({ type: 'varchar', length: 100, name: 'layer_code', nullable: true })
  layerCode: string;

  @Column({ type: 'text', name: 'layer_description', nullable: true })
  layerDescription: string;

  @Column({ type: 'enum', enum: LayerType, name: 'layer_type' })
  layerType: LayerType;

  @Column({ type: 'enum', enum: SourceType, name: 'source_type' })
  sourceType: SourceType;

  @Column({ type: 'varchar', length: 50, name: 'category_code', nullable: true })
  categoryCode: string;

  @Column({ type: 'varchar', length: 50, name: 'geometry_type', nullable: true })
  geometryType: string;

  @Column({ type: 'integer', default: 4326 })
  srid: number;

  @Column({ type: 'jsonb', nullable: true })
  bbox: { minX: number; minY: number; maxX: number; maxY: number };

  @Column({ type: 'integer', name: 'feature_count', default: 0 })
  featureCount: number;

  @Column({ type: 'varchar', length: 255, name: 'source_table', nullable: true })
  sourceTable: string;

  @Column({ type: 'text', name: 'source_ref', nullable: true })
  sourceRef: string;

  @Column({ type: 'jsonb', name: 'style_json', default: {} })
  styleJson: Record<string, any>;

  @Column({ type: 'jsonb', name: 'config_json', default: {} })
  configJson: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_visible_default', default: true })
  isVisibleDefault: boolean;

  @Column({ type: 'boolean', name: 'is_core', default: false })
  isCore: boolean;

  @Column({ type: 'boolean', name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => MapLayerFeature, (feature) => feature.layer)
  features: MapLayerFeature[];
}
```

### MapLayerFeature Entity
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MapLayer } from './map-layer.entity';

@Entity('map_layer_feature')
@Index(['idLayer'])
export class MapLayerFeature {
  @PrimaryGeneratedColumn('uuid', { name: 'id_feature' })
  idFeature: string;

  @Column({ type: 'uuid', name: 'id_layer' })
  idLayer: string;

  // Note: PostGIS geometry type - requires special handling in TypeORM
  // Use raw query for spatial operations
  @Column({ type: 'geometry', spatialFeatureType: 'Geometry', srid: 4326, nullable: false })
  geom: any;

  @Column({ type: 'jsonb', name: 'properties_json', default: {} })
  propertiesJson: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  label: string;

  @Column({ type: 'varchar', length: 255, name: 'external_id', nullable: true })
  externalId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => MapLayer, (layer) => layer.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_layer' })
  layer: MapLayer;
}
```

### MapLayerCategory Entity
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';

@Entity('map_layer_category')
@Index(['idOwner', 'categoryCode'], { unique: true })
export class MapLayerCategory {
  @PrimaryGeneratedColumn('uuid', { name: 'id_category' })
  idCategory: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'varchar', length: 50, name: 'category_code' })
  categoryCode: string;

  @Column({ type: 'varchar', length: 255, name: 'category_name' })
  categoryName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, name: 'industry_code', nullable: true })
  industryCode: string;

  @Column({ type: 'uuid', name: 'parent_category_id', nullable: true })
  parentCategoryId: string;

  @Column({ type: 'varchar', array: true, name: 'allowed_geometry_types', default: ['Point', 'LineString', 'Polygon'] })
  allowedGeometryTypes: string[];

  @Column({ type: 'jsonb', name: 'template_fields', default: [] })
  templateFields: TemplateField[];

  @Column({ type: 'jsonb', name: 'default_style', default: {} })
  defaultStyle: Record<string, any>;

  @Column({ type: 'varchar', length: 100, name: 'icon_default', nullable: true })
  iconDefault: string;

  @Column({ type: 'varchar', length: 20, name: 'color_default', nullable: true })
  colorDefault: string;

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', name: 'is_operational', default: false })
  isOperational: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => MapLayerCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory: MapLayerCategory;
}

interface TemplateField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  aliases?: string[];
  unit?: string;
  options?: string[];
}
```

### SpatialUploadFile Entity
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { MapLayer } from './map-layer.entity';

export enum UploadStatus {
  UPLOADED = 'uploaded',
  PARSING = 'parsing',
  PARSED = 'parsed',
  MAPPING = 'mapping',
  TRANSFORMING = 'transforming',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('spatial_upload_file')
@Index(['idOwner'])
@Index(['status'])
export class SpatialUploadFile {
  @PrimaryGeneratedColumn('uuid', { name: 'id_upload' })
  idUpload: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'varchar', length: 500, name: 'original_filename' })
  originalFilename: string;

  @Column({ type: 'varchar', length: 500, name: 'stored_filename' })
  storedFilename: string;

  @Column({ type: 'text', name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 50, name: 'file_type' })
  fileType: string;

  @Column({ type: 'bigint', name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ type: 'enum', enum: UploadStatus, default: UploadStatus.UPLOADED })
  status: UploadStatus;

  @Column({ type: 'jsonb', name: 'parsed_result', nullable: true })
  parsedResult: ParsedResult;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', name: 'error_detail', nullable: true })
  errorDetail: Record<string, any>;

  @Column({ type: 'uuid', name: 'id_layer', nullable: true })
  idLayer: string;

  @Column({ type: 'uuid', name: 'uploaded_by', nullable: true })
  uploadedBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => MapLayer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_layer' })
  layer: MapLayer;
}

interface ParsedResult {
  geometryType: string;
  featureCount: number;
  detectedCrs: string;
  fields: { name: string; type: string; sample: any; nullCount: number }[];
  bbox: [number, number, number, number];
  warnings?: string[];
}
```

---

## Appendix D: Prerequisites & Dependencies

### PostgreSQL Requirements
```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For uuid_generate_v4() if PostgreSQL < 13
CREATE EXTENSION IF NOT EXISTS "postgis";    -- For geometry types and spatial functions

-- Verify PostGIS
SELECT PostGIS_Version();
-- Should return: 3.x.x or higher
```

### Required PostgreSQL Version
- **Minimum:** PostgreSQL 12 with PostGIS 3.0
- **Recommended:** PostgreSQL 14+ with PostGIS 3.3+

### Backend Dependencies (package.json)
```json
{
  "dependencies": {
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "multer": "^1.4.5-lts.1",
    "@turf/turf": "^6.5.0",
    "geojson": "^0.5.0"
  },
  "optionalDependencies": {
    "gdal-async": "^3.7.0"
  }
}
```

### System Dependencies (for Shapefile parsing)
```bash
# macOS
brew install gdal

# Ubuntu/Debian
sudo apt-get install gdal-bin libgdal-dev

# Verify
ogr2ogr --version
```

---

**End of Document**---

**End of Document**
