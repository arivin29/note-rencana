# RS485 Dynamic Configuration System

## 🎯 Overview

System untuk dynamic configuration RS485 sensor melalui MQTT dengan 2 mekanisme:
1. **Pull Config** - Device request saat boot
2. **Push Config** - Server push update saat runtime (Future)

Config disimpan di RAM only, auto-retry jika gagal.

### 🔑 Key Features
- ✅ **2 Topics Only**: `get_config` untuk request, `stream_config` untuk semua response (simplified!)
- ✅ **Pull Config**: Device request → Server respond via `stream_config`
- 🚧 **Push Config**: Admin update → Server push via `stream_config` (Future)
- ✅ **Unified Topic**: `stream_config` digunakan untuk pull response DAN push updates
- ✅ **State Machine**: NOT_LOADED → NO_CONFIG → CONFIG_LOADED
- ✅ **Auto Retry**: Retry setiap 1 menit jika timeout
- ✅ **No Reboot**: Config apply di runtime tanpa restart device

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MQTT BROKER                              │
│              (109.105.194.174:8366)                          │
└─────────────────────────────────────────────────────────────┘
         ↑                                        ↓
    [1] │ get_config                   [2]       │ stream_config
         │                                        │
    ┌────┴────────────────────────────────────────┴────┐
    │               Device (ESP32)                       │
    │                                                    │
    │  Boot:                                             │
    │   • Subscribe: stream_config/{device_id}          │
    │   • Publish:   get_config/{device_id}             │
    │                                                    │
    │  Runtime:                                          │
    │   • Listen: stream_config/{device_id}             │
    │   • Auto-apply updates (no reboot!)               │
    └────────────────────────────────────────────────────┘
         ↑                                        ↓
         │                                        │
    ┌────┴────────────────────────────────────────┴────┐
    │          Backend/Gateway (GTW)                    │
    │                                                    │
    │  Listen: get_config/{device_id}                   │
    │  → Check device in database                       │
    │  → Get RS485 config (dummy for now)               │
    │  → Send via stream_config/{device_id}             │
    │                                                    │
    │  Admin updates config (Future):                   │
    │  → Push via stream_config/{device_id}             │
    └────────────────────────────────────────────────────┘
```

**Note:** Hanya 2 topics - `get_config` untuk request, `stream_config` untuk semua response (pull & push)!

---

## 📋 MQTT Topics

### **1. Device Request Config (Pull)**
**Topic:** `get_config/{device_id}`  
**Direction:** Device → Server  
**Payload:** `"request"` (string)  
**When:** Boot time or periodic retry  
**QoS:** 1

**Example:**
```
Topic: get_config/DEMO1-00D42390A994
Payload: "request"
```

---

### **2. Server Send Config (Pull Response & Push Updates)**
**Topic:** `stream_config/{device_id}`  
**Direction:** Server → Device  
**Payload:** JSON config atau `"null"` (string)  
**When:** 
- Response to `get_config` (pull)
- Admin triggers config update (push)
**QoS:** 1

**Example - Config Found:**
```json
Topic: stream_config/DEMO1-00D42390A994
Payload:
{
  "version": 1,
  "modbus_address": 1,
  "baud_rate": 9600,
  "scan_interval_ms": 5000,
  "registers": [...]
}
```

**Example - No Config:**
```
Topic: stream_config/UNKNOWN-DEVICE
Payload: "null"
```

---

## 📊 Config State Machine

```
┌─────────────────┐
│  NOT_LOADED     │ → Config belum dapat, retry every 1 min
│  (State = 0)    │    Device uses default config
└─────────────────┘
         ↓
┌─────────────────┐
│  NO_CONFIG      │ → Server sends "null", device not in DB
│  (State = 1)    │    Device uses default config, no retry
└─────────────────┘
         ↓
┌─────────────────┐
│  CONFIG_LOADED  │ → Config successfully loaded from server
│  (State = 2)    │    Device uses server config
└─────────────────┘
```

---

## 🔧 Boot Flow

```
1. ESP32 Boot
   ↓
2. Init Hardware (RS485, LTE, etc)
   ↓
3. Connect to MQTT Broker
   ↓
4. Subscribe to stream_config/{device_id}
   (Unified topic for pull response & push updates)
   ↓
5. Request Config (Pull)
   - Publish: get_config/{device_id} → "request"
   ↓
6. Wait for Response on stream_config (non-blocking, 30s timeout)
   ↓
   ┌─── Timeout (no response) ───┐
   │   → State: NOT_LOADED        │
   │   → Load default config      │
   │   → Retry every 1 min        │
   └──────────────────────────────┘
   ┌─── Server sends "null" ─────┐
   │   → State: NO_CONFIG         │
   │   → Load default config      │
   │   → No retry                 │
   └──────────────────────────────┘
   ┌─── Server sends JSON ───────┐
   │   → Parse config             │
   │   → State: CONFIG_LOADED     │
   │   → No retry                 │
   └──────────────────────────────┘
   ↓
7. Main Loop
   - Query RS485 registers sesuai config
   - Send telemetry via MQTT
   - Keep listening stream_config for push updates
```

---

## 🛠️ Implementation Status

### ✅ Implemented (Pull Config)

#### Backend (iot-gtw/src/modules/mqtt/mqtt.service.ts)

1. **Subscribe to `get_config/+`** (line ~115)
   - Wildcard subscription untuk semua device

2. **Handle Config Request** (line ~369)
   ```typescript
   private async handleConfigRequest(topic: string, message: Buffer): Promise<void>
   ```
   - Extract `device_id` dari topic: `get_config/{device_id}`
   - Check device di database (nodes table)
   - Response via **`stream_config/{device_id}`** (unified topic):
     - Device found → Get RS485 configs from database
     - Device not found → Send `"null"`
   - Log request/response ke `iot_log` table

3. **Get RS485 Config from Database** (line ~435)
   ```typescript
   private async getRS485ConfigFromDatabase(idNode: string): Promise<any[] | null>
   ```
   - Lookup `sensors` by `id_node`
   - For each sensor, get `sensor_catalogs.default_channels_json`
   - Returns array of configs (multiple sensors supported)
   - Adds metadata: `sensor_id`, `sensor_label`, `vendor`, `model`

**Key Features:**
- ✅ **Database-driven**: Config dari `sensor_catalogs.default_channels_json`
- ✅ **Multi-sensor support**: 1 device bisa punya banyak sensor dengan config berbeda
- ✅ **Metadata enrichment**: Config includes sensor info (id, label, vendor, model)

---

## 📝 Config JSON Schema

### Root Object
```typescript
{
  version: number;           // Config version (1)
  modbus_address: number;    // RS485 slave address (1-247)
  baud_rate: number;         // 9600, 19200, 38400, 115200
  scan_interval_ms: number;  // Polling interval (ms)
  registers: Register[];     // Array of registers to read
}
```

### Register Object
```typescript
{
  label: string;        // Human-readable name
  reg: number;          // Modbus register address
  words: number;        // Number of 16-bit words (1 or 2)
  type: string;         // Data type: float32, uint32, uint16, hex16
  swap: boolean;        // Byte swap for multi-word values
  unit: string;         // Physical unit (m³/h, °C, %, etc)
}
```

---

## 🧪 Testing

### Test Config Request (Manual MQTT Publish)

**1. Start iot-gtw service:**
```bash
cd iot-gtw
npm run start:dev
```

**2. Publish config request using MQTT client:**
```bash
# Using mosquitto_pub
mosquitto_pub -h 109.105.194.174 -p 8366 \
  -u mqtt_user -P pantek_123 \
  -t "get_config/TEST-DEVICE-001" \
  -m "request" \
  -q 1
```

**3. Subscribe to response:**
```bash
# Using mosquitto_sub
mosquitto_sub -h 109.105.194.174 -p 8366 \
  -u mqtt_user -P pantek_123 \
  -t "stream_config/TEST-DEVICE-001" \
  -q 1 \
  -v
```

**Expected Response (Device Found):**
```json
stream_config/TEST-DEVICE-001 [
  {
    "sensor_id": "48eaf2ec-4857-467f-abb4-32d48febb4d0",
    "sensor_label": "Water Flow Meter",
    "vendor": "TUF",
    "model": "TUF-2000M",
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
        "unit": "m³/h"
      },
      ...
    ]
  }
]
```

**Expected Response (Device Not Found):**
```
stream_config/TEST-DEVICE-001 null
```

---

## 🔍 Logs

### Backend Logs (iot-gtw)

**Config Request Received:**
```
🔧 Config request from device: TEST-DEVICE-001 (payload: "request")
✅ Device TEST-DEVICE-001 found - fetching RS485 configs from sensor catalogs
� Found 1 sensor(s) for node abc-123-def
✅ Loaded config for sensor: Water Flow Meter (TUF TUF-2000M)
�📤 Config sent via stream_config: stream_config/TEST-DEVICE-001
```

**Device Not Found:**
```
🔧 Config request from device: UNKNOWN-DEVICE (payload: "request")
⚠️  Device UNKNOWN-DEVICE not found in database - sending null config
📤 Config sent via stream_config: stream_config/UNKNOWN-DEVICE
```

**No Sensors Found:**
```
🔧 Config request from device: TEST-DEVICE-001 (payload: "request")
✅ Device TEST-DEVICE-001 found - fetching RS485 configs from sensor catalogs
⚠️  No sensors found for node abc-123-def
⚠️  No sensor configs found for device TEST-DEVICE-001
📤 Config sent via stream_config: stream_config/TEST-DEVICE-001
```

---

## 📦 Database

### iot_log Table
Config requests/responses are logged to `iot_log`:

```sql
SELECT 
  id, 
  label, 
  topic, 
  device_id, 
  payload->>'version' as config_version,
  timestamp 
FROM iot_log 
WHERE topic LIKE 'stream_config/%' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 🚀 Future Enhancements

### 1. ~~Database Storage for Configs~~ ✅ **IMPLEMENTED**
- ✅ Using `sensor_catalogs.default_channels_json`
- ✅ Multi-sensor support per device
- ✅ Metadata enrichment (sensor_id, label, vendor, model)

### 2. Admin Dashboard
- [ ] UI to edit RS485 config per sensor catalog
- [ ] Validate register addresses
- [ ] Preview config JSON
- [ ] Assign sensors to nodes

### 3. Push Config (stream_config)
- [ ] Admin triggers config push
- [ ] Backend publishes to `stream_config/{device_id}`
- [ ] Device applies without reboot

### 4. Config Versioning
- [ ] Track config versions per sensor
- [ ] Rollback support
- [ ] Config change history

---

## 🔗 Related Files

### Backend (iot-gtw)
- `src/modules/mqtt/mqtt.service.ts` - MQTT handler with config request logic
- `src/modules/iot-log/iot-log.service.ts` - Logs config requests

### Documentation
- `IOT-LOGS-WIDGET-IMPLEMENTATION.md` - IoT logs dashboard widget
- `UNPAIRED-DEVICES-COMPLETE.md` - Unpaired device tracking

---

## 📞 Contact

For questions about RS485 config system, contact the IoT team.

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Pull Config Implemented, 🚧 Push Config Planned
