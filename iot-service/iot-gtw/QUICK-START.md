# Quick Start Guide - IoT Gateway

## 🚀 Quick Start (5 menit)

### Step 1: Install Dependencies
```bash
cd iot-gtw
npm install
```

### Step 2: Build Application
```bash
npm run build
```

### Step 3: Run Migration
```bash
node run-migration.js
```

### Step 4: Start Application
```bash
npm run start:dev
```

### Step 5: Verify
```bash
# Check health
curl http://localhost:4000/api/health

# Check stats
curl http://localhost:4000/api/iot-logs/stats
```

## ✅ Success Indicators

Ketika aplikasi berjalan dengan benar, Anda akan melihat:

```
[MqttService] ✅ Connected to MQTT broker
[MqttService] ✅ Subscribed to MQTT topic: 'sensor'
[Bootstrap] 🚀 Application is running on: http://localhost:4000/api
```

## 📡 Test MQTT

Publish message ke MQTT broker (topic: `sensor`):

```bash
# Example using mosquitto_pub
mosquitto_pub -h 109.105.194.174 -p 8366 -t sensor -m '{"deviceId":"test-001","temperature":25.5,"humidity":60}'
```

Atau gunakan MQTT client lain seperti:
- MQTT.fx
- MQTT Explorer
- Node-RED

## 📊 View Saved Data

```bash
# Get statistics
curl http://localhost:4000/api/iot-logs/stats

# Get all unprocessed logs
curl http://localhost:4000/api/iot-logs/unprocessed

# Get telemetry logs
curl http://localhost:4000/api/iot-logs/by-label/telemetry

# Get logs from specific device
curl http://localhost:4000/api/iot-logs/by-device/test-001
```

## 🔧 Configuration

File `.env` sudah ter-configure dengan:
- Database: PostgreSQL di 109.105.194.174:54366
- MQTT Broker: mqtt://109.105.194.174:8366
- Topic: sensor
- Port: 4000

Anda bisa edit `.env` untuk custom configuration.

## 📝 Available Scripts

```bash
npm run start:dev    # Development mode with watch
npm run start:prod   # Production mode
npm run build        # Build TypeScript to JavaScript
node run-migration.js # Run database migration
```

## 🆘 Troubleshooting

### Application won't start
```bash
# Check if port 4000 is available
lsof -i :4000

# Check if dependencies installed
ls node_modules/
```

### MQTT not connecting
```bash
# Test MQTT broker connectivity
telnet 109.105.194.174 8366

# Check MQTT health
curl http://localhost:4000/api/health/mqtt
```

### Database error
```bash
# Check database health
curl http://localhost:4000/api/health/database

# Verify connection string in .env
cat .env | grep DATABASE
```

## 🎯 What Happens When MQTT Message Arrives?

1. **Message received** from topic `sensor`
2. **Parsed** (JSON or non-JSON)
3. **Label auto-detected** based on content
4. **Device ID extracted** from payload
5. **Saved to database** (table: iot_log)
6. **Log displayed** in console

Example log:
```
[MqttService] ✅ Saved MQTT message to database [telemetry] from topic 'sensor'
```

## 🔍 Monitor Real-time

Application logs akan menampilkan setiap message yang diterima:

```bash
# Watch logs while running
npm run start:dev

# You'll see:
# - MQTT messages received
# - Label detection results
# - Save confirmation
# - Any errors
```

## 📦 What's Created in Database?

Table: `iot_log`

Example record:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "telemetry",
  "topic": "sensor",
  "payload": {
    "deviceId": "test-001",
    "temperature": 25.5,
    "humidity": 60
  },
  "device_id": "test-001",
  "timestamp": "2025-11-20T04:00:00.000Z",
  "processed": false,
  "notes": null,
  "created_at": "2025-11-20T04:00:00.000Z",
  "updated_at": "2025-11-20T04:00:00.000Z"
}
```

## 🎓 Next Steps

1. **Test with real device**: Configure device untuk publish ke MQTT
2. **Process logs**: Implement business logic untuk process unprocessed logs
3. **Add alerting**: Setup alert untuk critical errors
4. **Dashboard**: Create monitoring dashboard
5. **Scale**: Add load balancing jika diperlukan

---

**Need Help?** Check [README.md](README.md) for full documentation
