# Quick Reference: cek_waktu Feature

## 🚀 Quick Start

### Send Ping Request
```bash
mosquitto_pub -h localhost -t "cek_waktu" -m "ping"
```

### Listen for Response
```bash
mosquitto_sub -h localhost -t "cek_waktu/response" -v
```

### Full Test
```bash
cd iot-gtw
./test-cek-waktu.sh
```

## 📋 Topic Structure

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `cek_waktu` | Client → Server | Request server timestamp |
| `cek_waktu/response` | Server → Client | Response with timestamp |

## 📦 Response Structure

```json
{
  "status": "ok",
  "message": "Server time response",
  "server_time": {
    "iso": "2024-11-21T21:30:45.123+07:00",      // ISO format
    "local": "21/11/2024, 21:30:45",              // Indonesia format
    "timezone": "Asia/Jakarta (UTC+7)",           // Timezone info
    "unix": 1700581845                            // Unix timestamp
  },
  "request": { ... },                             // Echo request
  "received_at": "2024-11-21T14:30:45.120Z"      // UTC timestamp
}
```

## 🎯 Common Use Cases

### 1. Simple Ping
```bash
mosquitto_pub -t "cek_waktu" -m "ping"
```

### 2. Device Time Sync
```bash
mosquitto_pub -t "cek_waktu" -m '{"device_id":"ESP32-001","action":"time_sync"}'
```

### 3. Latency Check
```bash
mosquitto_pub -t "cek_waktu" -m '{"device":"ESP32-001","sent_at":1700581840}'
```

## 🔧 Integration Examples

### Arduino/ESP32
```cpp
client.publish("cek_waktu", "{\"device_id\":\"ESP32-001\"}");
client.subscribe("cek_waktu/response");
```

### Python
```python
client.publish("cek_waktu", json.dumps({"device_id": "PYTHON-001"}))
client.subscribe("cek_waktu/response")
```

### Node.js
```javascript
client.publish('cek_waktu', JSON.stringify({device_id: 'NODE-001'}));
client.subscribe('cek_waktu/response');
```

## ✅ Benefits

- ⏰ **Time Sync**: Sync device time dengan server
- 🔗 **Connection Check**: Verify MQTT connection alive
- 📊 **Latency Measure**: Calculate round-trip time
- 🌏 **Indonesia Timezone**: Standard waktu Indonesia (UTC+7)
- 💾 **No Database**: Request tidak masuk database

## 📝 Notes

- Request ke `cek_waktu` tidak disimpan ke database
- Response selalu ke topic `cek_waktu/response`
- Support JSON & plain text format
- Auto-subscribe saat gateway service start

---
**Status**: ✅ Ready to use
