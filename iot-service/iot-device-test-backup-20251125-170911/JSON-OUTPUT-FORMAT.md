# JSON Output Format - Generic I/O Manager

## Overview
Format JSON telemetry yang dihasilkan oleh **Generic I/O Manager** untuk dikirim ke server melalui HTTP POST.

---

## Complete JSON Structure

```json
{
  "device_id": "A1B2C3D4E5F6",
  "device_type": "ESP32-GenericIO",
  "firmware_version": "2.0.0-dynamic",
  "timestamp": 123456789,
  
  "sensors": {
    "rs485_slave_1": {
      "type": "modbus_dynamic",
      "bus": "rs485",
      "address": 1,
      "config_state": 2,
      "status": "ok",
      "registers": [
        {
          "label": "Flow Rate",
          "addr": 1,
          "value": "1234.56",
          "unit": "L/h",
          "status": "ok"
        },
        {
          "label": "Positive Totalizer",
          "addr": 9,
          "value": "9876543.21",
          "unit": "L",
          "status": "ok"
        },
        {
          "label": "Temperature T1",
          "addr": 33,
          "value": "25.45",
          "unit": "°C",
          "status": "ok"
        }
      ]
    },
    
    "analog_A2": {
      "type": "analog_4_20ma",
      "channel": "A2",
      "pin": 1,
      "raw": 2048,
      "volt": 1.65,
      "ma": 16.5,
      "status": "ok"
    },
    
    "analog_A3": {
      "type": "analog_4_20ma",
      "channel": "A3",
      "pin": 2,
      "raw": 1024,
      "volt": 0.825,
      "ma": 8.25,
      "status": "ok"
    },
    
    "adc16_A0": {
      "type": "adc16",
      "channel": "A0",
      "raw": 12345,
      "volt": 2.315625,
      "connected": true,
      "status": "ok"
    },
    
    "adc16_A1": {
      "type": "adc16",
      "channel": "A1",
      "raw": 23456,
      "volt": 4.396875,
      "connected": true,
      "status": "ok"
    },
    
    "i2c_0x40": {
      "type": "i2c",
      "addr": 64,
      "label": "INA219",
      "status": "ok",
      "data": {
        "voltage_v": 12.45,
        "current_ma": 234.56,
        "power_mw": 2920.32
      }
    },
    
    "i2c_0x48": {
      "type": "i2c",
      "addr": 72,
      "label": "ADS1115",
      "status": "ok",
      "data": {
        "status": "unknown"
      }
    },
    
    "digital_in_14": {
      "type": "digital",
      "pin": 14,
      "state": 1,
      "status": "ok"
    }
  },
  
  "lte": {
    "connected": true,
    "operator": "TELKOMSEL",
    "signal_quality": 21,
    "ip_address": "10.28.87.55"
  },
  
  "statistics": {
    "send_count": 42,
    "fail_count": 3,
    "last_send_ms": 2520000
  }
}
```

---

## Field Descriptions

### Root Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | String | Unique device identifier (MAC address based) |
| `device_type` | String | Device model/type (`"ESP32-GenericIO"`) |
| `firmware_version` | String | Firmware version (`"2.0.0-dynamic"`) |
| `timestamp` | Number | Timestamp in milliseconds since boot (`millis()`) |

---

### Sensors Object

Container untuk semua data sensor yang terdeteksi secara dinamis.

#### RS485 Modbus Device

**Key Format:** `rs485_slave_{address}`

```json
{
  "type": "modbus_dynamic",
  "bus": "rs485",
  "address": 1,
  "config_state": 2,
  "status": "ok",
  "registers": [...]
}
```

**Fields:**
- `type`: Always `"modbus_dynamic"`
- `bus`: Always `"rs485"`
- `address`: Modbus slave ID (1-247)
- `config_state`: Config loading state:
  - `0` = `NO_CONFIG` (no SD card config)
  - `1` = `CONFIG_LOADING` (loading in progress)
  - `2` = `CONFIG_LOADED` (config successfully loaded)
  - `3` = `CONFIG_ERROR` (config load failed)
- `status`: Device status (`"ok"`, `"error"`, `"no_device"`)
- `registers`: Array of register data (see below)

**Register Object:**
```json
{
  "label": "Flow Rate",
  "addr": 1,
  "value": "1234.56",
  "unit": "L/h",
  "status": "ok"
}
```

**Register Fields:**
- `label`: Human-readable name dari config file
- `addr`: Modbus register address
- `value`: Formatted value (as string)
- `unit`: Unit of measurement
- `status`: Read status (`"ok"` or `"error"`)

---

#### Analog Input (4-20mA)

**Key Format:** `analog_{channel}`

```json
{
  "type": "analog_4_20ma",
  "channel": "A2",
  "pin": 1,
  "raw": 2048,
  "volt": 1.65,
  "ma": 16.5,
  "status": "ok"
}
```

**Fields:**
- `type`: Always `"analog_4_20ma"`
- `channel`: Channel name (`"A2"`, `"A3"`)
- `pin`: GPIO pin number
- `raw`: Raw ADC value (0-4095, 12-bit)
- `volt`: Voltage reading (0-3.3V)
- `ma`: Current reading (4-20mA calculated from 100Ω shunt)
- `status`: Always `"ok"` (no error detection)

**Formula:**
- Voltage: `volt = (raw / 4095) * 3.3`
- Current: `ma = (volt / 100) * 1000`

---

#### ADC 16-bit (ADS1115)

**Key Format:** `adc16_{channel}`

```json
{
  "type": "adc16",
  "channel": "A0",
  "raw": 12345,
  "volt": 2.315625,
  "connected": true,
  "status": "ok"
}
```

**Fields:**
- `type`: Always `"adc16"`
- `channel`: ADS1115 channel (`"A0"`, `"A1"`)
- `raw`: Raw 16-bit ADC value (-32768 to 32767)
- `volt`: Voltage reading (depends on gain setting)
- `connected`: Sensor connection status
  - `true`: Sensor detected
  - `false`: Open circuit or no sensor
- `status`: Device status (`"ok"` or `"disconnected"`)

**Gain Settings:**
- `GAIN_TWOTHIRDS`: ±6.144V, LSB = 0.1875mV
- `GAIN_ONE`: ±4.096V, LSB = 0.125mV
- `GAIN_TWO`: ±2.048V, LSB = 0.0625mV

---

#### I2C Device

**Key Format:** `i2c_0x{hex_address}`

```json
{
  "type": "i2c",
  "addr": 64,
  "label": "INA219",
  "status": "ok",
  "data": {
    "voltage_v": 12.45,
    "current_ma": 234.56,
    "power_mw": 2920.32
  }
}
```

**Fields:**
- `type`: Always `"i2c"`
- `addr`: I2C address (decimal)
- `label`: Device type detected by address:
  - `0x40-0x4F`: `"INA219"` (Power Monitor)
  - `0x48-0x4B`: `"ADS1115"` (16-bit ADC)
  - `0x68-0x69`: `"MPU6050"` (Accelerometer/Gyro)
  - `0x76-0x77`: `"BME280"` (Temp/Humidity/Pressure)
  - Others: `"Unknown"`
- `status`: Device status (`"ok"`, `"error"`)
- `data`: Device-specific data (varies by device type)

**INA219 Data Fields:**
- `voltage_v`: Bus voltage in volts
- `current_ma`: Current in milliamps
- `power_mw`: Power in milliwatts

---

#### Digital Input

**Key Format:** `digital_in_{pin}`

```json
{
  "type": "digital",
  "pin": 14,
  "state": 1,
  "status": "ok"
}
```

**Fields:**
- `type`: Always `"digital"`
- `pin`: GPIO pin number
- `state`: Digital state (`0` = LOW/OFF, `1` = HIGH/ON)
- `status`: Always `"ok"`

---

### LTE Object

```json
{
  "connected": true,
  "operator": "TELKOMSEL",
  "signal_quality": 21,
  "ip_address": "10.28.87.55"
}
```

**Fields:**
- `connected`: LTE connection status
- `operator`: Network operator name
- `signal_quality`: Signal strength (0-31, higher = better)
- `ip_address`: Assigned IP address

---

### Statistics Object

```json
{
  "send_count": 42,
  "fail_count": 3,
  "last_send_ms": 2520000
}
```

**Fields:**
- `send_count`: Total successful telemetry sends since boot
- `fail_count`: Total failed send attempts
- `last_send_ms`: Timestamp of last successful send (millis)

---

## Example Outputs

### Example 1: TUF-2000M Flow Meter Only

```json
{
  "device_id": "A1B2C3D4E5F6",
  "device_type": "ESP32-GenericIO",
  "firmware_version": "2.0.0-dynamic",
  "timestamp": 60000,
  
  "sensors": {
    "rs485_slave_1": {
      "type": "modbus_dynamic",
      "bus": "rs485",
      "address": 1,
      "config_state": 2,
      "status": "ok",
      "registers": [
        {
          "label": "Flow Rate",
          "addr": 1,
          "value": "1234.56",
          "unit": "L/h",
          "status": "ok"
        },
        {
          "label": "Positive Totalizer",
          "addr": 9,
          "value": "9876543.21",
          "unit": "L",
          "status": "ok"
        },
        {
          "label": "Flow Velocity",
          "addr": 17,
          "value": "2.45",
          "unit": "m/s",
          "status": "ok"
        },
        {
          "label": "Temperature T1",
          "addr": 33,
          "value": "25.45",
          "unit": "°C",
          "status": "ok"
        },
        {
          "label": "Temperature T2",
          "addr": 35,
          "value": "25.50",
          "unit": "°C",
          "status": "ok"
        },
        {
          "label": "Signal Quality",
          "addr": 92,
          "value": "85",
          "unit": "%",
          "status": "ok"
        }
      ]
    },
    
    "analog_A2": {
      "type": "analog_4_20ma",
      "channel": "A2",
      "pin": 1,
      "raw": 0,
      "volt": 0.0,
      "ma": 0.0,
      "status": "ok"
    },
    
    "analog_A3": {
      "type": "analog_4_20ma",
      "channel": "A3",
      "pin": 2,
      "raw": 0,
      "volt": 0.0,
      "ma": 0.0,
      "status": "ok"
    },
    
    "digital_in_14": {
      "type": "digital",
      "pin": 14,
      "state": 0,
      "status": "ok"
    }
  },
  
  "lte": {
    "connected": true,
    "operator": "TELKOMSEL",
    "signal_quality": 21,
    "ip_address": "10.28.87.55"
  },
  
  "statistics": {
    "send_count": 1,
    "fail_count": 0,
    "last_send_ms": 60000
  }
}
```

---

### Example 2: Multiple Devices

```json
{
  "device_id": "A1B2C3D4E5F6",
  "device_type": "ESP32-GenericIO",
  "firmware_version": "2.0.0-dynamic",
  "timestamp": 120000,
  
  "sensors": {
    "rs485_slave_1": {
      "type": "modbus_dynamic",
      "bus": "rs485",
      "address": 1,
      "config_state": 2,
      "status": "ok",
      "registers": [
        {"label": "Flow Rate", "addr": 1, "value": "1234.56", "unit": "L/h", "status": "ok"}
      ]
    },
    
    "rs485_slave_2": {
      "type": "modbus_dynamic",
      "bus": "rs485",
      "address": 2,
      "config_state": 0,
      "status": "ok",
      "registers": [
        {"addr": 1, "val": 1234},
        {"addr": 5, "val": 5678},
        {"addr": 10, "val": 9012}
      ]
    },
    
    "analog_A2": {
      "type": "analog_4_20ma",
      "channel": "A2",
      "pin": 1,
      "raw": 2458,
      "volt": 1.98,
      "ma": 19.8,
      "status": "ok"
    },
    
    "analog_A3": {
      "type": "analog_4_20ma",
      "channel": "A3",
      "pin": 2,
      "raw": 1229,
      "volt": 0.99,
      "ma": 9.9,
      "status": "ok"
    },
    
    "adc16_A0": {
      "type": "adc16",
      "channel": "A0",
      "raw": 15234,
      "volt": 2.8564,
      "connected": true,
      "status": "ok"
    },
    
    "adc16_A1": {
      "type": "adc16",
      "channel": "A1",
      "raw": 8,
      "volt": 0.0015,
      "connected": false,
      "status": "disconnected"
    },
    
    "i2c_0x40": {
      "type": "i2c",
      "addr": 64,
      "label": "INA219",
      "status": "ok",
      "data": {
        "voltage_v": 12.34,
        "current_ma": 456.78,
        "power_mw": 5636.27
      }
    },
    
    "i2c_0x48": {
      "type": "i2c",
      "addr": 72,
      "label": "ADS1115",
      "status": "ok",
      "data": {
        "status": "unknown"
      }
    },
    
    "digital_in_14": {
      "type": "digital",
      "pin": 14,
      "state": 1,
      "status": "ok"
    }
  },
  
  "lte": {
    "connected": true,
    "operator": "TELKOMSEL",
    "signal_quality": 23,
    "ip_address": "10.28.87.55"
  },
  
  "statistics": {
    "send_count": 2,
    "fail_count": 0,
    "last_send_ms": 120000
  }
}
```

---

### Example 3: No Config (Raw Register Scan)

Ketika `config_state = 0` (NO_CONFIG), sistem akan scan register range (default 1-100) dan hanya kirim register yang nilainya != 0:

```json
{
  "device_id": "A1B2C3D4E5F6",
  "device_type": "ESP32-GenericIO",
  "firmware_version": "2.0.0-dynamic",
  "timestamp": 180000,
  
  "sensors": {
    "rs485_slave_1": {
      "type": "modbus",
      "bus": "rs485",
      "address": 1,
      "status": "ok",
      "registers": [
        {"addr": 1, "val": 12345},
        {"addr": 2, "val": 67890},
        {"addr": 5, "val": 111},
        {"addr": 9, "val": 98765432},
        {"addr": 10, "val": 43210987},
        {"addr": 17, "val": 245},
        {"addr": 33, "val": 2545},
        {"addr": 35, "val": 2550},
        {"addr": 92, "val": 85}
      ]
    },
    
    "analog_A2": {
      "type": "analog_4_20ma",
      "channel": "A2",
      "pin": 1,
      "raw": 0,
      "volt": 0.0,
      "ma": 0.0,
      "status": "ok"
    },
    
    "analog_A3": {
      "type": "analog_4_20ma",
      "channel": "A3",
      "pin": 2,
      "raw": 0,
      "volt": 0.0,
      "ma": 0.0,
      "status": "ok"
    },
    
    "digital_in_14": {
      "type": "digital",
      "pin": 14,
      "state": 0,
      "status": "ok"
    }
  },
  
  "lte": {
    "connected": true,
    "operator": "TELKOMSEL",
    "signal_quality": 19,
    "ip_address": "10.28.87.55"
  },
  
  "statistics": {
    "send_count": 3,
    "fail_count": 0,
    "last_send_ms": 180000
  }
}
```

---

## Server-Side Parsing Tips

### 1. Dynamic Device Detection

```javascript
// Node.js example
const telemetry = JSON.parse(request.body);

// Iterate through sensors
for (const [key, sensor] of Object.entries(telemetry.sensors)) {
  switch (sensor.type) {
    case 'modbus_dynamic':
      // Parse Modbus device with config
      if (sensor.config_state === 2) {
        sensor.registers.forEach(reg => {
          console.log(`${reg.label}: ${reg.value} ${reg.unit}`);
        });
      } else {
        // Raw registers (no config)
        sensor.registers.forEach(reg => {
          console.log(`R${reg.addr}: ${reg.val}`);
        });
      }
      break;
      
    case 'analog_4_20ma':
      console.log(`${sensor.channel}: ${sensor.ma}mA`);
      break;
      
    case 'adc16':
      if (sensor.connected) {
        console.log(`${sensor.channel}: ${sensor.volt}V`);
      }
      break;
      
    case 'i2c':
      if (sensor.label === 'INA219') {
        console.log(`Power: ${sensor.data.power_mw}mW`);
      }
      break;
      
    case 'digital':
      console.log(`GPIO${sensor.pin}: ${sensor.state ? 'HIGH' : 'LOW'}`);
      break;
  }
}
```

---

### 2. Database Schema Recommendation

```sql
-- Device table
CREATE TABLE devices (
  device_id VARCHAR(50) PRIMARY KEY,
  device_type VARCHAR(50),
  firmware_version VARCHAR(20),
  last_seen TIMESTAMP
);

-- Telemetry table (time-series)
CREATE TABLE telemetry (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) REFERENCES devices(device_id),
  timestamp BIGINT,
  sensor_key VARCHAR(100),
  sensor_type VARCHAR(50),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, timestamp DESC);
CREATE INDEX idx_telemetry_sensor_type ON telemetry(sensor_type);
```

---

### 3. InfluxDB Example

```javascript
// Store in InfluxDB (time-series optimized)
const {InfluxDB, Point} = require('@influxdata/influxdb-client');

function storeTelemtry(telemetry) {
  const writeApi = influxDB.getWriteApi(org, bucket);
  
  for (const [key, sensor] of Object.entries(telemetry.sensors)) {
    const point = new Point(sensor.type)
      .tag('device_id', telemetry.device_id)
      .tag('sensor_key', key);
    
    if (sensor.type === 'modbus_dynamic' && sensor.config_state === 2) {
      sensor.registers.forEach(reg => {
        point.floatField(reg.label, parseFloat(reg.value));
      });
    } else if (sensor.type === 'analog_4_20ma') {
      point.floatField('current_ma', sensor.ma);
      point.floatField('voltage', sensor.volt);
    }
    
    writeApi.writePoint(point);
  }
  
  writeApi.close();
}
```

---

## Payload Size Estimation

### Minimal (1 Modbus device, no analog/digital):
- **~400-600 bytes**

### Typical (1 Modbus + 2 Analog + 1 Digital):
- **~700-900 bytes**

### Maximum (Multiple Modbus + Analog + ADC16 + I2C):
- **~1500-2500 bytes**

---

## HTTP POST Endpoint

**Recommended Server Endpoint:**

```
POST /api/telemetry HTTP/1.1
Host: your-server.com
Content-Type: application/json
Content-Length: 879

{
  "device_id": "A1B2C3D4E5F6",
  ...
}
```

**Expected Response:**

```json
{
  "status": "ok",
  "message": "Telemetry received",
  "timestamp": 1234567890
}
```

---

## Config File Format (SD Card)

File: `/node_profile.json`

```json
{
  "modbus_address": 1,
  "registers": [
    {"reg": 1, "label": "Flow Rate", "unit": "L/h", "words": 2, "format": "float"},
    {"reg": 9, "label": "Positive Totalizer", "unit": "L", "words": 2, "format": "float"},
    {"reg": 33, "label": "Temperature T1", "unit": "°C", "words": 2, "format": "float"}
  ]
}
```

Dengan config ini, output JSON akan include `label` dan `unit` untuk setiap register.

---

## Summary

✅ **Dynamic Detection**: Semua device auto-detect, tidak hardcoded  
✅ **Flexible Format**: Support both configured (with labels) dan raw (no config)  
✅ **Extensible**: Mudah tambah device type baru (I2C, SPI, etc.)  
✅ **Efficient**: Hanya kirim non-zero values untuk raw scan  
✅ **Server-Friendly**: Clear type indicators untuk parsing  

Format ini siap untuk:
- REST API (HTTP POST)
- MQTT (publish JSON string)
- Database storage (relational or time-series)
- Real-time dashboards (Grafana, etc.)
