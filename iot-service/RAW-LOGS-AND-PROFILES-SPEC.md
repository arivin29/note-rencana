# Raw Sensor Logs & Node Profiles - Complete Specification

## 🎯 Overview

Sistem lengkap untuk:
1. **Simpan semua data mentah** dari MQTT ke `raw_sensor_logs`
2. **Create reusable Node Profiles** (mapping templates)
3. **Parse data** menggunakan profile yang sudah dibuat
4. **Full-page UI** untuk profile builder (bukan dialog)

## 📊 Database Schema

### 1. Table: `raw_sensor_logs` (NEW!)

**Purpose**: Store SEMUA data mentah dari MQTT sebelum parsing

```sql
CREATE TABLE raw_sensor_logs (
  id_raw_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Device identification
  hardware_id TEXT NOT NULL,           -- SN/MAC dari device
  topic TEXT NOT NULL,                 -- MQTT topic

  -- Raw data
  payload JSONB NOT NULL,              -- Full JSON payload
  payload_size INTEGER,                -- Size in bytes

  -- Metadata
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,     -- Sudah di-parse atau belum
  id_sensor_log UUID,                  -- Link ke sensor_logs jika sudah parsed
  parse_error TEXT,                    -- Error message jika parsing gagal

  -- Indexes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes untuk performa
CREATE INDEX idx_raw_logs_hardware_id ON raw_sensor_logs(hardware_id);
CREATE INDEX idx_raw_logs_received_at ON raw_sensor_logs(received_at DESC);
CREATE INDEX idx_raw_logs_processed ON raw_sensor_logs(processed);
CREATE INDEX idx_raw_logs_topic ON raw_sensor_logs(topic);

-- Partitioning by time (optional, untuk data besar)
-- Partition by month untuk performa query
```

**Example Data**:
```json
{
  "id_raw_log": "uuid-123",
  "hardware_id": "867584050123456",
  "topic": "devices/lora/867584050123456/up",
  "payload": {
    "sn": "867584050123456",
    "temperature": 25.5,
    "humidity": 60,
    "battery": 85,
    "timestamp": "2025-11-18T10:30:00Z"
  },
  "payload_size": 156,
  "received_at": "2025-11-18T10:30:01Z",
  "processed": false,
  "id_sensor_log": null,
  "parse_error": null
}
```

### 2. Table: `node_profiles` (Already Exists ✅)

**Purpose**: Reusable mapping templates

Sudah ada dengan structure:
- `id_node_profile`
- `id_node_model` - Profile untuk model tertentu
- `id_project` - Optional, project-specific override
- `code`, `name`, `description`
- `parser_type` - "json" (for now)
- `mapping_json` - JSONB mapping configuration
- `enabled`

### 3. Relationship Updates

**nodes table**:
- Already has `id_node_profile` column ✅

**sensor_logs table**:
- Add optional: `id_raw_log UUID` - Link back to raw log

## 🔄 Data Flow Architecture

### Phase 1: Raw Data Ingestion

```typescript
// MQTT Listener Service
@Injectable()
export class MqttListenerService {
  async onMessage(topic: string, payload: Buffer) {
    const data = JSON.parse(payload.toString());
    const hardwareId = this.extractHardwareId(data, topic);

    // 1. ALWAYS save to raw_sensor_logs first
    const rawLog = await this.rawSensorLogsService.create({
      hardwareId,
      topic,
      payload: data,
      payloadSize: payload.length,
    });

    // 2. Check if device is paired
    const node = await this.nodesService.findByHardwareId(hardwareId);

    if (node && node.idNodeProfile) {
      // Device paired with profile → Parse immediately
      try {
        const parsed = await this.parserService.parse(
          node.nodeProfile,
          data
        );

        // Save parsed data to sensor_logs
        await this.sensorLogsService.createBulk(parsed);

        // Mark raw log as processed
        await this.rawSensorLogsService.update(rawLog.id, {
          processed: true,
          idSensorLog: parsed[0].idSensorLog
        });
      } catch (error) {
        // Mark parsing error
        await this.rawSensorLogsService.update(rawLog.id, {
          parseError: error.message
        });
      }
    } else {
      // Device not paired → Register as unpaired
      await this.unpairedDevicesService.registerActivity({
        hardwareId,
        payload: data,
        topic,
      });
    }
  }

  extractHardwareId(payload: any, topic: string): string {
    // Priority 1: From payload
    if (payload.sn) return payload.sn;
    if (payload.serial_number) return payload.serial_number;
    if (payload.mac) return payload.mac;
    if (payload.device_id) return payload.device_id;

    // Priority 2: From topic
    // e.g., "devices/lora/867584050123456/up" → extract "867584050123456"
    const match = topic.match(/devices\/[^\/]+\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
}
```

### Phase 2: Profile-Based Parsing

```typescript
// Parser Service
@Injectable()
export class ParserService {
  parse(profile: NodeProfile, payload: any): ParsedChannel[] {
    const result: ParsedChannel[] = [];

    for (const channelMapping of profile.mappingJson.channels) {
      // Extract value using JSONPath
      const value = this.extractValue(payload, channelMapping.source_path);

      if (value !== null && value !== undefined) {
        // Apply transformations
        const transformed = this.transform(
          value,
          channelMapping.multiplier,
          channelMapping.offset
        );

        result.push({
          metric_code: channelMapping.metric_code,
          value: transformed,
          unit: channelMapping.unit,
          timestamp: this.extractTimestamp(payload, profile.mappingJson.timestamp_path)
        });
      }
    }

    return result;
  }

  extractValue(obj: any, path: string): any {
    // Simple JSONPath: "temperature" or "sensors.temp"
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  transform(value: number, multiplier?: number, offset?: number): number {
    let result = value;
    if (multiplier) result *= multiplier;
    if (offset) result += offset;
    return result;
  }
}
```

## 🎨 Frontend Architecture

### Route Structure

```
/iot/unpaired-devices              → List unpaired devices
/iot/unpaired-devices/:id          → Device detail + raw logs
/iot/unpaired-devices/:id/pair     → Redirect to profile creation

/iot/node-profiles                 → List all profiles
/iot/node-profiles/create          → Create new profile (FULL PAGE)
/iot/node-profiles/:id             → View profile detail
/iot/node-profiles/:id/edit        → Edit profile (FULL PAGE)
/iot/node-profiles/:id/test        → Test profile with samples
```

### Page 1: Unpaired Device Detail (NEW)

**Route**: `/iot/unpaired-devices/:id`

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to List          Unpaired Device Detail                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Device Information                          [Pair Device >]   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Hardware ID:    867584050123456                         │ │
│  │  Node Model:     Generic LoRa Temperature Sensor         │ │
│  │  First Seen:     30 days ago (Oct 19, 2025)              │ │
│  │  Last Seen:      30 minutes ago (Nov 18, 2025 10:30)     │ │
│  │  Total Messages: 45 transmissions                        │ │
│  │  Status:         🟡 Pending                              │ │
│  │  Topic Pattern:  devices/lora/*/up                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Raw Sensor Logs (Last 100 messages)        [Refresh] [Export]│
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Timestamp            Topic                   Size  ✓    │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  Nov 18 10:30:01   devices/lora/.../up    156B  ☐  [>]  │ │
│  │  Nov 18 10:25:01   devices/lora/.../up    158B  ☐  [>]  │ │
│  │  Nov 18 10:20:01   devices/lora/.../up    155B  ☐  [>]  │ │
│  │  Nov 18 10:15:01   devices/lora/.../up    157B  ☐  [>]  │ │
│  │  ...                                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ☑ Show only unique payloads    Filter: [All Topics ▾]        │
│                                                                 │
│  Selected Log Detail:                                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  {                                                        │ │
│  │    "sn": "867584050123456",                              │ │
│  │    "temperature": 25.5,                                   │ │
│  │    "humidity": 60.2,                                      │ │
│  │    "battery": 85,                                         │ │
│  │    "signal": -75,                                         │ │
│  │    "timestamp": "2025-11-18T10:30:00Z"                   │ │
│  │  }                                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Actions:                                                       │
│  [Create Profile & Pair Device]  [Ignore Device]  [Delete]    │
└────────────────────────────────────────────────────────────────┘
```

**Features**:
1. Show device info (same as before)
2. **New**: Table of raw logs history
   - Timestamp, topic, payload size
   - Checkbox untuk select multiple samples
   - Click row → Show payload detail
3. **New**: Filter untuk show only unique payloads (deduplicate)
4. Action button: "Create Profile & Pair Device"
   - Redirect ke `/iot/node-profiles/create?deviceId=xxx&samples=log1,log2,log3`

### Page 2: Node Profile Builder (FULL PAGE)

**Route**: `/iot/node-profiles/create?deviceId=xxx&samples=log1,log2,log3`

**Layout** (Full viewport, no dialog):
```
┌────────────────────────────────────────────────────────────────┐
│  Node Profile Builder                                  [x Exit]│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Step 1 → Step 2 → Step 3 → Step 4                      │ │
│  │  ─────    ─────    ─────    ─────                        │ │
│  │  Info     Samples  Mapping  Review                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Content area based on current step - see details below]      │
│                                                                 │
│                                                                 │
│                          [< Back]  [Cancel]  [Next >]          │
└────────────────────────────────────────────────────────────────┘
```

#### Step 1: Profile Information

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1: Profile Information                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile Details:                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Profile Code: *                                          │ │
│  │  [LORA-TEMP-V1                                          ] │ │
│  │                                                            │ │
│  │  Profile Name: *                                           │ │
│  │  [LoRa Temperature Sensor - Standard Mapping           ] │ │
│  │                                                            │ │
│  │  Description:                                              │ │
│  │  [Standard mapping for LoRa temperature sensors with   ] │ │
│  │  [temp, humidity, battery, and signal fields           ] │ │
│  │                                                            │ │
│  │  Node Model: *                                             │ │
│  │  [Generic LoRa Temperature Sensor              ▾       ] │ │
│  │                                                            │ │
│  │  Parser Type:                                              │ │
│  │  ● JSON  ○ LoRaWAN  ○ Modbus  ○ Custom                   │ │
│  │                                                            │ │
│  │  Scope:                                                    │ │
│  │  ● Global (All projects can use)                          │ │
│  │  ○ Project-specific: [Select Project ▾]                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Source Device: (Optional, for context)                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Hardware ID:  867584050123456                            │ │
│  │  Last Seen:    30 minutes ago                             │ │
│  │  [View Device Detail]                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                           [Cancel]  [Next >]   │
└────────────────────────────────────────────────────────────────┘
```

#### Step 2: Select Sample Payloads

```
┌────────────────────────────────────────────────────────────────┐
│  Step 2: Select Sample Payloads                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select sample payloads to use for mapping:                     │
│  (Choose multiple to ensure mapping works for all variations)   │
│                                                                 │
│  Available Samples (from device: 867584050123456):              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ☑ Nov 18 10:30:01 - {"sn":"...", "temp":25.5, ...}  [>]│ │
│  │  ☑ Nov 18 10:25:01 - {"sn":"...", "temp":24.8, ...}  [>]│ │
│  │  ☐ Nov 18 10:20:01 - {"sn":"...", "temp":25.1, ...}  [>]│ │
│  │  ☐ Nov 18 10:15:01 - {"sn":"...", "temp":25.3, ...}  [>]│ │
│  └──────────────────────────────────────────────────────────┘ │
│  [Select All]  [Deselect All]  [Show Only Unique Structures]   │
│                                                                 │
│  OR paste custom sample:                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  {                                                        │ │
│  │    "sn": "867584050123456",                              │ │
│  │    "temperature": 25.5,                                   │ │
│  │    "humidity": 60,                                        │ │
│  │    "battery": 85                                          │ │
│  │  }                                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│  [Validate JSON]  [Add to Samples]                             │
│                                                                 │
│  Selected: 2 samples                                            │
│                                                                 │
│                                  [< Back]  [Cancel]  [Next >]  │
└────────────────────────────────────────────────────────────────┘
```

#### Step 3: Visual Drag-Drop Mapping (MAIN!)

```
┌────────────────────────────────────────────────────────────────┐
│  Step 3: Payload Mapping                    [Auto-Map All]    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌─────────────────────────┐  │
│  │  Payload Structure   │        │  Database Structure     │  │
│  │  (Drag from here)    │        │  (Drop here)            │  │
│  ├──────────────────────┤        ├─────────────────────────┤  │
│  │                      │        │                         │  │
│  │  Sample 1 of 2: ▾    │        │  Sensors & Channels:    │  │
│  │                      │        │                         │  │
│  │  📦 root             │        │  📊 Environmental       │  │
│  │    ├─ sn (skip)      │        │    ├─ 🌡️ TEMP          │  │
│  │    ├─ 🌡️ temperature│───────→│    │  From: temp        │  │
│  │    ├─ 💧 humidity   │───────→│    │  Unit: °C          │  │
│  │    ├─ 🔋 battery    │───────→│    │  Type: Number      │  │
│  │    ├─ 📡 signal     │───────→│    │  [Edit] [Delete]   │  │
│  │    └─ ⏰ timestamp  │        │    │                     │  │
│  │         (use as ts) │        │    ├─ 💧 HUM            │  │
│  │                      │        │    │  From: humidity    │  │
│  │  [Expand All]        │        │    │  Unit: %           │  │
│  │  [Collapse All]      │        │    │  [Edit] [Delete]   │  │
│  │                      │        │    │                     │  │
│  │                      │        │    ├─ 🔋 BATTERY        │  │
│  │                      │        │    │  From: battery     │  │
│  │                      │        │    │  [Edit] [Delete]   │  │
│  │                      │        │    │                     │  │
│  │                      │        │    └─ 📡 SIGNAL         │  │
│  │                      │        │       From: signal      │  │
│  │                      │        │       [Edit] [Delete]   │  │
│  │                      │        │                         │  │
│  │                      │        │  [+ Add Sensor]         │  │
│  └──────────────────────┘        └─────────────────────────┘  │
│                                                                 │
│  💡 Tip: Drag fields to sensors to create channels             │
│                                                                 │
│  Summary: 4 channels in 1 sensor                               │
│  Test Results: ✓ All samples parsed successfully               │
│                                                                 │
│                                  [< Back]  [Cancel]  [Next >]  │
└────────────────────────────────────────────────────────────────┘
```

**Features**:
- Left: Tree view payload (collapsible)
- Right: Sensors & Channels
- Drag field → Drop to sensor → Auto-create channel
- [Auto-Map All]: Instant mapping berdasarkan field names
- Real-time test dengan selected samples
- Show validation: ✓/✗ untuk setiap sample

#### Step 4: Review & Save

```
┌────────────────────────────────────────────────────────────────┐
│  Step 4: Review & Save Profile                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile Summary:                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Code:  LORA-TEMP-V1                                      │ │
│  │  Name:  LoRa Temperature Sensor - Standard Mapping        │ │
│  │  Model: Generic LoRa Temperature Sensor                   │ │
│  │  Type:  JSON Parser                                       │ │
│  │  Scope: Global                                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Mapping Configuration:                                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Sensor: Environmental                                    │ │
│  │    ├─ TEMP      ← temperature  (°C, x1.0, +0)           │ │
│  │    ├─ HUM       ← humidity     (%, x1.0, +0)             │ │
│  │    ├─ BATTERY   ← battery      (%, x1.0, +0)             │ │
│  │    └─ SIGNAL    ← signal       (dBm, x1.0, +0)           │ │
│  │                                                            │ │
│  │  Total: 1 sensor, 4 channels                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Test Results (2 samples):                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ✓ Sample 1: Parsed 4 channels successfully              │ │
│  │  ✓ Sample 2: Parsed 4 channels successfully              │ │
│  │                                                            │ │
│  │  Validation: ✓ All samples passed                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Next Steps:                                                    │
│  ☑ Pair device 867584050123456 to project after saving         │
│     Project: [Smart Building - Jakarta Office        ▾]        │
│     Node Code: [TEMP-SENSOR-001                            ]   │
│                                                                 │
│                       [< Back]  [Cancel]  [Save Profile]       │
└────────────────────────────────────────────────────────────────┘
```

**On [Save Profile]**:
1. Create NodeProfile
2. If checkbox checked: Pair device to project with this profile
3. Redirect to profile detail or unpaired devices list

### Page 3: Node Profiles List

**Route**: `/iot/node-profiles`

```
┌────────────────────────────────────────────────────────────────┐
│  Node Profiles                              [+ Create Profile] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [All Models ▾]  [All Scopes ▾]   Search: [        🔍]│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Code            Name                Model      Channels  │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  LORA-TEMP-V1   LoRa Temp Sensor   Generic...  4  [Edit]│ │
│  │  ESP32-ENV-V1   ESP32 Environment  ESP32       6  [Edit]│ │
│  │  FMB-TRACK-V1   FMB Tracker        Teltonika   8  [Edit]│ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Total: 3 profiles                                              │
└────────────────────────────────────────────────────────────────┘
```

## 🔧 Backend API Requirements

### 1. Raw Sensor Logs Module

**Endpoints**:
```
POST   /api/raw-sensor-logs                    # Create (from MQTT)
GET    /api/raw-sensor-logs                    # List all with filters
GET    /api/raw-sensor-logs/:id                # Get by ID
GET    /api/raw-sensor-logs/by-device/:hwId    # Get logs for device
DELETE /api/raw-sensor-logs/:id                # Delete log
POST   /api/raw-sensor-logs/cleanup            # Cleanup old logs
```

**DTO**:
```typescript
export class CreateRawLogDto {
  hardwareId: string;
  topic: string;
  payload: any;  // JSON object
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
```

### 2. Node Profiles Module (NEW)

**Endpoints**:
```
POST   /api/node-profiles                   # Create profile
GET    /api/node-profiles                   # List all
GET    /api/node-profiles/:id               # Get by ID
PUT    /api/node-profiles/:id               # Update profile
DELETE /api/node-profiles/:id               # Delete profile
POST   /api/node-profiles/:id/test          # Test profile with sample
POST   /api/node-profiles/auto-map          # Auto-generate mapping
GET    /api/node-profiles/by-model/:id      # Get profiles for model
```

**DTOs**:
```typescript
export class CreateNodeProfileDto {
  code: string;
  name: string;
  description?: string;
  idNodeModel: string;
  idProject?: string;  // null = global
  parserType: 'json' | 'lorawan' | 'modbus';
  mappingJson: MappingJsonDto;
  enabled: boolean;
}

export class MappingJsonDto {
  version: number;
  payloadFormat: string;
  timestampPath?: string;
  channels: ChannelMappingDto[];
}

export class ChannelMappingDto {
  metricCode: string;
  sourcePath: string;  // JSONPath
  multiplier?: number;
  offset?: number;
  unit?: string;
  dataType?: 'number' | 'string' | 'boolean';
}

export class TestProfileDto {
  profileId: string;
  samplePayloads: any[];  // Array of JSON objects
}

export class TestProfileResultDto {
  success: boolean;
  samples: {
    payload: any;
    parsed: ParsedChannel[];
    error?: string;
  }[];
}

export class AutoMapRequestDto {
  samplePayload: any;
  idNodeModel?: string;
}

export class AutoMapResponseDto {
  suggestedMapping: MappingJsonDto;
  detectedChannels: {
    code: string;
    displayName: string;
    sourcePath: string;
    unit?: string;
    confidence: number;  // 0-1
  }[];
}
```

### 3. Enhanced Pairing Endpoint

**Update existing**:
```typescript
// POST /api/unpaired-devices/:id/pair-with-profile
export class PairWithProfileDto {
  projectId: string;
  nodeCode: string;
  nodeName?: string;
  nodeDescription?: string;
  idNodeProfile: string;  // Use existing profile
}

// Response
export class PairResultDto {
  success: boolean;
  node: NodeResponseDto;
  sensorsCreated: number;
  channelsCreated: number;
}
```

## 📝 Implementation Plan

### Phase 1: Backend Foundation (4-6 hours)
1. ✅ Create `raw_sensor_logs` table migration
2. ✅ Create RawSensorLogs module (CRUD)
3. ✅ Create NodeProfiles module (CRUD + test)
4. ✅ Implement Parser Service
5. ✅ Update MQTT listener to save raw logs
6. ✅ Add `pairWithProfile` endpoint

### Phase 2: Frontend - Device Detail Page (3-4 hours)
7. ✅ Create unpaired device detail page
8. ✅ Show raw logs table
9. ✅ Implement log selection
10. ✅ Add "Create Profile & Pair" button

### Phase 3: Frontend - Profile Builder (8-12 hours)
11. ✅ Create full-page profile builder
12. ✅ Step 1: Profile info form
13. ✅ Step 2: Sample selection
14. ✅ Step 3: Visual drag-drop mapping
15. ✅ Step 4: Review & save
16. ✅ Integration with device pairing

### Phase 4: Frontend - Profiles List (2-3 hours)
17. ✅ Create profiles list page
18. ✅ Filter & search
19. ✅ Edit/delete profiles

### Phase 5: Testing & Polish (2-4 hours)
20. ✅ End-to-end testing
21. ✅ Error handling
22. ✅ Loading states
23. ✅ Responsive design

**Total: 19-29 hours**

## 🎯 Benefits

1. **Reusable Profiles**:
   - Create profile once
   - Apply to many nodes
   - Update mapping tanpa re-pair device

2. **Historical Data**:
   - Semua data mentah tersimpan
   - Bisa re-parse dengan profile baru
   - Audit trail lengkap

3. **Flexible**:
   - Support berbagai format payload
   - Nested JSON support
   - Custom transformations

4. **User-Friendly**:
   - Visual drag-drop
   - Auto-detection
   - Test before save

## ❓ Questions

1. **Retention policy** untuk raw_sensor_logs?
   - Keep berapa lama? (30 days, 90 days, 1 year?)
   - Auto-cleanup job?

2. **Partitioning**?
   - Data besar perlu partitioning by month?

3. **Re-parsing**?
   - Feature untuk re-parse old raw logs dengan profile baru?

---

**Ready to implement?** 🚀
