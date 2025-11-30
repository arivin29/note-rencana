# Enhanced Pairing Wizard - Specification

## 🎯 Overview

**Enhanced Pairing Dialog** dengan visual drag-drop mapping untuk pair unpaired device ke project dan auto-generate database structure (Node → Sensors → Channels).

## 📋 Requirements

### Core Principles
1. **JSON Only**: Semua payload format JSON
2. **Unique SN**: Setiap device punya SN/MAC unique (ESP32: eFuse MAC, FMB: Serial Number, Arduino: SN)
3. **Visual Mapping**: Drag payload fields → Drop ke DB structure
4. **Auto-Generate**: System create Node → Sensors → Channels otomatis

### User Flow
```
Unpaired Devices List
  → Click "Pair" on device
  → Wizard Step 1: View Device Info & Payload
  → Wizard Step 2: Select Project & Node Info
  → Wizard Step 3: Drag-Drop Mapping (MAIN FEATURE!)
  → Wizard Step 4: Review & Confirm
  → Wizard Step 5: Success & View Node
```

## 🎨 Wizard Steps Detail

### Step 1: Device Information
**Purpose**: Show device details dan raw payload

```
┌─────────────────────────────────────────────────────────────┐
│  Pair Device: 867584050123456                      [x Close] │
├─────────────────────────────────────────────────────────────┤
│  Step 1 of 4: Device Information                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Device Details:                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Hardware ID:     867584050123456                       ││
│  │  Node Model:      Generic LoRa Temperature Sensor       ││
│  │  First Seen:      30 days ago                           ││
│  │  Last Seen:       30 minutes ago                        ││
│  │  Activity Count:  45 transmissions                      ││
│  │  Status:          Pending                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Last Payload (JSON):                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ {                                                        ││
│  │   "sn": "867584050123456",                              ││
│  │   "temperature": 25.5,                                   ││
│  │   "humidity": 60.2,                                      ││
│  │   "battery": 85,                                         ││
│  │   "signal": -75,                                         ││
│  │   "timestamp": "2025-11-18T10:30:00Z"                   ││
│  │ }                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  📝 Note: This payload will be used for auto-mapping         │
│                                                               │
│                                        [Cancel]  [Next >]    │
└─────────────────────────────────────────────────────────────┘
```

**Data Shown**:
- Hardware ID (SN/MAC)
- Node Model (if detected)
- Activity stats
- **Full JSON payload** (formatted, dengan syntax highlighting)

**Actions**:
- Next: Go to Step 2

---

### Step 2: Project & Node Configuration
**Purpose**: Select project dan configure node details

```
┌─────────────────────────────────────────────────────────────┐
│  Pair Device: 867584050123456                      [x Close] │
├─────────────────────────────────────────────────────────────┤
│  Step 2 of 4: Project & Node Configuration                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Select Project: *                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [v] Smart Building - Jakarta Office              ▾      ││
│  └─────────────────────────────────────────────────────────┘│
│  💡 Suggested based on topic pattern                         │
│                                                               │
│  Node Information:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Node Code: *                                            ││
│  │  [TEMP-SENSOR-001                                      ] ││
│  │                                                          ││
│  │  Node Name:                                              ││
│  │  [Temperature Sensor - Floor 3                         ] ││
│  │                                                          ││
│  │  Description:                                            ││
│  │  [LoRa temperature sensor for monitoring room temp     ] ││
│  │  [on 3rd floor, near elevator                          ] ││
│  │                                                          ││
│  │  Serial Number: (Auto-filled)                            ││
│  │  [867584050123456                 ] (from payload SN)   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│                                 [< Back]  [Cancel]  [Next >] │
└─────────────────────────────────────────────────────────────┘
```

**Fields**:
- **Project**: Dropdown (with suggested project if available)
- **Node Code**: Required, auto-suggest dari hardware ID
- **Node Name**: Optional display name
- **Description**: Optional
- **Serial Number**: Auto-filled dari payload `sn` field atau hardware_id

**Validation**:
- Project required
- Node Code required, unique dalam project

---

### Step 3: Payload Mapping (MAIN FEATURE! 🎯)
**Purpose**: Visual drag-drop untuk map payload fields → Database structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  Pair Device: 867584050123456                             [x Close]  │
├──────────────────────────────────────────────────────────────────────┤
│  Step 3 of 4: Payload to Database Mapping                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐          ┌────────────────────────────────┐│
│  │  Payload Fields      │          │  Database Structure            ││
│  │  (Drag from here)    │          │  (Drop here)                   ││
│  ├──────────────────────┤          ├────────────────────────────────┤│
│  │                      │          │                                ││
│  │  📦 Root Object      │          │  🏢 Node: TEMP-SENSOR-001      ││
│  │    ├─ sn            │          │                                ││
│  │    ├─ 🌡️ temperature│─────────→│    📊 Sensor: Environmental    ││
│  │    ├─ 💧 humidity   │─────────→│      ├─ 📈 Channel: TEMP       ││
│  │    ├─ 🔋 battery    │─────────→│      │   Source: temperature   ││
│  │    ├─ 📡 signal     │─────────→│      │   Unit: °C              ││
│  │    └─ ⏰ timestamp  │          │      │   Type: Number          ││
│  │                      │          │      │                         ││
│  │  [+ Auto Map All]    │          │      ├─ 📈 Channel: HUM        ││
│  │  [🔄 Refresh]        │          │      │   Source: humidity      ││
│  │                      │          │      │   Unit: %               ││
│  │                      │          │      │   Type: Number          ││
│  │                      │          │      │                         ││
│  │                      │          │      ├─ 📈 Channel: BATTERY    ││
│  │                      │          │      │   Source: battery       ││
│  │                      │          │      │   Unit: %               ││
│  │                      │          │      │   Type: Number          ││
│  │                      │          │      │                         ││
│  │                      │          │      └─ 📈 Channel: SIGNAL     ││
│  │                      │          │          Source: signal        ││
│  │                      │          │          Unit: dBm             ││
│  │                      │          │          Type: Number          ││
│  │                      │          │                                ││
│  │                      │          │    [+ Add Sensor]              ││
│  └──────────────────────┘          └────────────────────────────────┘│
│                                                                        │
│  💡 Tips: Drag fields to create channels. Click channel to configure. │
│                                                                        │
│  Mapping Summary: 4 channels mapped • 1 sensor created                │
│                                                                        │
│                                  [< Back]  [Cancel]  [Next: Review >] │
└──────────────────────────────────────────────────────────────────────┘
```

#### Left Panel: Payload Fields
**Features**:
- Tree view dari JSON structure
- Icon untuk setiap data type (🌡️ number, 💬 string, 📅 date, etc.)
- **Draggable** items
- Auto-detect field types
- Special handling untuk `sn`, `timestamp` (tidak perlu di-map ke channel)

**Auto-detection**:
```typescript
{
  "temperature": 25.5   → Detected as: Temperature sensor, Unit: °C
  "humidity": 60        → Detected as: Humidity sensor, Unit: %
  "battery": 85         → Detected as: Battery level, Unit: %
  "signal": -75         → Detected as: Signal strength, Unit: dBm
}
```

#### Right Panel: Database Structure
**Hierarchy**:
```
Node (auto-created)
  └─ Sensor (user can add multiple)
      └─ Channel (drag-drop here)
          ├─ Source field
          ├─ Unit
          ├─ Data type
          ├─ Multiplier (optional)
          └─ Offset (optional)
```

**Actions**:
- **Drag field → Drop to Sensor**: Create new channel
- **Click Sensor**: Rename, change description
- **Click Channel**: Configure properties:
  ```
  ┌─────────────────────────────────────┐
  │  Configure Channel: TEMP            │
  ├─────────────────────────────────────┤
  │  Channel Code: [TEMP           ]    │
  │  Display Name: [Temperature    ]    │
  │  Source Field: [temperature    ]    │
  │  Data Type:    [Number ▾       ]    │
  │  Unit:         [°C             ]    │
  │  Multiplier:   [1.0            ]    │
  │  Offset:       [0.0            ]    │
  │  Min Value:    [-50            ]    │
  │  Max Value:    [100            ]    │
  │                                     │
  │          [Cancel]  [Save]           │
  └─────────────────────────────────────┘
  ```
- **[+ Add Sensor]**: Create additional sensor (e.g., "Power", "Environment")
- **Delete Channel**: Click trash icon
- **[+ Auto Map All]**: Auto-generate semua channels berdasarkan payload

#### Auto-Map Logic
Ketika user click **[+ Auto Map All]**:

1. Analyze payload structure
2. Detect common sensor patterns:
   - `temp`, `temperature` → TEMP channel (°C)
   - `hum`, `humidity` → HUM channel (%)
   - `battery`, `bat`, `batt` → BATTERY channel (%)
   - `signal`, `rssi` → SIGNAL channel (dBm)
   - `voltage`, `volt` → VOLTAGE channel (V)
   - `current`, `curr` → CURRENT channel (A)
   - `power` → POWER channel (W)
3. Group by sensor type:
   - Environment: temp, humidity
   - Power: battery, voltage, current
   - Network: signal, rssi
4. Create Sensors and Channels automatically
5. User can edit/delete after

---

### Step 4: Review & Confirm
**Purpose**: Preview apa yang akan di-create sebelum save

```
┌─────────────────────────────────────────────────────────────┐
│  Pair Device: 867584050123456                      [x Close] │
├─────────────────────────────────────────────────────────────┤
│  Step 4 of 4: Review & Confirm                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Review Summary:                                              │
│                                                               │
│  📦 Node to be Created:                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Project:       Smart Building - Jakarta Office         ││
│  │  Node Code:     TEMP-SENSOR-001                         ││
│  │  Node Name:     Temperature Sensor - Floor 3            ││
│  │  Serial Number: 867584050123456                         ││
│  │  Node Model:    Generic LoRa Temperature Sensor         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  📊 Sensors & Channels to be Created:                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Sensor 1: Environmental Monitoring                     ││
│  │    ├─ TEMP       (temperature)    °C                    ││
│  │    ├─ HUM        (humidity)       %                     ││
│  │    ├─ BATTERY    (battery)        %                     ││
│  │    └─ SIGNAL     (signal)         dBm                   ││
│  │                                                          ││
│  │  Total: 1 sensor, 4 channels                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  🔍 Next Steps After Pairing:                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ✓ Node will be created in project                     ││
│  │  ✓ Sensors and channels will be auto-generated         ││
│  │  ✓ Device status will change to 'paired'               ││
│  │  ✓ Future data will be logged to sensor_logs           ││
│  │  ✓ Payload mapping will be saved as Node Profile       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ☑️ Save this mapping as reusable profile                    │
│     Profile Name: [LoRa Temp Sensor - Standard Mapping   ]   │
│                                                               │
│                      [< Back]  [Cancel]  [✓ Pair Device]     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Summary semua yang akan dibuat
- Option: Save mapping as reusable profile (untuk device serupa di masa depan)
- Final confirmation

**On [✓ Pair Device] click**:
1. Create Node in project
2. Create Sensor(s) for Node
3. Create Channels for each Sensor
4. Save mapping as NodeProfile (if checkbox checked)
5. Update unpaired_device status to 'paired'
6. Link unpaired_device.paired_node_id to new Node
7. Show success message

---

### Step 5: Success
**Purpose**: Confirmation dan quick actions

```
┌─────────────────────────────────────────────────────────────┐
│  Device Paired Successfully!                       [x Close] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│              ✓                                                │
│         SUCCESS!                                              │
│                                                               │
│  Device 867584050123456 has been paired successfully!         │
│                                                               │
│  Created:                                                     │
│  • 1 Node:     TEMP-SENSOR-001                                │
│  • 1 Sensor:   Environmental Monitoring                       │
│  • 4 Channels: TEMP, HUM, BATTERY, SIGNAL                     │
│  • 1 Profile:  LoRa Temp Sensor - Standard Mapping (saved)    │
│                                                               │
│  Next Steps:                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  [🔍 View Node Details]                                 ││
│  │  [📊 View Telemetry Dashboard]                          ││
│  │  [⚙️  Configure Alerts]                                  ││
│  │  [🔄 Pair Another Device]                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│                                                     [Close]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Component Structure
```
pairing-wizard/
├── pairing-wizard.component.ts       # Main wizard controller
├── pairing-wizard.component.html     # Stepper layout
├── pairing-wizard.component.scss
├── steps/
│   ├── step1-device-info/
│   │   ├── device-info.component.ts
│   │   ├── device-info.component.html
│   │   └── device-info.component.scss
│   ├── step2-project-config/
│   │   ├── project-config.component.ts
│   │   ├── project-config.component.html
│   │   └── project-config.component.scss
│   ├── step3-payload-mapping/        # 🎯 CORE FEATURE
│   │   ├── payload-mapping.component.ts
│   │   ├── payload-mapping.component.html
│   │   ├── payload-mapping.component.scss
│   │   ├── payload-tree/             # Left panel
│   │   │   ├── payload-tree.component.ts
│   │   │   └── payload-tree.component.html
│   │   ├── db-structure/             # Right panel
│   │   │   ├── db-structure.component.ts
│   │   │   └── db-structure.component.html
│   │   └── channel-config-dialog/
│   │       ├── channel-config-dialog.component.ts
│   │       └── channel-config-dialog.component.html
│   ├── step4-review/
│   │   ├── review.component.ts
│   │   ├── review.component.html
│   │   └── review.component.scss
│   └── step5-success/
│       ├── success.component.ts
│       ├── success.component.html
│       └── success.component.scss
└── models/
    ├── pairing-wizard.model.ts
    ├── payload-field.model.ts
    ├── sensor-mapping.model.ts
    └── channel-mapping.model.ts
```

### Data Models

```typescript
// pairing-wizard.model.ts
export interface PairingWizardData {
  // Step 1
  device: UnpairedDeviceResponseDto;

  // Step 2
  projectId: string;
  nodeCode: string;
  nodeName: string;
  nodeDescription?: string;
  serialNumber: string;

  // Step 3
  sensors: SensorMapping[];
  saveAsProfile: boolean;
  profileName?: string;
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
  sourceField: string;  // JSONPath: "temperature" or "sensors.temp"
  dataType: 'number' | 'string' | 'boolean' | 'json';
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
  };
}
```

### Drag-Drop Implementation

**Using Angular CDK Drag-Drop:**

```typescript
// step3-payload-mapping.component.ts
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

export class PayloadMappingComponent {
  payloadFields: PayloadField[] = [];
  sensors: SensorMapping[] = [
    { id: uuid(), name: 'Default Sensor', channels: [] }
  ];

  ngOnInit() {
    this.analyzePayload();
  }

  analyzePayload() {
    const payload = this.wizardData.device.lastPayload;
    this.payloadFields = this.extractFields(payload);
    this.detectFieldTypes();
  }

  extractFields(obj: any, prefix = ''): PayloadField[] {
    const fields: PayloadField[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const type = this.detectType(value);

      // Skip metadata fields
      if (['sn', 'timestamp', 'ts', 'deviceId'].includes(key)) {
        continue;
      }

      fields.push({
        key,
        path,
        value,
        type,
        detected: this.autoDetectChannel(key, value, type)
      });

      // Recursive for nested objects
      if (type === 'object' && value) {
        fields.push(...this.extractFields(value, path));
      }
    }

    return fields;
  }

  autoDetectChannel(key: string, value: any, type: string) {
    const patterns = {
      temp: { code: 'TEMP', name: 'Temperature', unit: '°C' },
      temperature: { code: 'TEMP', name: 'Temperature', unit: '°C' },
      hum: { code: 'HUM', name: 'Humidity', unit: '%' },
      humidity: { code: 'HUM', name: 'Humidity', unit: '%' },
      battery: { code: 'BATTERY', name: 'Battery Level', unit: '%' },
      bat: { code: 'BATTERY', name: 'Battery Level', unit: '%' },
      signal: { code: 'SIGNAL', name: 'Signal Strength', unit: 'dBm' },
      rssi: { code: 'SIGNAL', name: 'Signal Strength', unit: 'dBm' },
      voltage: { code: 'VOLTAGE', name: 'Voltage', unit: 'V' },
      current: { code: 'CURRENT', name: 'Current', unit: 'A' },
      power: { code: 'POWER', name: 'Power', unit: 'W' },
    };

    const lowerKey = key.toLowerCase();
    for (const [pattern, config] of Object.entries(patterns)) {
      if (lowerKey.includes(pattern)) {
        return config;
      }
    }

    return null;
  }

  onFieldDrop(event: CdkDragDrop<any>, sensor: SensorMapping) {
    if (event.previousContainer !== event.container) {
      const field: PayloadField = event.previousContainer.data[event.previousIndex];

      const channel: ChannelMapping = {
        id: uuid(),
        code: field.detected?.channelCode || field.key.toUpperCase(),
        displayName: field.detected?.displayName || field.key,
        sourceField: field.path,
        dataType: field.type as any,
        unit: field.detected?.unit,
        multiplier: 1,
        offset: 0
      };

      sensor.channels.push(channel);
    }
  }

  autoMapAll() {
    // Clear existing mappings
    this.sensors = [];

    // Group fields by sensor type
    const envFields = this.payloadFields.filter(f =>
      ['temp', 'hum'].some(k => f.key.toLowerCase().includes(k))
    );
    const powerFields = this.payloadFields.filter(f =>
      ['battery', 'voltage', 'current', 'power'].some(k => f.key.toLowerCase().includes(k))
    );
    const networkFields = this.payloadFields.filter(f =>
      ['signal', 'rssi'].some(k => f.key.toLowerCase().includes(k))
    );

    if (envFields.length > 0) {
      this.sensors.push({
        id: uuid(),
        name: 'Environmental',
        channels: envFields.map(f => this.fieldToChannel(f))
      });
    }

    if (powerFields.length > 0) {
      this.sensors.push({
        id: uuid(),
        name: 'Power',
        channels: powerFields.map(f => this.fieldToChannel(f))
      });
    }

    if (networkFields.length > 0) {
      this.sensors.push({
        id: uuid(),
        name: 'Network',
        channels: networkFields.map(f => this.fieldToChannel(f))
      });
    }

    // Remaining fields go to "Other" sensor
    const mapped = [...envFields, ...powerFields, ...networkFields];
    const remaining = this.payloadFields.filter(f => !mapped.includes(f));
    if (remaining.length > 0) {
      this.sensors.push({
        id: uuid(),
        name: 'Other',
        channels: remaining.map(f => this.fieldToChannel(f))
      });
    }
  }

  fieldToChannel(field: PayloadField): ChannelMapping {
    return {
      id: uuid(),
      code: field.detected?.channelCode || field.key.toUpperCase(),
      displayName: field.detected?.displayName || field.key,
      sourceField: field.path,
      dataType: field.type as any,
      unit: field.detected?.unit,
      multiplier: 1,
      offset: 0
    };
  }
}
```

### Backend API Needed

**Endpoint untuk pairing dengan mapping:**

```typescript
// POST /api/unpaired-devices/:id/pair-with-mapping
{
  projectId: string;
  nodeCode: string;
  nodeName: string;
  nodeDescription?: string;
  sensors: [
    {
      name: string;
      description?: string;
      channels: [
        {
          code: string;
          displayName: string;
          sourceField: string;  // JSONPath
          dataType: string;
          unit?: string;
          multiplier?: number;
          offset?: number;
        }
      ]
    }
  ];
  saveAsProfile: boolean;
  profileName?: string;
}

// Response
{
  success: true;
  node: { idNode, code, name },
  sensors: [{ idSensor, name, channelCount }],
  profile?: { idNodeProfile, code, name }
}
```

---

## 📊 Libraries Needed

### Angular CDK Drag-Drop
```bash
npm install @angular/cdk
```

```typescript
// app.module.ts or wizard.module.ts
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [DragDropModule]
})
```

### Optional: JSONPath Library
```bash
npm install jsonpath
```

For advanced payload parsing (nested objects, arrays).

---

## 🎯 Implementation Priority

### Phase 1: MVP (Quick Win - 4-6 hours)
1. ✅ Replace simple pairing dialog dengan wizard (4 steps)
2. ✅ Step 1: Show device info + payload
3. ✅ Step 2: Project + Node config
4. ✅ Step 3: **Simple table-based mapping** (tanpa drag-drop dulu)
   - Table: Left = Payload fields, Right = DB channel config
   - Manual input channel code, unit, etc.
5. ✅ Step 4: Review & save
6. ✅ Backend endpoint: `POST /pair-with-mapping`

### Phase 2: Visual Drag-Drop (6-8 hours)
7. ✅ Implement Angular CDK drag-drop
8. ✅ Left panel: Tree view payload
9. ✅ Right panel: Sensors → Channels hierarchy
10. ✅ Drag field → Drop to sensor → Create channel
11. ✅ Channel config dialog
12. ✅ Auto-map all button

### Phase 3: Polish & UX (2-4 hours)
13. ✅ Icons untuk field types
14. ✅ Syntax highlighting untuk JSON
15. ✅ Save as profile option
16. ✅ Success page dengan quick actions
17. ✅ Loading states, error handling
18. ✅ Responsive design

**Total Estimate: 12-18 hours**

---

## 🚀 Next Steps

**Mau saya start implement?**

**Rekomendasi saya:**
1. Start dengan **Phase 1 (MVP)** - table-based mapping
   - Faster to implement (4-6 jam)
   - Functional immediately
   - Test backend integration first

2. Kemudian upgrade ke **Phase 2** - drag-drop
   - Better UX
   - More visual
   - Easier for non-technical users

**Atau langsung ke Phase 2 (full drag-drop)?**

Mari kita diskusikan approach mana yang lebih sesuai dengan timeline Anda!
