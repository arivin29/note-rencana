# Node Profiling & Unpaired Devices Implementation

**Date**: November 17, 2025
**Status**: ✅ **SCHEMA & ENTITIES COMPLETE**
**Next**: DTOs, Services, Controllers

---

## 🎯 **Overview**

Implementasi sistem untuk:
1. **Node Profiles** - Mapping & parser configuration per device type
2. **Unpaired Devices** - Auto-detect new devices before registration

---

## 📊 **Database Schema**

### 1. `node_profiles` Table

**Purpose**: Menyimpan konfigurasi parsing dan mapping payload → sensor channels

```sql
CREATE TABLE node_profiles (
  id_node_profile UUID PRIMARY KEY,
  id_node_model   UUID NOT NULL REFERENCES node_models ON DELETE CASCADE,
  id_project      UUID REFERENCES projects,  -- NULL = global profile
  code            TEXT NOT NULL,              -- 'fmb130-default', 'esp32-water-v1'
  name            TEXT NOT NULL,
  description     TEXT,
  parser_type     TEXT NOT NULL,              -- 'json_path', 'teltonika_codec_8', etc.
  mapping_json    JSONB NOT NULL,             -- payload mapping definition
  transform_script TEXT,                      -- optional custom script
  enabled         BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_node_profile_per_model_code UNIQUE (id_node_model, code)
);
```

**Indexes**:
- Unique: `(id_node_model, code)`
- Foreign keys: `node_models`, `projects`

**Added to `nodes` table**:
```sql
ALTER TABLE nodes ADD COLUMN id_node_profile UUID REFERENCES node_profiles;
CREATE INDEX idx_nodes_node_profile ON nodes(id_node_profile);
```

---

### 2. `node_unpaired_devices` Table

**Purpose**: Track devices yang sudah kirim data tapi belum di-register sebagai node

```sql
CREATE TABLE node_unpaired_devices (
  id_node_unpaired_device UUID PRIMARY KEY,
  hardware_id             TEXT NOT NULL UNIQUE,  -- IMEI / dev_eui / MAC / serial
  id_node_model           UUID REFERENCES node_models,
  first_seen_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_payload            JSONB,                  -- last received payload
  last_topic              TEXT,                   -- MQTT topic
  seen_count              INTEGER DEFAULT 1,
  suggested_project       UUID REFERENCES projects,
  suggested_owner         UUID REFERENCES owners,
  paired_node_id          UUID REFERENCES nodes,
  status                  TEXT DEFAULT 'pending'  -- 'pending' | 'paired' | 'ignored'
);
```

**Indexes**:
- Unique: `hardware_id`
- Index: `status`, `last_seen_at`
- Foreign keys: `node_models`, `projects`, `owners`, `nodes`

---

## 📝 **mapping_json Structure**

### Example Format

```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": "$.ts",
  "channels": [
    {
      "metric_code": "pressure",
      "source_path": "$.data.pressure",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "bar"
    },
    {
      "metric_code": "flow",
      "source_path": "$.data.flow",
      "multiplier": 1,
      "offset": 0,
      "unit": "lps"
    },
    {
      "metric_code": "battery",
      "source_path": "$.data.battery",
      "multiplier": 1,
      "offset": 0,
      "unit": "V"
    }
  ]
}
```

### TypeScript Interface

```typescript
export interface ChannelMapping {
  metric_code: string;
  source_path: string;
  multiplier?: number;
  offset?: number;
  unit?: string;
}

export interface MappingJson {
  version: number;
  payload_format: string;
  timestamp_path?: string;
  channels: ChannelMapping[];
}
```

---

## 🔄 **Data Flow**

### Ingest Flow (MQTT → Database)

```
1. MQTT Message arrives
   ↓
2. Extract hardware_id (IMEI/dev_eui/serial)
   ↓
3. Check nodes table by hardware_id
   ├─ FOUND → Paired Device
   │  ├─ Get id_node_profile
   │  ├─ Get parser_type + mapping_json
   │  ├─ Parse payload using mapping
   │  └─ Insert to sensor_logs
   │
   └─ NOT FOUND → Unpaired Device
      ├─ INSERT/UPDATE node_unpaired_devices
      ├─ Update last_seen_at, last_payload, seen_count
      └─ Do NOT insert to sensor_logs yet
```

### Pairing Flow (Admin UI)

```
1. Admin opens "Pending Devices" page
   ↓
2. See list from node_unpaired_devices WHERE status='pending'
   ↓
3. Admin selects unpaired device
   ├─ Choose owner
   ├─ Choose project
   ├─ Choose node_model
   ├─ Choose/create node_profile
   ↓
4. Backend creates new node record
   ├─ nodes.dev_eui = unpaired.hardware_id
   ├─ nodes.id_node_profile = selected profile
   ├─ nodes.id_project = selected project
   ↓
5. Update node_unpaired_devices
   ├─ status = 'paired'
   ├─ paired_node_id = new node.id_node
   ↓
6. Future messages from this device → treated as paired
```

---

## 🗂️ **Files Created**

### Migrations
- ✅ `migrations/1700200000000-CreateNodeProfilesTable.ts`
- ✅ `migrations/1700200000001-CreateNodeUnpairedDevicesTable.ts`

### Entities
- ✅ `src/entities/node-profile.entity.ts`
- ✅ `src/entities/node-unpaired-device.entity.ts`
- ✅ `src/entities/node.entity.ts` (updated)

### To Be Created
- 🔄 DTOs (create, update, response)
- 🔄 Services
- 🔄 Controllers
- 🔄 Module definitions

---

## 🚀 **Next Steps**

### 1. Run Migrations

```bash
cd iot-backend
npm run migration:run
```

### 2. Create Modules

Need to create:
- `src/modules/node-profiles/` (module, service, controller, DTOs)
- `src/modules/node-unpaired-devices/` (module, service, controller, DTOs)

### 3. MQTT Ingestion Logic

Update MQTT handler to:
1. Extract `hardware_id` from payload
2. Check if device exists in `nodes` table
3. If paired: Parse and save to `sensor_logs`
4. If unpaired: Save to `node_unpaired_devices`

### 4. Admin UI Pages

**Node Profiles Management**:
- `/admin/node-profiles` - List all profiles
- `/admin/node-profiles/create` - Create new profile
- `/admin/node-profiles/:id/edit` - Edit profile & mapping

**Unpaired Devices**:
- `/admin/devices/pending` - List unpaired devices
- `/admin/devices/pending/:id/pair` - Pair device wizard

---

## 📖 **Usage Examples**

### Create Node Profile

```typescript
POST /api/node-profiles
{
  "idNodeModel": "uuid-of-fmb130-model",
  "code": "fmb130-water-meter-v1",
  "name": "FMB130 Water Meter Profile v1",
  "parserType": "teltonika_codec_8",
  "mappingJson": {
    "version": 1,
    "payload_format": "codec_8",
    "channels": [
      {
        "metric_code": "pressure",
        "source_path": "$.io.ain1",
        "multiplier": 0.1,
        "unit": "bar"
      }
    ]
  }
}
```

### List Unpaired Devices

```typescript
GET /api/node-unpaired-devices?status=pending&limit=20
Response:
{
  "data": [
    {
      "idNodeUnpairedDevice": "uuid",
      "hardwareId": "352093085332777",
      "idNodeModel": "uuid-fmb130",
      "firstSeenAt": "2025-11-17T10:00:00Z",
      "lastSeenAt": "2025-11-17T12:30:00Z",
      "seenCount": 45,
      "lastPayload": { ... },
      "lastTopic": "teltonika/352093085332777/data",
      "status": "pending"
    }
  ]
}
```

### Pair Device

```typescript
POST /api/node-unpaired-devices/:id/pair
{
  "idProject": "uuid-of-project",
  "idOwner": "uuid-of-owner",
  "idNodeModel": "uuid-of-model",
  "idNodeProfile": "uuid-of-profile",
  "nodeCode": "NODE-WM-001",
  "location": "Gate A Pump Station"
}
```

---

## 🔧 **Parser Types Supported**

### 1. `json_path`
- Simple JSON payload
- Uses JSONPath expressions
- Example: `$.data.temperature`

### 2. `teltonika_codec_8`
- Teltonika FMB devices
- Binary Codec 8 format
- Specialized parser

### 3. `custom_script`
- JavaScript/TypeScript transformation
- Stored in `transform_script` column
- Maximum flexibility

### 4. Future: `lorawan_cayenne_lpp`
- LoRaWAN Cayenne Low Power Payload
- Standard format

---

## ⚠️ **Important Notes**

### Security Considerations
1. **No credentials in node_profiles** - All sensitive data dalam environment variables
2. **Validate mapping_json** - Schema validation untuk prevent injection
3. **Rate limiting** - Untuk unpaired devices endpoint (prevent spam)

### Performance Tips
1. **Index hardware_id** - Fast lookup untuk MQTT ingestion
2. **Cache profiles** - Profile jarang berubah, cache di memory
3. **Batch updates** - Update `last_seen_at` secara batch (setiap 5 menit)

### Data Retention
- **Unpaired devices**: Auto-delete setelah 30 hari inactive (configurable)
- **Paired devices**: Move to nodes, keep history in `node_unpaired_devices`

---

## 📞 **Support & Documentation**

**Schema Diagram**: See `docs/database-schema.png`
**API Docs**: Swagger at `/api-docs`
**Testing**: Run `npm run test:e2e`

---

**Status**: ✅ Ready for Module Implementation
**Last Updated**: November 17, 2025
