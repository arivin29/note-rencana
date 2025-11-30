# Node Profile Builder - Implementation Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend API Specification](#backend-api-specification)
5. [Frontend Component Structure](#frontend-component-structure)
6. [UI/UX Design](#uiux-design)
7. [Data Flow](#data-flow)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)

---

## 1. Overview

### Purpose
Node Profile Builder adalah sistem untuk membuat template mapping (profile) yang reusable, untuk memetakan raw JSON payload dari IoT devices ke database structure (Node → Sensors → Channels).

### Key Features
- ✅ **Full-page wizard** (4 steps, bukan dialog)
- ✅ **Visual drag-drop mapping** (payload fields → channels)
- ✅ **Auto-detection** (smart field recognition)
- ✅ **Multi-sample testing** (validate dengan multiple payloads)
- ✅ **Reusable profiles** (1 profile untuk banyak nodes)
- ✅ **JSON-only** (simplified, no binary/hex parsing)

### User Flow
```
Unpaired Device Detail Page
  → Select raw log samples (1-5 samples)
  → Click "Create Profile & Pair"
  → Redirect to Profile Builder (full page)
  → Step 1: Profile Information
  → Step 2: Sample Selection & Preview
  → Step 3: Visual Drag-Drop Mapping
  → Step 4: Review & Save
  → Profile saved + Device paired
  → Redirect to Node detail page
```

---

## 2. Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Unpaired Devices Module                                        │
│  ├─ unpaired-devices-list/      (Already done ✅)               │
│  ├─ unpaired-device-detail/     (Already done ✅)               │
│  └─ pairing-dialog/              (Old, will be replaced)        │
│                                                                  │
│  Node Profiles Module (NEW!)                                    │
│  ├─ node-profiles-list/          (List all profiles)            │
│  ├─ profile-builder/             (Main feature - wizard)        │
│  │   ├─ step1-info/              (Profile information)          │
│  │   ├─ step2-samples/           (Sample selection)             │
│  │   ├─ step3-mapping/           (Drag-drop mapping) 🎯         │
│  │   │   ├─ payload-tree/        (Left panel - draggable)       │
│  │   │   ├─ db-structure/        (Right panel - droppable)      │
│  │   │   └─ channel-config/      (Config dialog)                │
│  │   └─ step4-review/            (Review & save)                │
│  └─ profile-detail/              (View profile detail)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP (SDK)
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Raw Sensor Logs Module (NEW!)                                  │
│  ├─ raw-sensor-logs.entity.ts                                   │
│  ├─ raw-sensor-logs.service.ts                                  │
│  ├─ raw-sensor-logs.controller.ts                               │
│  └─ dto/                                                         │
│                                                                  │
│  Node Profiles Module (NEW!)                                    │
│  ├─ node-profiles.entity.ts     (Already exists ✅)             │
│  ├─ node-profiles.service.ts                                    │
│  ├─ node-profiles.controller.ts                                 │
│  ├─ parser.service.ts            (JSON parsing logic)           │
│  └─ dto/                                                         │
│                                                                  │
│  Unpaired Devices Module (ENHANCE)                              │
│  └─ Add: pairWithProfile endpoint                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  raw_sensor_logs (NEW!)          - Raw MQTT payload history     │
│  node_profiles (EXISTS ✅)        - Mapping templates            │
│  node_unpaired_devices           - Unpaired devices queue       │
│  nodes                           - Paired nodes                 │
│  sensors                         - Sensors per node             │
│  sensor_channels                 - Channels per sensor          │
│  sensor_logs                     - Parsed telemetry data        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Table: `raw_sensor_logs` (NEW!)

**Purpose**: Store semua raw payloads dari MQTT untuk history & sampling

```sql
CREATE TABLE raw_sensor_logs (
  id_raw_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Device identification
  hardware_id TEXT NOT NULL,
  topic TEXT NOT NULL,

  -- Payload
  payload JSONB NOT NULL,
  payload_size INTEGER,

  -- Metadata
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  id_sensor_log UUID,  -- Link to parsed log
  parse_error TEXT,

  -- Indexes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raw_logs_hardware_id ON raw_sensor_logs(hardware_id);
CREATE INDEX idx_raw_logs_received_at ON raw_sensor_logs(received_at DESC);
CREATE INDEX idx_raw_logs_processed ON raw_sensor_logs(processed);

-- Auto-cleanup old data (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_raw_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM raw_sensor_logs
  WHERE received_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (optional - via cron job)
-- SELECT cleanup_old_raw_logs();
```

**Sample Data**:
```json
{
  "id_raw_log": "uuid-123",
  "hardware_id": "867584050123456",
  "topic": "devices/lora/867584050123456/up",
  "payload": {
    "sn": "867584050123456",
    "temperature": 25.5,
    "humidity": 60.2,
    "battery": 85,
    "signal": -75,
    "timestamp": "2025-11-18T10:30:00Z"
  },
  "payload_size": 156,
  "received_at": "2025-11-18T10:30:01Z",
  "processed": false,
  "id_sensor_log": null,
  "parse_error": null
}
```

### 3.2 Table: `node_profiles` (Already Exists ✅)

**Structure** (Already defined in entity):
```typescript
{
  id_node_profile: UUID,
  id_node_model: UUID,
  id_project: UUID | null,  // null = global profile
  code: string,
  name: string,
  description: string,
  parser_type: 'json' | 'lorawan' | 'modbus',
  mapping_json: {
    version: number,
    payload_format: 'json',
    timestamp_path?: string,
    channels: [
      {
        metric_code: string,
        source_path: string,  // JSONPath
        multiplier?: number,
        offset?: number,
        unit?: string
      }
    ]
  },
  transform_script: string | null,
  enabled: boolean,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

**Sample Profile**:
```json
{
  "id_node_profile": "profile-uuid-1",
  "code": "LORA-TEMP-V1",
  "name": "LoRa Temperature Sensor - Standard Mapping",
  "description": "Standard mapping for LoRa temp sensors with temp, humidity, battery",
  "id_node_model": "model-uuid-1",
  "id_project": null,
  "parser_type": "json",
  "mapping_json": {
    "version": 1,
    "payload_format": "json",
    "timestamp_path": "timestamp",
    "channels": [
      {
        "metric_code": "TEMP",
        "source_path": "temperature",
        "multiplier": 1,
        "offset": 0,
        "unit": "°C"
      },
      {
        "metric_code": "HUM",
        "source_path": "humidity",
        "multiplier": 1,
        "offset": 0,
        "unit": "%"
      },
      {
        "metric_code": "BATTERY",
        "source_path": "battery",
        "multiplier": 1,
        "offset": 0,
        "unit": "%"
      },
      {
        "metric_code": "SIGNAL",
        "source_path": "signal",
        "multiplier": 1,
        "offset": 0,
        "unit": "dBm"
      }
    ]
  },
  "enabled": true
}
```

---

## 4. Backend API Specification

### 4.1 Raw Sensor Logs Module

#### Endpoints

**1. Create Raw Log** (Called by MQTT listener)
```
POST /api/raw-sensor-logs
```
**Request**:
```json
{
  "hardwareId": "867584050123456",
  "topic": "devices/lora/867584050123456/up",
  "payload": { "sn": "867584050123456", "temp": 25.5 },
  "payloadSize": 156
}
```
**Response**: `RawLogResponseDto`

**2. Get Logs for Device**
```
GET /api/raw-sensor-logs/by-device/:hardwareId
  ?limit=100
  &offset=0
  &onlyUnique=true
  &topic=devices/lora/*/up
```
**Response**: `RawLogResponseDto[]`

**3. Get Log by ID**
```
GET /api/raw-sensor-logs/:id
```

**4. Delete Old Logs** (Cleanup job)
```
POST /api/raw-sensor-logs/cleanup
  ?olderThan=30  // days
```

#### DTOs

```typescript
export class CreateRawLogDto {
  hardwareId: string;
  topic: string;
  payload: any;
  payloadSize?: number;
}

export class RawLogResponseDto {
  idRawLog: string;
  hardwareId: string;
  topic: string;
  payload: any;
  payloadSize: number;
  receivedAt: Date;
  processed: boolean;
  idSensorLog?: string;
  parseError?: string;
}

export class GetLogsQueryDto {
  limit?: number;
  offset?: number;
  onlyUnique?: boolean;
  topic?: string;
}
```

### 4.2 Node Profiles Module

#### Endpoints

**1. Create Profile**
```
POST /api/node-profiles
```
**Request**: `CreateNodeProfileDto`
**Response**: `NodeProfileResponseDto`

**2. List All Profiles**
```
GET /api/node-profiles
  ?nodeModelId=uuid
  &projectId=uuid
  &enabled=true
```

**3. Get Profile by ID**
```
GET /api/node-profiles/:id
```

**4. Update Profile**
```
PUT /api/node-profiles/:id
```

**5. Delete Profile**
```
DELETE /api/node-profiles/:id
```

**6. Test Profile** 🎯 (Important!)
```
POST /api/node-profiles/:id/test
```
**Request**:
```json
{
  "samplePayloads": [
    { "temp": 25.5, "hum": 60 },
    { "temp": 26.1, "hum": 58 }
  ]
}
```
**Response**:
```json
{
  "success": true,
  "results": [
    {
      "payload": { "temp": 25.5, "hum": 60 },
      "parsed": [
        { "metricCode": "TEMP", "value": 25.5, "unit": "°C" },
        { "metricCode": "HUM", "value": 60, "unit": "%" }
      ],
      "error": null
    }
  ]
}
```

**7. Auto-Map Payload** 🎯 (Smart detection)
```
POST /api/node-profiles/auto-map
```
**Request**:
```json
{
  "samplePayload": { "temperature": 25.5, "humidity": 60, "battery": 85 },
  "nodeModelId": "uuid"
}
```
**Response**:
```json
{
  "suggestedMapping": {
    "version": 1,
    "payload_format": "json",
    "channels": [
      {
        "metric_code": "TEMP",
        "source_path": "temperature",
        "unit": "°C",
        "confidence": 0.95
      },
      {
        "metric_code": "HUM",
        "source_path": "humidity",
        "unit": "%",
        "confidence": 0.90
      }
    ]
  }
}
```

**8. Get Profiles by Node Model**
```
GET /api/node-profiles/by-model/:nodeModelId
```

#### DTOs

```typescript
export class CreateNodeProfileDto {
  code: string;
  name: string;
  description?: string;
  idNodeModel: string;
  idProject?: string;
  parserType: 'json' | 'lorawan' | 'modbus';
  mappingJson: MappingJsonDto;
  enabled?: boolean;
}

export class MappingJsonDto {
  version: number;
  payloadFormat: string;
  timestampPath?: string;
  channels: ChannelMappingDto[];
}

export class ChannelMappingDto {
  metricCode: string;
  sourcePath: string;
  multiplier?: number;
  offset?: number;
  unit?: string;
  dataType?: 'number' | 'string' | 'boolean';
  minValue?: number;
  maxValue?: number;
}

export class NodeProfileResponseDto {
  idNodeProfile: string;
  code: string;
  name: string;
  description?: string;
  idNodeModel: string;
  nodeModelName?: string;
  idProject?: string;
  projectName?: string;
  parserType: string;
  mappingJson: MappingJsonDto;
  enabled: boolean;
  channelCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TestProfileDto {
  samplePayloads: any[];
}

export class TestProfileResultDto {
  success: boolean;
  results: {
    payload: any;
    parsed: ParsedChannel[];
    error?: string;
  }[];
}

export class ParsedChannel {
  metricCode: string;
  value: any;
  unit?: string;
  timestamp?: Date;
}

export class AutoMapRequestDto {
  samplePayload: any;
  nodeModelId?: string;
}

export class AutoMapResponseDto {
  suggestedMapping: MappingJsonDto;
  detectedChannels: {
    code: string;
    displayName: string;
    sourcePath: string;
    unit?: string;
    confidence: number;
  }[];
}
```

### 4.3 Enhanced Unpaired Devices Module

**New Endpoint**: Pair with Profile

```
POST /api/unpaired-devices/:id/pair-with-profile
```
**Request**:
```json
{
  "projectId": "uuid",
  "nodeCode": "TEMP-SENSOR-001",
  "nodeName": "Temperature Sensor - Floor 3",
  "nodeDescription": "Monitoring room temperature",
  "idNodeProfile": "profile-uuid"
}
```
**Response**:
```json
{
  "success": true,
  "node": {
    "idNode": "uuid",
    "code": "TEMP-SENSOR-001",
    "name": "Temperature Sensor - Floor 3"
  },
  "sensorsCreated": 1,
  "channelsCreated": 4,
  "profile": {
    "idNodeProfile": "uuid",
    "code": "LORA-TEMP-V1"
  }
}
```

---

## 5. Frontend Component Structure

### 5.1 Module Structure

```
src/app/pages/iot/node-profiles/
├── node-profiles.module.ts
├── node-profiles-routing.module.ts
│
├── node-profiles-list/
│   ├── node-profiles-list.ts
│   ├── node-profiles-list.html
│   └── node-profiles-list.scss
│
├── profile-builder/
│   ├── profile-builder.ts           # Main wizard controller
│   ├── profile-builder.html          # Stepper layout
│   ├── profile-builder.scss
│   │
│   ├── steps/
│   │   ├── step1-info/
│   │   │   ├── step1-info.component.ts
│   │   │   ├── step1-info.component.html
│   │   │   └── step1-info.component.scss
│   │   │
│   │   ├── step2-samples/
│   │   │   ├── step2-samples.component.ts
│   │   │   ├── step2-samples.component.html
│   │   │   └── step2-samples.component.scss
│   │   │
│   │   ├── step3-mapping/           🎯 CORE FEATURE
│   │   │   ├── step3-mapping.component.ts
│   │   │   ├── step3-mapping.component.html
│   │   │   ├── step3-mapping.component.scss
│   │   │   │
│   │   │   ├── payload-tree/
│   │   │   │   ├── payload-tree.component.ts
│   │   │   │   ├── payload-tree.component.html
│   │   │   │   └── payload-tree.component.scss
│   │   │   │
│   │   │   ├── db-structure/
│   │   │   │   ├── db-structure.component.ts
│   │   │   │   ├── db-structure.component.html
│   │   │   │   └── db-structure.component.scss
│   │   │   │
│   │   │   └── channel-config-dialog/
│   │   │       ├── channel-config-dialog.component.ts
│   │   │       ├── channel-config-dialog.component.html
│   │   │       └── channel-config-dialog.component.scss
│   │   │
│   │   └── step4-review/
│   │       ├── step4-review.component.ts
│   │       ├── step4-review.component.html
│   │       └── step4-review.component.scss
│   │
│   └── models/
│       ├── profile-wizard.model.ts
│       ├── payload-field.model.ts
│       ├── sensor-mapping.model.ts
│       └── channel-mapping.model.ts
│
└── profile-detail/
    ├── profile-detail.ts
    ├── profile-detail.html
    └── profile-detail.scss
```

### 5.2 Data Models

```typescript
// profile-wizard.model.ts
export interface ProfileWizardData {
  // Step 1
  profileCode: string;
  profileName: string;
  profileDescription?: string;
  nodeModelId: string;
  nodeModelName?: string;
  projectId?: string;  // null = global
  parserType: 'json';

  // Step 2
  deviceId?: string;  // Source device (optional)
  samplePayloads: any[];
  selectedSampleIds: string[];

  // Step 3
  sensors: SensorMapping[];
  timestampPath?: string;

  // Step 4
  pairDeviceAfterSave: boolean;
  pairProjectId?: string;
  pairNodeCode?: string;
}

export interface SensorMapping {
  id: string;  // Temporary UUID
  name: string;
  description?: string;
  channels: ChannelMapping[];
}

export interface ChannelMapping {
  id: string;  // Temporary UUID
  code: string;
  displayName: string;
  sourcePath: string;  // JSONPath: "temperature" or "sensors.temp"
  dataType: 'number' | 'string' | 'boolean';
  unit?: string;
  multiplier?: number;
  offset?: number;
  minValue?: number;
  maxValue?: number;
}

export interface PayloadField {
  key: string;
  path: string;  // JSONPath
  value: any;
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  detected?: {
    channelCode?: string;
    displayName?: string;
    unit?: string;
    confidence?: number;
  };
}
```

---

## 6. UI/UX Design

### 6.1 Route Structure

```
/iot/node-profiles                          → List all profiles
/iot/node-profiles/create                   → Create new profile (full page wizard)
/iot/node-profiles/create?deviceId=xxx      → Create from device
/iot/node-profiles/create?samples=a,b,c     → Create with samples
/iot/node-profiles/:id                      → View profile detail
/iot/node-profiles/:id/edit                 → Edit profile (same wizard)
```

### 6.2 Step-by-Step UI Mockups

**(Detailed mockups in RAW-LOGS-AND-PROFILES-SPEC.md - refer to that document)**

**Quick Summary**:
- **Step 1**: Profile info form (code, name, model, scope)
- **Step 2**: Sample payload selection (from device or manual paste)
- **Step 3**: Drag-drop mapping (LEFT: payload tree, RIGHT: sensors/channels)
- **Step 4**: Review summary + save options

---

## 7. Data Flow

### 7.1 MQTT Ingestion Flow

```
IoT Device (ESP32/LoRa/FMB)
  ↓ Publishes JSON to MQTT
MQTT Broker
  ↓ Topic: devices/{type}/{hardware_id}/up
Backend MQTT Listener Service
  ↓ Receives payload
  ├─→ Store to raw_sensor_logs (ALWAYS)
  └─→ Check if device is paired?
      ├─ YES: Parse with node_profile → sensor_logs
      └─ NO:  Register to node_unpaired_devices
```

### 7.2 Profile Creation & Pairing Flow

```
Admin browses Unpaired Devices
  ↓ Clicks device
Device Detail Page
  ↓ Selects raw log samples (checkbox)
  ↓ Clicks "Create Profile & Pair"
Profile Builder (Step 1)
  ↓ Enter profile info
Profile Builder (Step 2)
  ↓ Review/add more samples
Profile Builder (Step 3)
  ↓ Drag fields → Create channels
  ↓ Configure channel properties
  ↓ [Auto-Map All] for quick setup
Profile Builder (Step 4)
  ↓ Review mapping
  ↓ Test with all samples
  ↓ ☑ Pair device after save
  ↓ Save Profile
Backend
  ├─→ Create node_profile
  ├─→ Create node (if pairing)
  ├─→ Create sensors
  ├─→ Create sensor_channels
  └─→ Update unpaired_device status
Frontend
  └─→ Redirect to Node detail page
```

### 7.3 Parsing Flow (Real-time)

```
New MQTT message arrives
  ↓ hardware_id: "867584050123456"
  ↓ Find node by hardware_id
  ↓ Node has id_node_profile?
Parser Service
  ↓ Load profile.mapping_json
  ↓ For each channel in mapping:
      ├─ Extract value using JSONPath (source_path)
      ├─ Apply multiplier & offset
      └─ Validate min/max (optional)
  ↓ Create sensor_log records
Database
  └─ Insert into sensor_logs
```

---

## 8. Implementation Phases

### Phase 1: Backend Foundation (Est: 6-8 hours)

**Priority**: High

**Tasks**:
1. ✅ Create migration for `raw_sensor_logs` table
2. ✅ Create RawSensorLogs entity
3. ✅ Create RawSensorLogs service (CRUD)
4. ✅ Create RawSensorLogs controller (REST API)
5. ✅ Update MQTT listener to save raw logs
6. ✅ Create NodeProfiles service (CRUD)
7. ✅ Create NodeProfiles controller (REST API)
8. ✅ Implement Parser service (JSON parsing logic)
9. ✅ Implement test-profile endpoint
10. ✅ Implement auto-map endpoint
11. ✅ Add cleanup job for old raw logs
12. ✅ Update unpaired-devices service (pair-with-profile)

**Deliverables**:
- Working REST API for raw logs
- Working REST API for profiles
- Parser service that can transform JSON
- Auto-map intelligence

---

### Phase 2: Frontend - Profiles List (Est: 3-4 hours)

**Priority**: Medium

**Tasks**:
1. ✅ Create node-profiles module & routing
2. ✅ Create profiles list page
3. ✅ Implement filter by node model
4. ✅ Implement filter by project/scope
5. ✅ Implement search
6. ✅ Add actions: View, Edit, Delete, Duplicate
7. ✅ Show profile statistics (channel count, usage count)

**Deliverables**:
- Functional profiles list page
- Can navigate to create/edit/detail

---

### Phase 3: Frontend - Profile Builder (Est: 12-16 hours)

**Priority**: High (CORE FEATURE)

**Milestone 1: Wizard Structure (3-4 hours)**
1. ✅ Create profile-builder component
2. ✅ Implement stepper navigation
3. ✅ Implement wizard state management
4. ✅ Create step 1 component (info form)
5. ✅ Create step 2 component (samples)
6. ✅ Create step 4 component (review)

**Milestone 2: Drag-Drop Mapping (6-8 hours) 🎯**
7. ✅ Install Angular CDK (`@angular/cdk`)
8. ✅ Create step 3 component (mapping)
9. ✅ Create payload-tree component (left panel)
   - Parse JSON to tree structure
   - Collapsible nodes
   - Draggable fields
10. ✅ Create db-structure component (right panel)
    - Sensors list
    - Channels list
    - Droppable zones
11. ✅ Implement drag-drop logic
    - Drag field → Drop to sensor
    - Auto-create channel
    - Visual feedback
12. ✅ Create channel-config dialog
    - Edit channel properties
    - Multiplier, offset, unit, min/max
13. ✅ Implement auto-map feature
    - Smart field detection
    - Confidence scoring

**Milestone 3: Integration & Testing (3-4 hours)**
14. ✅ Connect to backend API
15. ✅ Implement profile save logic
16. ✅ Implement profile test (real-time)
17. ✅ Handle errors & validation
18. ✅ Add loading states
19. ✅ Implement "pair after save" flow

**Deliverables**:
- Full working profile builder
- Drag-drop mapping
- Profile creation & testing
- Device pairing integration

---

### Phase 4: Frontend - Profile Detail (Est: 2-3 hours)

**Priority**: Low

**Tasks**:
1. ✅ Create profile-detail page
2. ✅ Show profile information
3. ✅ Show mapping visualization
4. ✅ Show usage statistics (how many nodes use this profile)
5. ✅ Add actions: Edit, Delete, Duplicate, Test

**Deliverables**:
- Profile detail view
- Can edit existing profiles

---

### Phase 5: Testing & Polish (Est: 4-6 hours)

**Priority**: High

**Tasks**:
1. ✅ End-to-end testing (device detail → profile creation → pairing)
2. ✅ Error handling & edge cases
3. ✅ Loading states & spinners
4. ✅ Responsive design (mobile/tablet)
5. ✅ Accessibility (keyboard navigation)
6. ✅ Documentation (user guide)
7. ✅ Code cleanup & refactoring

**Deliverables**:
- Production-ready system
- User documentation

---

**Total Estimated Time**: 27-37 hours

---

## 9. Testing Strategy

### 9.1 Backend Unit Tests

```typescript
// raw-sensor-logs.service.spec.ts
describe('RawSensorLogsService', () => {
  it('should create raw log', () => {});
  it('should find logs by device', () => {});
  it('should filter unique payloads', () => {});
  it('should cleanup old logs', () => {});
});

// node-profiles.service.spec.ts
describe('NodeProfilesService', () => {
  it('should create profile', () => {});
  it('should test profile with samples', () => {});
  it('should auto-map payload', () => {});
});

// parser.service.spec.ts
describe('ParserService', () => {
  it('should parse JSON with JSONPath', () => {});
  it('should apply multiplier & offset', () => {});
  it('should handle nested objects', () => {});
  it('should validate min/max values', () => {});
});
```

### 9.2 Frontend Unit Tests

```typescript
// profile-builder.component.spec.ts
describe('ProfileBuilderComponent', () => {
  it('should navigate between steps', () => {});
  it('should save wizard state', () => {});
  it('should validate before proceed', () => {});
});

// payload-tree.component.spec.ts
describe('PayloadTreeComponent', () => {
  it('should parse JSON to tree', () => {});
  it('should make fields draggable', () => {});
  it('should detect field types', () => {});
});

// db-structure.component.spec.ts
describe('DbStructureComponent', () => {
  it('should accept dropped fields', () => {});
  it('should create channels', () => {});
  it('should allow channel edit', () => {});
});
```

### 9.3 E2E Test Scenarios

**Scenario 1: Create Profile from Unpaired Device**
1. Navigate to unpaired devices list
2. Click device → View detail
3. Select 3 raw log samples
4. Click "Create Profile & Pair"
5. Fill profile info (step 1)
6. Review samples (step 2)
7. Drag fields to create channels (step 3)
8. Review & save (step 4)
9. Verify: Profile created, device paired, redirect to node detail

**Scenario 2: Create Global Profile**
1. Navigate to profiles list
2. Click "Create Profile"
3. Fill profile info, select "Global" scope
4. Paste sample JSON manually
5. Use "Auto-Map All"
6. Review & save
7. Verify: Profile created and appears in list

**Scenario 3: Edit Existing Profile**
1. Navigate to profiles list
2. Click profile → View detail
3. Click "Edit"
4. Modify channel mappings
5. Test with sample payloads
6. Save changes
7. Verify: Changes persisted

---

## 10. Deployment Checklist

### 10.1 Backend

- [ ] Run migrations:
  ```bash
  npm run migration:run
  ```
- [ ] Verify tables created:
  - `raw_sensor_logs`
  - `node_profiles` (should already exist)
- [ ] Setup cron job for cleanup (30 days):
  ```sql
  SELECT cleanup_old_raw_logs();
  ```
- [ ] Update MQTT listener to save raw logs
- [ ] Generate Swagger docs
- [ ] Test all API endpoints via Swagger

### 10.2 Frontend

- [ ] Generate SDK from backend:
  ```bash
  ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core
  ```
- [ ] Build Angular app:
  ```bash
  npm run build
  ```
- [ ] Test in production mode
- [ ] Verify all routes accessible
- [ ] Test responsive design
- [ ] Check browser compatibility

### 10.3 Documentation

- [ ] Update README.md
- [ ] Create user guide (screenshots)
- [ ] Document API endpoints
- [ ] Update architecture diagrams

### 10.4 Performance

- [ ] Add pagination to raw logs (limit 100 per page)
- [ ] Add caching for profiles list
- [ ] Optimize payload tree rendering (virtual scroll for large JSON)
- [ ] Monitor database query performance

---

## 11. Future Enhancements (Post-MVP)

### Phase 2 Features
1. **LoRaWAN byte parsing** (hex string → decoded values)
2. **Modbus register mapping** (register addresses → values)
3. **Custom JavaScript transforms** (advanced payload manipulation)
4. **Profile templates library** (pre-built profiles for common devices)
5. **Import/Export profiles** (JSON file)
6. **Profile versioning** (track changes, rollback)
7. **Batch profile application** (apply to multiple unpaired devices)
8. **Real-time preview** (WebSocket for live payload testing)
9. **Profile analytics** (usage statistics, success rate)
10. **AI-powered auto-detection** (ML model for field recognition)

---

## 12. Success Metrics

### Technical Metrics
- ✅ Profile creation time: < 3 minutes
- ✅ Parsing performance: < 10ms per payload
- ✅ Auto-map accuracy: > 85%
- ✅ Profile reusability: 1 profile → 10+ nodes

### User Experience Metrics
- ✅ Wizard completion rate: > 90%
- ✅ Error rate: < 5%
- ✅ User satisfaction: "Easy to use"

---

## 13. Notes & Decisions

### Design Decisions

**Q: Why full-page instead of dialog?**
A: Complex wizard dengan drag-drop perlu space yang lega. Full-page gives better UX.

**Q: Why JSON-only first?**
A: Simplify MVP. 90% devices use JSON. LoRaWAN/Modbus can be added later.

**Q: Why 30-day retention for raw logs?**
A: Balance between history & storage cost. Enough for debugging & profiling.

**Q: Why reusable profiles?**
A: 1 profile → many nodes = consistent mapping. Update profile = update all nodes.

### Technical Decisions

**Q: Why JSONPath instead of custom syntax?**
A: Standard, well-documented, supports nested objects & arrays.

**Q: Why Angular CDK for drag-drop?**
A: Battle-tested, accessible, maintained by Angular team.

**Q: Why separate raw_sensor_logs table?**
A: Keep audit trail, enable re-parsing, separate concerns.

---

**Document Version**: 1.0
**Last Updated**: November 18, 2025
**Status**: 📋 Ready for Implementation
**Next Step**: Phase 1 - Backend Foundation
