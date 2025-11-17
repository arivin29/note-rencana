# Node Profile (Payload Parsing) - Proposal & Implementation Plan

## 📋 Overview

**Node Profile** adalah sistem untuk mendefinisikan bagaimana **raw payload** dari IoT device (node) di-parse dan di-mapping ke **sensor channels** yang sesuai di database.

## 🎯 Problem Statement

Saat ini kita punya beberapa masalah:

### 1. Unpaired Devices dengan Format Berbeda
Dari seed data yang kita buat, ada berbagai format payload:

**LoRa Sensor:**
```json
{
  "temperature": 25.5,
  "humidity": 60,
  "battery": 85
}
```

**ESP32 Device:**
```json
{
  "sensors": {
    "temp": 26.4,
    "hum": 58
  },
  "device": {
    "uptime": 86400,
    "heap": 45000
  }
}
```

**WiFi Power Meter:**
```json
{
  "voltage": 3.3,
  "current": 0.5,
  "power": 1.65
}
```

### 2. Bagaimana Data Flow Seharusnya?

```
IoT Device → MQTT Broker → Backend Listener → Parse with NodeProfile → sensor_logs table
```

**Current situation**:
- ❌ Unpaired device payloads masuk ke `node_unpaired_devices.last_payload` (JSONB)
- ❌ Belum ada sistem parsing otomatis
- ❌ Admin harus manual assign node profile saat pairing

**What we need**:
- ✅ NodeProfile management (CRUD)
- ✅ Visual profile builder (GUI untuk mapping)
- ✅ Auto-detect profile dari payload structure
- ✅ Test profile dengan sample payload
- ✅ Apply profile saat pairing unpaired device

## 🏗️ Entity Analysis

### NodeProfile Entity (Already Exists ✅)

```typescript
export interface MappingJson {
  version: number;              // e.g., 1
  payload_format: string;       // e.g., "json", "lorawan", "modbus"
  timestamp_path?: string;      // JSONPath: "$.timestamp" or "data.ts"
  channels: ChannelMapping[];   // Array of channel mappings
}

export interface ChannelMapping {
  metric_code: string;     // e.g., "TEMP", "HUM", "BATTERY"
  source_path: string;     // JSONPath: "$.temperature" or "sensors.temp"
  multiplier?: number;     // e.g., 0.1 (untuk konversi unit)
  offset?: number;         // e.g., -273.15 (Kelvin to Celsius)
  unit?: string;           // e.g., "°C", "%", "V"
}
```

### Example Profile for LoRa Sensor

```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": null,
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
    }
  ]
}
```

### Example Profile for ESP32 (Nested JSON)

```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": null,
  "channels": [
    {
      "metric_code": "TEMP",
      "source_path": "sensors.temp",
      "multiplier": 1,
      "offset": 0,
      "unit": "°C"
    },
    {
      "metric_code": "HUM",
      "source_path": "sensors.hum",
      "multiplier": 1,
      "offset": 0,
      "unit": "%"
    },
    {
      "metric_code": "UPTIME",
      "source_path": "device.uptime",
      "multiplier": 1,
      "offset": 0,
      "unit": "seconds"
    }
  ]
}
```

## 📦 Implementation Plan

### Phase 1: Backend Module ✅ (Prioritas Tinggi)

**Module**: `node-profiles`

#### 1.1 DTOs
- `CreateNodeProfileDto`
- `UpdateNodeProfileDto`
- `NodeProfileResponseDto`
- `TestProfileDto` (untuk test parsing dengan sample payload)

#### 1.2 Service Methods
```typescript
class NodeProfilesService {
  // CRUD
  create(dto: CreateNodeProfileDto): Promise<NodeProfile>
  findAll(filters: { nodeModelId?, projectId? }): Promise<NodeProfile[]>
  findOne(id: string): Promise<NodeProfile>
  update(id: string, dto: UpdateNodeProfileDto): Promise<NodeProfile>
  delete(id: string): Promise<void>

  // Special Operations
  testProfile(profileId: string, samplePayload: any): Promise<ParsedResult>
  findByNodeModel(nodeModelId: string): Promise<NodeProfile[]>
  detectProfileForPayload(nodeModelId: string, payload: any): Promise<NodeProfile | null>
  applyProfile(profile: NodeProfile, payload: any): Promise<ParsedChannels[]>
}
```

#### 1.3 Controller Endpoints
```
POST   /api/node-profiles                    - Create profile
GET    /api/node-profiles                    - List all with filters
GET    /api/node-profiles/:id                - Get by ID
PUT    /api/node-profiles/:id                - Update profile
DELETE /api/node-profiles/:id                - Delete profile
POST   /api/node-profiles/:id/test           - Test with sample payload
GET    /api/node-profiles/by-model/:modelId  - Get profiles for model
POST   /api/node-profiles/detect             - Auto-detect profile
```

### Phase 2: Frontend Module ✅ (Prioritas Tinggi)

**Route**: `/iot/node-profiles`

#### 2.1 Components Structure
```
node-profiles/
├── node-profiles-list/          # List all profiles
│   ├── node-profiles-list.ts
│   ├── node-profiles-list.html
│   └── node-profiles-list.scss
├── node-profile-form/           # Create/Edit profile
│   ├── node-profile-form.ts     # Wizard-style form
│   ├── node-profile-form.html
│   └── node-profile-form.scss
├── profile-builder/             # Visual mapping builder
│   ├── profile-builder.ts
│   ├── profile-builder.html     # Drag-and-drop interface
│   └── profile-builder.scss
├── profile-tester/              # Test profile dialog
│   ├── profile-tester.ts
│   ├── profile-tester.html
│   └── profile-tester.scss
└── node-profiles.module.ts
```

#### 2.2 Key Features

**Profile List Page:**
- Filter by node model
- Filter by project
- Show profile details (code, name, parser type)
- Actions: Edit, Delete, Test, Duplicate

**Profile Builder (Visual Editor):**
1. **Step 1: Basic Info**
   - Profile code, name, description
   - Select node model
   - Select parser type (JSON, LoRaWAN, Modbus, Custom)

2. **Step 2: Sample Payload Input**
   - Paste sample JSON payload
   - Auto-detect structure
   - Show parsed tree view

3. **Step 3: Channel Mapping**
   - Left panel: Payload structure (tree view)
   - Right panel: Available sensor channels
   - Drag field from payload → Drop to channel
   - Configure multiplier/offset/unit

4. **Step 4: Test & Preview**
   - Test with multiple sample payloads
   - Show parsed result preview
   - Validate all channels mapped correctly

5. **Step 5: Save Profile**
   - Assign to project (optional)
   - Enable/disable profile
   - Save

### Phase 3: Integration dengan Unpaired Devices ✅

#### 3.1 Saat Pairing Device

**Current Flow:**
```
User clicks "Pair" → Select Project → Create Node → Done
```

**Enhanced Flow:**
```
User clicks "Pair"
→ Select Project
→ Select/Create Node Profile (NEW!)
→ Preview parsed channels
→ Create Node with profile
→ Done
```

#### 3.2 Update Pairing Dialog

Add field:
```typescript
{
  projectId: string;
  nodeName: string;
  nodeDescription?: string;
  nodeProfileId?: string;  // NEW: Select from existing or create new
}
```

Dialog sections:
1. **Basic Info**: Project, Node Name
2. **Profile Selection** (NEW):
   - Dropdown: Existing profiles for this node model
   - Button: "Create New Profile" (opens profile builder)
   - Preview: Show what channels will be created
3. **Confirm & Pair**

### Phase 4: Auto-Detection System ⚡ (Bonus Feature)

**Smart Profile Detection:**

```typescript
// When unpaired device sends data
async function onUnpairedDeviceData(hardwareId: string, payload: any) {
  // 1. Store in node_unpaired_devices
  await unpairedDevicesService.registerActivity(hardwareId, payload);

  // 2. Try to detect node model from payload structure
  const detectedModel = await detectNodeModel(payload);

  // 3. Try to find matching profile
  if (detectedModel) {
    const profile = await nodeProfilesService.detectProfileForPayload(
      detectedModel.id,
      payload
    );

    if (profile) {
      // Auto-suggest pairing with this profile
      await unpairedDevicesService.update(device.id, {
        idNodeModel: detectedModel.id,
        suggestedProfile: profile.id  // NEW field
      });
    }
  }
}
```

## 🎨 UI/UX Mockup Ideas

### Profile Builder - Step 3 (Mapping)

```
┌─────────────────────────────────────────────────────────────┐
│  Node Profile Builder                              [x Close] │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Map Payload to Channels                    (3 of 5)│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌───────────────────────────────┐ │
│  │ Payload Structure   │  │ Sensor Channels               │ │
│  ├─────────────────────┤  ├───────────────────────────────┤ │
│  │ 📦 root             │  │ ✓ TEMP (Temperature)          │ │
│  │   ├─ temperature    │──┼──→ Source: temperature        │ │
│  │   ├─ humidity       │──┼──→ HUM (Humidity)             │ │
│  │   ├─ battery        │──┼──→ BATTERY (Battery Level)    │ │
│  │   └─ signal         │  │   SIGNAL (Signal Strength)    │ │
│  │                     │  │   [+ Add Custom Channel]      │ │
│  └─────────────────────┘  └───────────────────────────────┘ │
│                                                               │
│  Selected Mapping: temperature → TEMP                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Multiplier: [1.0    ] Offset: [0.0    ] Unit: [°C    ] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│                        [< Back]  [Next: Test >]              │
└─────────────────────────────────────────────────────────────┘
```

### Profile Tester

```
┌─────────────────────────────────────────────────────────────┐
│  Test Profile: LoRa-Temp-Sensor-v1                 [x Close] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Sample Payload:                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ {                                                        ││
│  │   "temperature": 25.5,                                   ││
│  │   "humidity": 60,                                        ││
│  │   "battery": 85                                          ││
│  │ }                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                     [Test]    │
│                                                               │
│  Parsed Result:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✓ TEMP:     25.5 °C    (from: temperature)              ││
│  │ ✓ HUM:      60.0 %     (from: humidity)                 ││
│  │ ✓ BATTERY:  85.0 %     (from: battery)                  ││
│  │                                                          ││
│  │ Status: ✓ All channels mapped successfully!             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│                                     [Close]  [Save Profile]  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Implementation Priority

### Must Have (P0) - For MVP
1. ✅ Backend: Node Profiles CRUD module
2. ✅ Backend: Basic parsing logic (JSON only)
3. ✅ Frontend: Profile list page
4. ✅ Frontend: Simple profile form (manual JSON input)
5. ✅ Integration: Select profile during pairing

### Should Have (P1) - Enhanced UX
6. ✅ Frontend: Visual profile builder (drag-and-drop)
7. ✅ Frontend: Profile tester dialog
8. ✅ Backend: Test profile endpoint
9. ✅ Frontend: Auto-detect structure from sample payload

### Nice to Have (P2) - Advanced Features
10. ⚡ Backend: Auto-detect profile matching
11. ⚡ Backend: Support LoRaWAN byte parsing
12. ⚡ Backend: Support Modbus register mapping
13. ⚡ Backend: Custom JavaScript transform scripts
14. ⚡ Frontend: Import/Export profiles (JSON)
15. ⚡ Frontend: Profile templates library

## 📊 Database Impact

### New Seed Data Needed

Create sample profiles for testing:

```typescript
// seed-node-profiles.ts
const profiles = [
  {
    code: 'LORA-TEMP-V1',
    name: 'LoRa Temperature Sensor v1',
    nodeModel: 'LORA-TEMP-001',
    parserType: 'json',
    mappingJson: { /* ... */ }
  },
  {
    code: 'ESP32-ENV-V1',
    name: 'ESP32 Environmental Sensor v1',
    nodeModel: 'ESP32-GENERIC',
    parserType: 'json',
    mappingJson: { /* ... */ }
  }
];
```

### Update Unpaired Devices

Add optional field (future):
```sql
ALTER TABLE node_unpaired_devices
ADD COLUMN suggested_profile UUID REFERENCES node_profiles(id_node_profile);
```

## 🎯 Success Criteria

### User Story
**As an admin**, when I see an unpaired device with unknown payload format:
1. I can view the raw payload
2. I can create a new profile visually
3. I can map payload fields to sensor channels
4. I can test the profile before saving
5. I can apply the profile when pairing the device
6. The system automatically creates sensor channels and starts logging data

### Technical Metrics
- ✅ Profile creation time: < 2 minutes (with builder)
- ✅ Parsing performance: < 10ms per payload
- ✅ Support 3+ payload formats (JSON, LoRaWAN, Modbus)
- ✅ 90%+ profile reusability across similar devices

## 🤔 Questions to Clarify

1. **Parser Types**: Selain JSON, format apa yang paling umum?
   - LoRaWAN byte array?
   - Modbus register map?
   - Custom binary protocol?

2. **Transform Scripts**: Apakah perlu support JavaScript custom transformation?
   ```javascript
   // Example: Convert Kelvin to Celsius
   function transform(payload) {
     return {
       temperature: payload.temp - 273.15,
       humidity: payload.hum / 100
     };
   }
   ```

3. **Profile Scope**:
   - Per node model (semua device model yang sama pakai profile yang sama)?
   - Per project (project bisa override profile)?
   - Per node (setiap device bisa custom profile)?

4. **Validation**: Bagaimana handle parsing error?
   - Log error dan skip?
   - Alert admin?
   - Fallback ke raw data storage?

## 📝 Next Steps

**If you want to proceed:**

1. **Option A: Start with Backend (Recommended)**
   - Create node-profiles module (controller, service, DTOs)
   - Implement basic JSON parsing
   - Add test endpoint
   - Generate SDK for frontend

2. **Option B: Start with Frontend**
   - Create profile list page
   - Create simple profile form
   - Mock data for testing UI first

3. **Option C: Proof of Concept First**
   - Create minimal profile system
   - Test with 1-2 unpaired devices
   - Validate parsing logic
   - Then build full feature

**Mana yang mau kita lakukan dulu?**

---

**Created**: November 18, 2025
**Status**: 📋 Proposal - Awaiting Decision
**Estimated Effort**:
- Phase 1 (Backend): 4-6 hours
- Phase 2 (Frontend): 8-12 hours
- Phase 3 (Integration): 2-4 hours
- **Total**: ~14-22 hours
