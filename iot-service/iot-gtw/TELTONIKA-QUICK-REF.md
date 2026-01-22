# Teltonika FM125 Integration - Quick Reference

## 🚀 Quick Start

### 1. Enable Teltonika in `.env`
```bash
TELTONIKA_TCP_PORT=5027
TELTONIKA_ENABLED=true
TELTONIKA_MQTT_PUBLISH=true
```

### 2. Setup Database
```bash
npm run setup:teltonika
```

### 3. Start Gateway
```bash
npm run start:dev
```

### 4. Test Connection
```bash
npm run test:teltonika
```

---

## 📡 How It Works

```
Teltonika FM125
   ↓ TCP (port 5027)
TeltonikaGateway
   ↓ Convert to JSON
   ↓ Publish MQTT
MQTT Broker
   ↓ Existing Flow
iot_log → Scheduler → TelemetryProcessor → sensor_logs
```

---

## 📦 Data Format

### Input (Teltonika)
```json
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

### Output (MQTT)
```json
{
  "device_id": "123456789012345",
  "timestamp": 1737552000000,
  "gps": {
    "latitude": -6.200000,
    "longitude": 106.816666
  },
  "sensors": {
    "temperature": 24.5,
    "voltage": 12.0
  },
  "metadata": {
    "source": "teltonika",
    "model": "FM125"
  }
}
```

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| TELTONIKA_TCP_PORT | 5027 | TCP server port |
| TELTONIKA_ENABLED | true | Enable/disable module |
| TELTONIKA_MQTT_PUBLISH | true | Publish to MQTT |
| TELTONIKA_TIMEOUT | 30000 | Connection timeout (ms) |

---

## 📊 Monitoring

### Check Logs
```bash
npm run pm2:logs

# Look for:
📡 Teltonika TCP Gateway listening on port 5027
📱 IMEI received: 123456789012345
✅ Processed [teltonika] 123456789012345
```

### Check Database
```sql
-- Raw data
SELECT * FROM iot_log 
WHERE device_id = '123456789012345' 
ORDER BY created_at DESC;

-- Processed data
SELECT * FROM sensor_logs 
WHERE id_node = (
  SELECT id_node FROM nodes 
  WHERE dev_eui = '123456789012345'
)
ORDER BY ts DESC;
```

---

## 🧪 Testing

### Manual Test with Script
```bash
npm run test:teltonika
```

### Test with Telnet
```bash
telnet localhost 5027
# Send IMEI + JSON payload
```

### Test with Real Device
Configure Teltonika FM125:
- **Server IP:** Your server IP
- **Server Port:** 5027
- **Protocol:** JSON
- **Send Interval:** 300 seconds

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | Change TELTONIKA_TCP_PORT |
| IMEI not recognized | Register in `nodes` table |
| No data in sensor_logs | Check NodeProfile mapping |
| GPS invalid | Verify latlng format |

---

## 📚 Full Documentation

See [TELTONIKA-INTEGRATION.md](../docs/TELTONIKA-INTEGRATION.md)

---

**Ready to use!** 🎉
