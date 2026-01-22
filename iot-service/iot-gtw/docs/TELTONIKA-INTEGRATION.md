# Teltonika FM125 Integration

## 📡 Overview

Integrasi Teltonika FM125 GPS Tracker dengan IoT Gateway menggunakan **TCP-to-MQTT Bridge** pattern.

**Date:** January 22, 2026  
**Status:** ✅ Production Ready

---

## 🏗️ Architecture

```
Teltonika FM125 Device
   ↓ TCP Connection (port 5027)
TeltonikaGateway (TCP Server)
   ↓ Parse Binary + JSON
   ↓ Convert to Standard Format
   ↓ Publish to MQTT
MQTT Broker (topic: sensor)
   ↓ Subscribe (existing flow)
MqttService → iot_log → Scheduler → TelemetryProcessor → sensor_logs
```

**Key Benefit:** Reuse existing telemetry processing pipeline! 🎯

---

## 📦 Data Flow

### 1. **Teltonika Device Sends Data**
```
Binary: [00 0F] + "123456789012345"  ← IMEI (17 bytes)
JSON: {
  "state": {
    "reported": {
      "ts": 1737552000000,
      "latlng": "-6.200000,106.816666",
      "72": 245,    ← Temperature (24.5°C)
      "9": 12000    ← Voltage (12.0V)
    }
  }
}
```

### 2. **TeltonikaGateway Processes**
- Extract IMEI from binary header
- Parse JSON payload
- Extract GPS, temperature, voltage
- Convert to standard MQTT format

### 3. **Publish to MQTT Broker**
```json
{
  "device_id": "123456789012345",
  "timestamp": 1737552000000,
  "gps": {
    "latitude": -6.200000,
    "longitude": 106.816666,
    "accuracy": 10
  },
  "sensors": {
    "temperature": 24.5,
    "voltage": 12.0,
    "adc1": 12.0
  },
  "metadata": {
    "source": "teltonika",
    "model": "FM125"
  }
}
```

### 4. **Standard Processing**
- MqttService detects label: `'telemetry'`
- Saves to `iot_log` table (processed: false)
- Scheduler runs every 30s
- TelemetryProcessor processes using NodeProfile
- Saves to `sensor_logs` table

---

## ⚙️ Configuration

### Environment Variables

Add to `.env` file:

```bash
# Teltonika FM125 Configuration
TELTONIKA_TCP_PORT=5027
TELTONIKA_ENABLED=true
TELTONIKA_MQTT_PUBLISH=true
TELTONIKA_TIMEOUT=30000
TELTONIKA_MAX_CONNECTIONS=100
```

### Default Values
- **TCP Port:** 5027
- **Enabled:** true
- **MQTT Publish:** true
- **Timeout:** 30000ms (30 seconds)
- **Max Connections:** 100 devices

---

## 🗄️ Database Setup

### 1. Register Teltonika Device in `nodes` Table

```sql
-- Insert Teltonika device
INSERT INTO nodes (
  id_node,
  id_project,
  id_node_model,
  id_node_profile,
  code,
  serial_number,
  dev_eui,
  connectivity_status,
  telemetry_interval_sec
) VALUES (
  gen_random_uuid(),
  'your-project-id-here',
  'your-teltonika-model-id-here',
  'your-teltonika-profile-id-here',
  'TELTONIKA-FM125-001',
  '123456789012345',  -- IMEI as serial_number
  '123456789012345',  -- IMEI as dev_eui (for matching)
  'offline',
  300  -- 5 minutes interval
);
```

### 2. Create NodeProfile with Mapping

```sql
-- Insert NodeProfile for Teltonika FM125
INSERT INTO node_profiles (
  id_node_profile,
  profile_name,
  mapping_json,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Teltonika FM125 Standard Profile',
  '{
    "sensors": [
      {
        "label": "Sensor-GPS-Teltonika",
        "channels": [
          {
            "channelCode": "LATITUDE",
            "payloadPath": "gps.latitude",
            "unit": "degree"
          },
          {
            "channelCode": "LONGITUDE",
            "payloadPath": "gps.longitude",
            "unit": "degree"
          }
        ]
      },
      {
        "label": "Sensor-Temperature-Teltonika",
        "channels": [
          {
            "channelCode": "TEMPERATURE",
            "payloadPath": "sensors.temperature",
            "unit": "celsius"
          }
        ]
      },
      {
        "label": "Sensor-Voltage-Teltonika",
        "channels": [
          {
            "channelCode": "VOLTAGE",
            "payloadPath": "sensors.voltage",
            "unit": "volt"
          }
        ]
      }
    ],
    "metadata": {
      "deviceId": {
        "path": "device_id",
        "type": "string"
      },
      "timestamp": {
        "path": "timestamp",
        "type": "number"
      }
    }
  }',
  'Standard mapping for Teltonika FM125 with GPS, Temperature, and Voltage sensors',
  NOW(),
  NOW()
);
```

### 3. Create Sensors

```sql
-- Get the node_id and profile_id from previous inserts
-- Replace with actual UUIDs

-- GPS Sensor
INSERT INTO sensors (
  id_sensor,
  id_node,
  id_sensor_catalog,
  label,
  sensor_code,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'your-node-id-here',
  NULL,
  'Sensor-GPS-Teltonika',
  'GPS-001',
  'active',
  NOW(),
  NOW()
);

-- Temperature Sensor
INSERT INTO sensors (
  id_sensor,
  id_node,
  id_sensor_catalog,
  label,
  sensor_code,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'your-node-id-here',
  NULL,
  'Sensor-Temperature-Teltonika',
  'TEMP-001',
  'active',
  NOW(),
  NOW()
);

-- Voltage Sensor
INSERT INTO sensors (
  id_sensor,
  id_node,
  id_sensor_catalog,
  label,
  sensor_code,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'your-node-id-here',
  NULL,
  'Sensor-Voltage-Teltonika',
  'VOLT-001',
  'active',
  NOW(),
  NOW()
);
```

### 4. Create Sensor Channels

```sql
-- Get sensor_id from previous inserts

-- GPS Channels
INSERT INTO sensor_channels (
  id_sensor_channel,
  id_sensor,
  metric_code,
  metric_name,
  unit,
  data_type,
  is_active,
  created_at,
  updated_at
) VALUES 
(gen_random_uuid(), 'gps-sensor-id', 'LATITUDE', 'Latitude', 'degree', 'float', true, NOW(), NOW()),
(gen_random_uuid(), 'gps-sensor-id', 'LONGITUDE', 'Longitude', 'degree', 'float', true, NOW(), NOW());

-- Temperature Channel
INSERT INTO sensor_channels (
  id_sensor_channel,
  id_sensor,
  metric_code,
  metric_name,
  unit,
  data_type,
  is_active,
  created_at,
  updated_at
) VALUES 
(gen_random_uuid(), 'temp-sensor-id', 'TEMPERATURE', 'Temperature', 'celsius', 'float', true, NOW(), NOW());

-- Voltage Channel
INSERT INTO sensor_channels (
  id_sensor_channel,
  id_sensor,
  metric_code,
  metric_name,
  unit,
  data_type,
  is_active,
  created_at,
  updated_at
) VALUES 
(gen_random_uuid(), 'volt-sensor-id', 'VOLTAGE', 'Voltage', 'volt', 'float', true, NOW(), NOW());
```

---

## 🚀 Running the Service

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run pm2:start
```

### Check Logs
```bash
# PM2 logs
npm run pm2:logs

# Or directly
tail -f logs/pm2-out.log
```

---

## 📊 Monitoring

### Check TCP Server Status
Look for this in logs:
```
📡 Teltonika TCP Gateway listening on port 5027
✅ Teltonika Gateway connected to MQTT broker
```

### Check Device Connection
```
📡 Teltonika device connected [192.168.1.100:54321] (Total: 1)
📱 IMEI received: 123456789012345 from [192.168.1.100:54321]
```

### Check Data Processing
```
✅ Processed [teltonika] 123456789012345 → GPS: -6.200000, 106.816666
📤 Published to MQTT topic [sensor]: 123456789012345
```

### Check in Database
```sql
-- Check iot_log
SELECT * FROM iot_log 
WHERE device_id = '123456789012345' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check sensor_logs
SELECT sl.*, sc.metric_code, s.label
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sl.id_sensor = s.id_sensor
WHERE sl.id_node = 'your-node-id'
ORDER BY sl.ts DESC
LIMIT 10;
```

---

## 🔧 Troubleshooting

### Device Cannot Connect
1. Check TCP port is open: `netstat -an | grep 5027`
2. Check firewall settings
3. Verify device IP configuration

### No Data in Database
1. Check MQTT broker is running
2. Check `iot_log` table for raw data
3. Check `nodes` table - IMEI must match `dev_eui` or `serial_number`
4. Check NodeProfile mapping is correct
5. Check scheduler is running (every 30s)

### GPS Coordinates Invalid
1. Verify `latlng` format in payload: `"lat,lng"`
2. Check latitude/longitude are valid numbers
3. Check decimal separator (dot, not comma)

### Temperature/Voltage Not Saved
1. Check AVL ID mapping (72/67 for temp, 9/66 for voltage)
2. Verify sensor channels exist with correct `metric_code`
3. Check NodeProfile mapping paths

---

## 🧪 Testing

### Test with Telnet (Manual)
```bash
# Connect to TCP server
telnet localhost 5027

# Send IMEI (17 bytes: 0x00 0x0F + "123456789012345")
# Then send JSON payload
{
  "state": {
    "reported": {
      "ts": 1737552000000,
      "latlng": "-6.200000,106.816666",
      "72": 245,
      "9": 12000
    }
  }
}
```

### Test with MQTT Client
```bash
# Subscribe to sensor topic
mosquitto_sub -h localhost -t sensor -v

# Should see published messages from Teltonika
```

### Test Script
Create `scripts/test/test-teltonika.js`:
```javascript
const net = require('net');

const client = new net.Socket();
client.connect(5027, 'localhost', () => {
  console.log('Connected to Teltonika Gateway');
  
  // Send IMEI
  const imei = Buffer.from([0x00, 0x0F]);
  const imeiData = Buffer.from('123456789012345');
  client.write(Buffer.concat([imei, imeiData]));
  
  // Send JSON payload
  setTimeout(() => {
    const payload = JSON.stringify({
      state: {
        reported: {
          ts: Date.now(),
          latlng: '-6.200000,106.816666',
          72: 245,
          9: 12000
        }
      }
    });
    client.write(payload);
  }, 1000);
});

client.on('data', (data) => {
  console.log('Received:', data.toString());
  client.destroy();
});

client.on('close', () => {
  console.log('Connection closed');
});
```

Run: `node scripts/test/test-teltonika.js`

---

## 📈 AVL ID Reference

Common Teltonika FM125 AVL IDs:

| AVL ID | Description | Unit | Conversion |
|--------|-------------|------|------------|
| 9 | Analog Input 1 | mV | ÷ 1000 = V |
| 66 | External Voltage | mV | ÷ 1000 = V |
| 67 | Battery Voltage | mV | ÷ 1000 = V |
| 72 | Temperature (DS18B20) | decidegree | ÷ 10 = °C |
| 240 | Movement | boolean | 0/1 |
| 239 | Ignition | boolean | 0/1 |

For complete list, refer to Teltonika FM125 documentation.

---

## 🎯 Best Practices

1. **IMEI Management**: Use IMEI as unique identifier in `dev_eui` or `serial_number`
2. **Connection Timeout**: Set appropriate timeout for idle connections
3. **Error Handling**: Always ACK received data (success or error)
4. **Buffer Management**: Clear buffer after each complete message
5. **Logging**: Use minimal logging for production (avoid flooding)
6. **Monitoring**: Track active connections and processing stats

---

## 🔐 Security Considerations

1. **Firewall**: Restrict TCP port 5027 to known Teltonika device IPs
2. **Authentication**: Consider adding IMEI whitelist validation
3. **Encryption**: Use VPN or TLS for production deployments
4. **Rate Limiting**: Implement connection rate limiting if needed

---

## 📚 References

- [Teltonika FM125 Documentation](https://wiki.teltonika-gps.com/view/FM125)
- [MQTT Protocol Specification](https://mqtt.org/)
- [IoT Gateway Main Documentation](../README.md)
- [Telemetry Processing Guide](./TELEMETRY-PROCESSING.md)

---

**Integration Complete!** 🎉

For support, check logs or contact the development team.
