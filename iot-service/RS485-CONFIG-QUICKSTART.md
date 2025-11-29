# RS485 Config System - Quick Start

## 🚀 TLDR (Too Long; Didn't Read)

**Sistem RS485 Dynamic Configuration dengan 2 MQTT Topics:**

```
Device → get_config/{device_id} → "request"
                ↓
Server → stream_config/{device_id} → JSON config atau "null"
```

**That's it!** Hanya 2 topics. Simple! 🎉

---

## 📋 MQTT Topics

| Topic | Direction | Purpose | Payload |
|-------|-----------|---------|---------|
| `get_config/{device_id}` | Device → Server | Request config | `"request"` |
| `stream_config/{device_id}` | Server → Device | Send config (pull & push) | JSON atau `"null"` |

---

## 🔧 Device Flow (ESP32)

```cpp
// 1. Boot & Connect MQTT
mqtt.connect();

// 2. Subscribe to stream_config
mqtt.subscribe("stream_config/DEMO1-00D42390A994");

// 3. Request config
mqtt.publish("get_config/DEMO1-00D42390A994", "request");

// 4. Wait for response on stream_config
// - JSON config → parse & apply
// - "null" → use default config
// - Timeout → retry after 1 min
```

---

## 📤 Server Flow (iot-gtw)

```typescript
// 1. Listen to get_config/+
mqtt.on('message', (topic, message) => {
  if (topic.startsWith('get_config/')) {
    const deviceId = topic.split('/')[1];
    
    // 2. Check device in database
    const node = await nodeRepository.findOne({ code: deviceId });
    
    if (!node) {
      mqtt.publish(`stream_config/${deviceId}`, 'null');
      return;
    }
    
    // 3. Get sensors for this node
    const sensors = await sensorRepository.find({ idNode: node.idNode });
    
    // 4. Get configs from sensor_catalogs
    const configs = [];
    for (const sensor of sensors) {
      const catalog = await sensorCatalogRepository.findOne({
        where: { idSensorCatalog: sensor.idSensorCatalog }
      });
      
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
    
    // 5. Send configs via stream_config
    mqtt.publish(`stream_config/${deviceId}`, JSON.stringify(configs));
  }
});
```

---

## 📊 Config JSON Example

```json
[
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
        "unit": "m³/h",
        "category": "sensor_data"
      }
    ]
  }
]
```

**Note:** Config is array - 1 device can have multiple sensors!

---

## 🧪 Test Command

```bash
# Publish config request
mosquitto_pub -h 109.105.194.174 -p 8366 \
  -u mqtt_user -P pantek_123 \
  -t "get_config/TEST-001" \
  -m "request" -q 1

# Subscribe to response
mosquitto_sub -h 109.105.194.174 -p 8366 \
  -u mqtt_user -P pantek_123 \
  -t "stream_config/TEST-001" \
  -q 1 -v
```

---

## ✅ Status

- ✅ Pull Config: **IMPLEMENTED**
- ✅ Database Integration: **IMPLEMENTED** (sensor_catalogs)
- ✅ Multi-Sensor Support: **IMPLEMENTED**
- 🚧 Push Config: **PLANNED**
- ✅ Backend: **READY**
- ⏳ Device Code: **TODO**

---

## 📖 Full Documentation

See: [RS485-CONFIG-SYSTEM.md](./RS485-CONFIG-SYSTEM.md)

---

**Last Updated:** November 24, 2025
