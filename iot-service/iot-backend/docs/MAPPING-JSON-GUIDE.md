# mapping_json - Device Data Transformation Guide

**Purpose**: Transform raw device payload → structured sensor data untuk database  
**Location**: `node_profiles.mapping_json` column (JSONB)  
**Use Case**: Setiap device type punya format data berbeda, mapping_json mengubahnya ke format standar kita

---

## 🎯 **Konsep Dasar**

### Problem Statement

Setiap alat IoT kirim data dengan format berbeda-beda:

**Device A (JSON Simple)**:
```json
{
  "device": "NODE-001",
  "time": "2025-11-17T10:00:00Z",
  "pressure": 2.5,
  "flow": 150.3,
  "battery": 12.4
}
```

**Device B (Nested JSON)**:
```json
{
  "deviceId": "FMB-130-001",
  "timestamp": 1700218800,
  "sensors": {
    "analog_input_1": 1234,
    "analog_input_2": 5678,
    "battery_voltage": 124
  }
}
```

**Device C (Teltonika Binary)**:
```
Binary: 0x08 0x01 0x00 0x00 ... (Codec 8 format)
```

### Solution: mapping_json

`mapping_json` adalah **recipe/resep** yang memberitahu backend:
1. **Di mana** nilai pressure/flow/battery dalam payload
2. **Bagaimana** mengkonversi nilai mentah → nilai engineering
3. **Ke channel mana** data harus disimpan

---

## 📐 **mapping_json Structure**

### Complete Schema

```typescript
interface MappingJson {
  version: number;                    // Schema version (for backward compatibility)
  payload_format: string;             // 'json' | 'binary' | 'xml' | 'csv'
  timestamp_path?: string;            // JSONPath to extract timestamp
  device_id_path?: string;            // JSONPath to extract device ID
  channels: ChannelMapping[];         // Array of channel mappings
}

interface ChannelMapping {
  metric_code: string;                // Match ke sensor_channels.metric_code
  source_path: string;                // JSONPath/XPath to extract value
  multiplier?: number;                // Multiply raw value (default: 1)
  offset?: number;                    // Add offset after multiply (default: 0)
  unit?: string;                      // Unit of measurement
  validation?: ValidationRule;        // Optional validation
  transformation?: string;            // Custom formula (future)
}

interface ValidationRule {
  min?: number;                       // Minimum valid value
  max?: number;                       // Maximum valid value
  required?: boolean;                 // Is this value required?
}
```

---

## 🔧 **Real-World Examples**

### Example 1: Simple Water Meter (JSON)

**Device Payload**:
```json
{
  "device": "WM-001",
  "ts": "2025-11-17T10:00:00Z",
  "pressure": 25,        // Raw value dalam mbar
  "flow": 105,           // Raw value dalam 0.1 lps
  "battery": 124,        // Raw value dalam decivolts (0.1V)
  "temperature": 285     // Raw value dalam 0.1°C
}
```

**mapping_json Configuration**:
```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": "$.ts",
  "device_id_path": "$.device",
  "channels": [
    {
      "metric_code": "pressure",
      "source_path": "$.pressure",
      "multiplier": 0.01,
      "offset": 0,
      "unit": "bar",
      "validation": {
        "min": 0,
        "max": 10,
        "required": true
      }
    },
    {
      "metric_code": "flow",
      "source_path": "$.flow",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "lps"
    },
    {
      "metric_code": "battery",
      "source_path": "$.battery",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "V",
      "validation": {
        "min": 0,
        "max": 24
      }
    },
    {
      "metric_code": "temperature",
      "source_path": "$.temperature",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "°C"
    }
  ]
}
```

**Processing Flow**:
```
Raw: pressure = 25
↓ Apply multiplier: 25 × 0.01 = 0.25
↓ Apply offset: 0.25 + 0 = 0.25
↓ Validate: 0 ≤ 0.25 ≤ 10 ✅
Result: 0.25 bar
```

---

### Example 2: Teltonika FMB130 (Nested JSON)

**Device Payload**:
```json
{
  "deviceId": "352093085332777",
  "timestamp": 1700218800,
  "codec": 8,
  "io": {
    "ain1": 1234,    // Analog Input 1 (pressure sensor, 0-5000 mV)
    "ain2": 2345,    // Analog Input 2 (level sensor, 0-5000 mV)
    "din1": 1,       // Digital Input 1 (pump status)
    "pwr_ext": 124   // External power voltage (0.1V)
  },
  "gnss": {
    "lat": -6.2088,
    "lng": 106.8456,
    "alt": 50
  }
}
```

**mapping_json Configuration**:
```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": "$.timestamp",
  "device_id_path": "$.deviceId",
  "channels": [
    {
      "metric_code": "pressure",
      "source_path": "$.io.ain1",
      "multiplier": 0.001,
      "offset": 0,
      "unit": "bar",
      "validation": {
        "min": 0,
        "max": 5,
        "required": true
      }
    },
    {
      "metric_code": "level",
      "source_path": "$.io.ain2",
      "multiplier": 0.002,
      "offset": 0,
      "unit": "m"
    },
    {
      "metric_code": "pump_status",
      "source_path": "$.io.din1",
      "multiplier": 1,
      "offset": 0,
      "unit": "boolean"
    },
    {
      "metric_code": "voltage",
      "source_path": "$.io.pwr_ext",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "V"
    },
    {
      "metric_code": "latitude",
      "source_path": "$.gnss.lat",
      "multiplier": 1,
      "offset": 0,
      "unit": "degrees"
    },
    {
      "metric_code": "longitude",
      "source_path": "$.gnss.lng",
      "multiplier": 1,
      "offset": 0,
      "unit": "degrees"
    }
  ]
}
```

---

### Example 3: LoRaWAN Device (Hex Payload)

**Device Payload** (after LoRaWAN decoding):
```json
{
  "devEui": "0004A30B001A2B3C",
  "fPort": 1,
  "timestamp": "2025-11-17T10:00:00Z",
  "data": "010267014503E8",  // Hex string
  "decoded": {
    "temperature": 615,   // Raw: 0x0267 = 615 (×0.1 = 61.5°C)
    "humidity": 325,      // Raw: 0x0145 = 325 (×0.1 = 32.5%)
    "battery": 1000       // Raw: 0x03E8 = 1000 (mV)
  }
}
```

**mapping_json Configuration**:
```json
{
  "version": 1,
  "payload_format": "json",
  "timestamp_path": "$.timestamp",
  "device_id_path": "$.devEui",
  "channels": [
    {
      "metric_code": "temperature",
      "source_path": "$.decoded.temperature",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "°C",
      "validation": {
        "min": -40,
        "max": 85
      }
    },
    {
      "metric_code": "humidity",
      "source_path": "$.decoded.humidity",
      "multiplier": 0.1,
      "offset": 0,
      "unit": "%",
      "validation": {
        "min": 0,
        "max": 100
      }
    },
    {
      "metric_code": "battery",
      "source_path": "$.decoded.battery",
      "multiplier": 0.001,
      "offset": 0,
      "unit": "V",
      "validation": {
        "min": 0,
        "max": 5
      }
    }
  ]
}
```

---

## 🔄 **Backend Processing Logic**

### Pseudo-code untuk MQTT Ingestion

```typescript
async function processMqttMessage(topic: string, payload: Buffer) {
  // 1. Extract hardware_id dari topic atau payload
  const hardwareId = extractHardwareId(topic, payload);
  
  // 2. Cari node di database
  const node = await nodeRepository.findOne({ 
    where: { devEui: hardwareId },
    relations: ['nodeProfile', 'sensors']
  });
  
  if (!node) {
    // Device belum terdaftar → save ke unpaired_devices
    await saveToUnpairedDevices(hardwareId, payload, topic);
    return;
  }
  
  // 3. Get node profile (mapping configuration)
  const profile = node.nodeProfile;
  if (!profile || !profile.enabled) {
    console.warn(`No active profile for node ${node.code}`);
    return;
  }
  
  // 4. Parse payload berdasarkan parser_type
  let parsedData: any;
  switch (profile.parserType) {
    case 'json_path':
      parsedData = JSON.parse(payload.toString());
      break;
    case 'teltonika_codec_8':
      parsedData = parseTeltonikaCodec8(payload);
      break;
    case 'custom_script':
      parsedData = executeCustomScript(profile.transformScript, payload);
      break;
  }
  
  // 5. Extract timestamp
  const timestamp = profile.mappingJson.timestamp_path 
    ? jsonPath.query(parsedData, profile.mappingJson.timestamp_path)[0]
    : new Date();
  
  // 6. Process setiap channel mapping
  for (const channelMapping of profile.mappingJson.channels) {
    // 6a. Extract raw value menggunakan JSONPath
    const rawValues = jsonPath.query(parsedData, channelMapping.source_path);
    if (rawValues.length === 0) {
      console.warn(`No value found at ${channelMapping.source_path}`);
      continue;
    }
    const rawValue = rawValues[0];
    
    // 6b. Apply transformation (multiplier + offset)
    const multiplier = channelMapping.multiplier ?? 1;
    const offset = channelMapping.offset ?? 0;
    const engineeredValue = (rawValue * multiplier) + offset;
    
    // 6c. Validate value
    if (channelMapping.validation) {
      const { min, max, required } = channelMapping.validation;
      if (required && (rawValue === null || rawValue === undefined)) {
        console.error(`Required value missing: ${channelMapping.metric_code}`);
        continue;
      }
      if (min !== undefined && engineeredValue < min) {
        console.warn(`Value below min: ${engineeredValue} < ${min}`);
        continue;
      }
      if (max !== undefined && engineeredValue > max) {
        console.warn(`Value above max: ${engineeredValue} > ${max}`);
        continue;
      }
    }
    
    // 6d. Find sensor channel by metric_code
    const sensorChannel = await sensorChannelRepository.findOne({
      where: {
        sensor: { idNode: node.idNode },
        metricCode: channelMapping.metric_code
      }
    });
    
    if (!sensorChannel) {
      console.warn(`No sensor channel for metric_code: ${channelMapping.metric_code}`);
      continue;
    }
    
    // 6e. Insert ke sensor_logs
    await sensorLogRepository.insert({
      idSensorChannel: sensorChannel.idSensorChannel,
      timestamp: timestamp,
      valueRaw: rawValue,
      valueEngineered: engineeredValue,
      unit: channelMapping.unit,
      qualityFlag: 'good'
    });
  }
  
  // 7. Update node last_seen_at
  await nodeRepository.update(node.idNode, {
    lastSeenAt: new Date()
  });
}
```

---

## 📊 **JSONPath Reference**

### Common Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `$.field` | Root level field | `$.pressure` |
| `$.nested.field` | Nested object | `$.data.temperature` |
| `$[0]` | Array first element | `$[0].value` |
| `$.array[*]` | All array elements | `$.sensors[*].value` |
| `$..field` | Recursive descent | `$..temperature` |
| `$.field1,field2` | Multiple fields | `$.temp,$.humid` |

### Examples

**Payload**:
```json
{
  "device": "ABC",
  "data": {
    "sensors": [
      { "id": "s1", "value": 25.5 },
      { "id": "s2", "value": 60.2 }
    ]
  }
}
```

**JSONPath Queries**:
- `$.device` → `"ABC"`
- `$.data.sensors[0].value` → `25.5`
- `$.data.sensors[1].value` → `60.2`
- `$..value` → `[25.5, 60.2]`

---

## 🎨 **Use Cases by Industry**

### 1. Water Management (PDAM)

**Metrics**: Pressure, Flow, Level, Battery, Pump Status

```json
{
  "version": 1,
  "payload_format": "json",
  "channels": [
    {
      "metric_code": "pressure",
      "source_path": "$.sensors.pressure_mbar",
      "multiplier": 0.001,
      "unit": "bar"
    },
    {
      "metric_code": "flow",
      "source_path": "$.sensors.flow_pulses",
      "multiplier": 0.5,
      "unit": "m3/h"
    },
    {
      "metric_code": "level",
      "source_path": "$.sensors.level_cm",
      "multiplier": 0.01,
      "unit": "m"
    }
  ]
}
```

### 2. Smart Agriculture

**Metrics**: Soil Moisture, Temperature, Humidity, Light Intensity

```json
{
  "version": 1,
  "payload_format": "json",
  "channels": [
    {
      "metric_code": "soil_moisture",
      "source_path": "$.analog.moisture",
      "multiplier": 0.1,
      "unit": "%",
      "validation": { "min": 0, "max": 100 }
    },
    {
      "metric_code": "air_temp",
      "source_path": "$.sensors.temp",
      "multiplier": 0.1,
      "offset": -40,
      "unit": "°C"
    }
  ]
}
```

### 3. Industrial IoT

**Metrics**: Vibration, Pressure, Temperature, RPM

```json
{
  "version": 1,
  "payload_format": "json",
  "channels": [
    {
      "metric_code": "vibration",
      "source_path": "$.machine.vibration_mg",
      "multiplier": 0.001,
      "unit": "g"
    },
    {
      "metric_code": "rpm",
      "source_path": "$.machine.rotation",
      "multiplier": 1,
      "unit": "rpm"
    }
  ]
}
```

---

## 🧪 **Testing mapping_json**

### Test Endpoint

```http
POST /api/node-profiles/test-mapping
Content-Type: application/json

{
  "mappingJson": { ... },
  "samplePayload": { ... }
}

Response:
{
  "success": true,
  "results": [
    {
      "metric_code": "pressure",
      "raw_value": 25,
      "engineered_value": 0.25,
      "unit": "bar",
      "validation_passed": true
    },
    {
      "metric_code": "flow",
      "raw_value": 105,
      "engineered_value": 10.5,
      "unit": "lps",
      "validation_passed": true
    }
  ]
}
```

---

## ⚠️ **Best Practices**

### 1. Always Use Validation

```json
{
  "metric_code": "pressure",
  "source_path": "$.pressure",
  "multiplier": 0.01,
  "unit": "bar",
  "validation": {
    "min": 0,
    "max": 10,
    "required": true
  }
}
```

### 2. Document Units

Always specify `unit` untuk clarity:
```json
{ "unit": "bar" }    // ✅ Good
{ "unit": "kPa" }    // ✅ Good
{ "unit": "" }       // ❌ Bad
```

### 3. Use Descriptive metric_code

```json
{ "metric_code": "pressure" }              // ✅ Good
{ "metric_code": "inlet_pressure" }        // ✅ Better
{ "metric_code": "p1" }                    // ❌ Bad
```

### 4. Version Your Schemas

```json
{
  "version": 1,  // Start with v1
  // Later when structure changes:
  "version": 2
}
```

### 5. Handle Missing Values

```json
{
  "metric_code": "optional_sensor",
  "source_path": "$.sensors.optional",
  "validation": {
    "required": false  // Won't fail if missing
  }
}
```

---

## 🚀 **Migration Strategy**

### Adding New Device Type

1. **Create node_model** (if not exists)
2. **Create node_profile** with mapping_json
3. **Test** dengan sample payload
4. **Deploy** profile
5. **Monitor** first devices

### Updating Existing Profile

1. **Clone** existing profile
2. **Increment** version number
3. **Test** thoroughly
4. **Switch** nodes to new profile
5. **Monitor** and rollback if needed

---

## 📖 **Additional Resources**

- **JSONPath Spec**: https://goessner.net/articles/JsonPath/
- **Teltonika Codec 8**: https://wiki.teltonika-gps.com/view/Codec
- **LoRaWAN Payload Formats**: https://lora-alliance.org/

---

**Next Steps**: Implement parser service dengan JSONPath library (jsonpath-plus)

