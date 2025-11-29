# RS485 Config Database Integration - Implementation Summary

## ✅ **COMPLETE** - Database-Driven RS485 Config System

### 📊 Database Schema

```
nodes (device_id = code)
  ↓ (1:N)
sensors (id_node → nodes.id_node)
  ↓ (N:1)
sensor_catalogs (id_sensor_catalog)
  └─ default_channels_json (JSONB) ← RS485 Config!
```

---

## 🔧 Implementation

### 1. **New Entity: SensorCatalog**
**File:** `iot-gtw/src/entities/existing/sensor-catalog.entity.ts`

```typescript
@Entity('sensor_catalogs')
export class SensorCatalog {
  @PrimaryColumn('uuid', { name: 'id_sensor_catalog' })
  idSensorCatalog: string;

  @Column('text')
  vendor: string;

  @Column('text', { name: 'model_name' })
  modelName: string;

  @Column('jsonb', { nullable: true, name: 'default_channels_json' })
  defaultChannelsJson: any; // ← RS485 config stored here!
  
  // ... other fields
}
```

---

### 2. **Updated MqttService**
**File:** `iot-gtw/src/modules/mqtt/mqtt.service.ts`

**Changes:**
- Added `Sensor` and `SensorCatalog` repositories
- Replaced `getDummyRS485Config()` with `getRS485ConfigFromDatabase()`
- Support for multiple sensors per device
- Metadata enrichment (sensor_id, label, vendor, model)

**New Method:**
```typescript
private async getRS485ConfigFromDatabase(idNode: string): Promise<any[] | null> {
  // 1. Get all sensors for this node
  const sensors = await this.sensorRepository.find({ where: { idNode } });
  
  // 2. For each sensor, get catalog config
  const configs = [];
  for (const sensor of sensors) {
    const catalog = await this.sensorCatalogRepository.findOne({
      where: { idSensorCatalog: sensor.idSensorCatalog }
    });
    
    // 3. Extract default_channels_json
    if (catalog?.defaultChannelsJson) {
      configs.push({
        sensor_id: sensor.idSensor,
        sensor_label: sensor.label,
        vendor: catalog.vendor,
        model: catalog.modelName,
        ...catalog.defaultChannelsJson[0]
      });
    }
  }
  
  return configs.length > 0 ? configs : null;
}
```

---

### 3. **Updated Module**
**File:** `iot-gtw/src/modules/mqtt/mqtt.module.ts`

**Added repositories:**
```typescript
TypeOrmModule.forFeature([
  Node, 
  NodeUnpairedDevice, 
  Owner, 
  Sensor,           // ← NEW
  SensorCatalog     // ← NEW
])
```

---

## 📤 Response Format

### **Single Sensor Device**
```json
[
  {
    "sensor_id": "abc-123",
    "sensor_label": "Water Flow Meter",
    "vendor": "TUF",
    "model": "TUF-2000M",
    "version": 1,
    "modbus_address": 1,
    "baud_rate": 9600,
    "scan_interval_ms": 5000,
    "registers": [...]
  }
]
```

### **Multi-Sensor Device**
```json
[
  {
    "sensor_id": "abc-123",
    "sensor_label": "Flow Meter",
    "vendor": "TUF",
    "model": "TUF-2000M",
    "version": 1,
    "modbus_address": 1,
    "baud_rate": 9600,
    "registers": [...]
  },
  {
    "sensor_id": "def-456",
    "sensor_label": "Pressure Sensor",
    "vendor": "XYZ",
    "model": "PSI-1000",
    "version": 1,
    "modbus_address": 2,
    "baud_rate": 9600,
    "registers": [...]
  }
]
```

### **No Config**
```
null
```

---

## 🔍 Log Examples

### **Success (Single Sensor)**
```
🔧 Config request from device: DEMO1-00D42390A994 (payload: "request")
✅ Device DEMO1-00D42390A994 found - fetching RS485 configs from sensor catalogs
📡 Found 1 sensor(s) for node abc-123-def
✅ Loaded config for sensor: Water Flow Meter (TUF TUF-2000M)
📤 Config sent via stream_config: stream_config/DEMO1-00D42390A994
```

### **Success (Multiple Sensors)**
```
🔧 Config request from device: DEMO1-00D42390A994 (payload: "request")
✅ Device DEMO1-00D42390A994 found - fetching RS485 configs from sensor catalogs
📡 Found 3 sensor(s) for node abc-123-def
✅ Loaded config for sensor: Flow Meter (TUF TUF-2000M)
✅ Loaded config for sensor: Pressure Sensor (XYZ PSI-1000)
✅ Loaded config for sensor: Temperature Sensor (ABC TEMP-200)
📤 Config sent via stream_config: stream_config/DEMO1-00D42390A994
```

### **No Sensors**
```
🔧 Config request from device: DEMO1-00D42390A994 (payload: "request")
✅ Device DEMO1-00D42390A994 found - fetching RS485 configs from sensor catalogs
⚠️  No sensors found for node abc-123-def
⚠️  No sensor configs found for device DEMO1-00D42390A994
📤 Config sent via stream_config: stream_config/DEMO1-00D42390A994
```

---

## 📋 Database Setup

### **Insert Sensor Catalog** (Example)
```sql
INSERT INTO sensor_catalogs (
  id_sensor_catalog, 
  vendor, 
  model_name, 
  default_channels_json
) VALUES (
  '48eaf2ec-4857-467f-abb4-32d48febb4d0',
  'TUF',
  'TUF-2000M',
  '[{
    "version": 1,
    "modbus_address": 1,
    "baud_rate": 9600,
    "scan_interval_ms": 5000,
    "registers": [
      {
        "label": "Flow rate",
        "reg": 1,
        "words": 2,
        "type": "float32",
        "swap": true,
        "unit": "m³/h",
        "category": "sensor_data"
      }
    ]
  }]'::jsonb
);
```

### **Link Sensor to Node**
```sql
INSERT INTO sensors (
  id_sensor,
  id_node,
  id_sensor_catalog,
  label,
  sensor_code
) VALUES (
  gen_random_uuid(),
  '<node_id>',
  '48eaf2ec-4857-467f-abb4-32d48febb4d0',
  'Water Flow Meter',
  'SENSOR-001'
);
```

### **Query Config**
```sql
-- Get all sensors for a device
SELECT 
  s.id_sensor,
  s.label as sensor_label,
  sc.vendor,
  sc.model_name,
  sc.default_channels_json
FROM nodes n
JOIN sensors s ON s.id_node = n.id_node
JOIN sensor_catalogs sc ON sc.id_sensor_catalog = s.id_sensor_catalog
WHERE n.code = 'DEMO1-00D42390A994';
```

---

## ✅ Benefits

1. **Centralized Config Management**
   - One source of truth: `sensor_catalogs.default_channels_json`
   - Easy to update via admin dashboard

2. **Multi-Sensor Support**
   - 1 device dapat menghandle banyak sensor
   - Setiap sensor punya config terpisah

3. **Metadata Enrichment**
   - Device tahu sensor mana yang mana
   - Vendor & model info included

4. **Scalability**
   - Tambah sensor catalog baru → auto available
   - Assign ke node → langsung dikirim ke device

---

## 🚀 Next Steps

1. **Admin Dashboard**
   - UI untuk manage sensor catalogs
   - Assign sensors to nodes
   - Edit default_channels_json

2. **Push Config**
   - Admin trigger config update
   - Publish to `stream_config/{device_id}`
   - Device apply without reboot

3. **Config Validation**
   - Validate register addresses
   - Check for conflicts (modbus_address collision)
   - Test before deploy

---

## 📖 Related Files

- `iot-gtw/src/entities/existing/sensor-catalog.entity.ts` - New entity
- `iot-gtw/src/modules/mqtt/mqtt.service.ts` - Database integration
- `iot-gtw/src/modules/mqtt/mqtt.module.ts` - Repository registration
- `RS485-CONFIG-SYSTEM.md` - Full documentation
- `RS485-CONFIG-QUICKSTART.md` - Quick reference

---

**Last Updated:** November 24, 2025  
**Status:** ✅ **DATABASE INTEGRATION COMPLETE**
