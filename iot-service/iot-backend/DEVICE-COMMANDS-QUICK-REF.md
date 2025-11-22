# Device Commands - Quick Reference

Quick reference untuk Device Commands API di iot-backend.

---

## 🚀 Quick Start

```bash
# 1. Start backend
cd iot-backend
npm run start:dev

# 2. Test API
./test-device-commands.sh

# 3. Monitor MQTT
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/#" -v
```

---

## 📍 Endpoints

### Send Relay Command
```
POST http://localhost:3000/api/device-commands/relay
```

### Check MQTT Status
```
GET http://localhost:3000/api/device-commands/status
```

---

## 📦 Request Examples

### Turn ON
```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"A1B2C3D4E5F6","action":"on","target":"out1"}'
```

### Turn OFF
```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"A1B2C3D4E5F6","action":"off","target":"out1"}'
```

### Pulse (5 seconds)
```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"A1B2C3D4E5F6","action":"pulse","target":"out1","duration":5000}'
```

---

## 🔄 Flow

```
Client → POST /relay → Backend → MQTT Publish → Device
                                                   ↓
                                            Execute Command
                                                   ↓
Client ← Database ← iot-gtw ← MQTT Subscribe ← Ack Event
```

---

## 📊 MQTT Topics

| Direction | Topic | Payload |
|-----------|-------|---------|
| Backend → Device | `sensor/<ID>/command` | `{"action":"relay","target":"out1","state":"on"}` |
| Device → Backend | `sensor/<ID>/event` | `{"event":"relay_ack","target":"out1","new_state":"on"}` |

---

## 🎯 Action Types

| Action | Description | Duration Required |
|--------|-------------|-------------------|
| `on` | Turn relay ON | ❌ No |
| `off` | Turn relay OFF | ❌ No |
| `pulse` | ON → Wait → OFF | ✅ Yes |

---

## 🔌 Target Relays

| Target | Pin | Common Use |
|--------|-----|------------|
| `out1` | GPIO (Configurable) | Hard reboot / Power cycle |
| `out2` | GPIO (Configurable) | Pump / External device |

---

## 📝 Environment Variables

```bash
# In iot-backend/.env
MQTT_BROKER_URL=mqtt://109.105.194.174:8366
MQTT_USERNAME=
MQTT_PASSWORD=
```

---

## 🧪 Testing

### 1. Check MQTT Connection
```bash
curl http://localhost:3000/api/device-commands/status
# Expected: {"connected": true}
```

### 2. Run Test Suite
```bash
cd iot-backend
./test-device-commands.sh
```

### 3. Monitor MQTT Traffic
```bash
# All sensor topics
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/#" -v

# Specific device commands
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/A1B2C3D4E5F6/command" -v

# Specific device events
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/A1B2C3D4E5F6/event" -v
```

---

## 🐛 Troubleshooting

### Backend Not Connected to MQTT
```bash
# Check env
cat iot-backend/.env | grep MQTT

# Test broker connection
nc -zv 109.105.194.174 8366

# Check logs
cd iot-backend && npm run start:dev
```

### Command Not Received by Device
```bash
# 1. Verify device is online
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/<DEVICE_ID>" -v

# 2. Check device subscribes to command topic
# Device must subscribe to: sensor/<DEVICE_ID>/command

# 3. Monitor all traffic
mosquitto_sub -h 109.105.194.174 -p 8366 -t "#" -v
```

### Acknowledgment Not Received
```bash
# Check iot-gtw is running
cd iot-gtw && npm run start:dev

# Check iot-gtw subscribes to event topics
# Should auto-subscribe to: sensor/+/event and device/+/event
```

---

## 📚 File Structure

```
iot-backend/src/modules/
├── mqtt/
│   ├── mqtt.module.ts       # MQTT module
│   └── mqtt.service.ts      # MQTT client & publish
└── device-commands/
    ├── device-commands.module.ts
    ├── device-commands.controller.ts  # REST endpoints
    ├── device-commands.service.ts     # Business logic
    └── dto/
        ├── send-relay-command.dto.ts  # Request DTO
        └── command-response.dto.ts     # Response DTO
```

---

## 🔗 Related Docs

- [Full API Documentation](./docs/DEVICE-COMMANDS-API.md)
- [MQTT Relay Control Spec](../iot-gtw/MQTT-RELAY-CONTROL-SPEC.md)
- [IoT Gateway Docs](../iot-gtw/README.md)

---

**Last Updated:** November 22, 2025
