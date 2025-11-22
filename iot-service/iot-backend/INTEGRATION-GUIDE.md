# Device Commands - Integration Guide

Panduan integrasi antara iot-backend, iot-gtw, dan firmware ESP32.

---

## 🔄 Complete Flow

```
┌──────────────┐
│ Client App   │ (Web/Mobile)
└──────┬───────┘
       │ HTTP POST /api/device-commands/relay
       │ {"deviceId":"A1B2C3D4E5F6","action":"on","target":"out1"}
       ▼
┌─────────────────────────────────────────────────────────┐
│ iot-backend (Port 3000)                                 │
│                                                         │
│  DeviceCommandsController                               │
│    ↓                                                    │
│  DeviceCommandsService (validate)                       │
│    ↓                                                    │
│  MqttService.publishDeviceCommand()                     │
│    ↓                                                    │
│  MQTT Client (mqtt package)                             │
│    Topic: sensor/A1B2C3D4E5F6/command                   │
│    Payload: {"action":"relay","target":"out1",...}      │
└────────────────────┬────────────────────────────────────┘
                     │ MQTT Publish (QoS 1)
                     ▼
┌─────────────────────────────────────────────────────────┐
│ MQTT Broker (109.105.194.174:8366)                      │
└────────────────────┬────────────────────────────────────┘
                     │ MQTT Subscribe
                     ▼
┌─────────────────────────────────────────────────────────┐
│ ESP32 Firmware                                          │
│                                                         │
│  mqttCallback(topic, payload) {                         │
│    if (topic == "sensor/<ID>/command") {                │
│      parseJSON(payload)                                 │
│      queueCommand(cmd)  // Non-blocking                 │
│    }                                                    │
│  }                                                      │
│                                                         │
│  loop() {                                               │
│    processCommandQueue()                                │
│    if (cmd.action == "relay") {                         │
│      if (cmd.state == "on")                             │
│        digitalWrite(pin, LOW)                           │
│      else if (cmd.state == "off")                       │
│        digitalWrite(pin, HIGH)                          │
│      else if (cmd.state == "pulse") {                   │
│        digitalWrite(pin, LOW)                           │
│        startTimer(cmd.duration)                         │
│      }                                                  │
│      sendAck()  // Publish event                        │
│    }                                                    │
│  }                                                      │
│                                                         │
│  sendAck() {                                            │
│    topic = "sensor/<ID>/event"                          │
│    payload = {"event":"relay_ack",...}                  │
│    mqtt.publish(topic, payload)                         │
│  }                                                      │
└────────────────────┬────────────────────────────────────┘
                     │ MQTT Publish
                     ▼
┌─────────────────────────────────────────────────────────┐
│ MQTT Broker (109.105.194.174:8366)                      │
└────────────────────┬────────────────────────────────────┘
                     │ MQTT Subscribe
                     ▼
┌─────────────────────────────────────────────────────────┐
│ iot-gtw (Port 4000)                                     │
│                                                         │
│  MqttService (subscribed to sensor/+/event)             │
│    ↓                                                    │
│  handleMessage(topic, payload)                          │
│    ↓                                                    │
│  IotLogService.detectLabel(payload)                     │
│    → detects "event" field → returns "event" label      │
│    ↓                                                    │
│  IotLogService.create({                                 │
│    device_id: "A1B2C3D4E5F6",                           │
│    label: "event",                                      │
│    topic: "sensor/A1B2C3D4E5F6/event",                  │
│    payload: {"event":"relay_ack",...}                   │
│  })                                                     │
└────────────────────┬────────────────────────────────────┘
                     │ TypeORM Save
                     ▼
┌─────────────────────────────────────────────────────────┐
│ PostgreSQL (109.105.194.174:54366)                      │
│                                                         │
│  iot_logs table:                                        │
│  ┌────────┬────────┬────────────┬────────────────────┐ │
│  │ id     │ label  │ device_id  │ payload            │ │
│  ├────────┼────────┼────────────┼────────────────────┤ │
│  │ uuid   │ event  │ A1B2C...   │ {"event":"relay... │ │
│  └────────┴────────┴────────────┴────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 MQTT Topics

### Command Topic (Backend → Device)
```
Topic: sensor/<DEVICE_ID>/command
QoS: 1
Retain: false
```

**Payload Structure:**
```json
{
  "action": "relay",
  "target": "out1|out2",
  "state": "on|off|pulse",
  "duration": 5000  // Optional, only for pulse
}
```

**Examples:**
```json
// Turn ON
{"action":"relay","target":"out1","state":"on"}

// Turn OFF
{"action":"relay","target":"out1","state":"off"}

// Pulse for 5 seconds
{"action":"relay","target":"out1","state":"pulse","duration":5000}
```

---

### Event Topic (Device → Backend)
```
Topic: sensor/<DEVICE_ID>/event
QoS: 1
Retain: false
```

**Success Payload:**
```json
{
  "event": "relay_ack",
  "target": "out1",
  "new_state": "on",
  "timestamp": 1700000000
}
```

**Error Payload:**
```json
{
  "event": "relay_error",
  "target": "out1",
  "error": "invalid_pin",
  "timestamp": 1700000000
}
```

---

## 🔧 Component Configuration

### 1. iot-backend Configuration

**File:** `iot-backend/.env`
```bash
MQTT_BROKER_URL=mqtt://109.105.194.174:8366
MQTT_USERNAME=
MQTT_PASSWORD=
```

**Start:**
```bash
cd iot-backend
npm run start:dev
```

**Verify:**
```bash
curl http://localhost:3000/api/device-commands/status
# Expected: {"connected": true}
```

---

### 2. iot-gtw Configuration

**File:** `iot-gtw/.env`
```bash
MQTT_BROKER=mqtt://109.105.194.174
MQTT_PORT=8366
MQTT_USERNAME=
MQTT_PASSWORD=
```

**Already Configured:**
- ✅ Auto-subscribes to `sensor/+/event`
- ✅ Detects "event" label from payload
- ✅ Saves to database with correct label

**Start:**
```bash
cd iot-gtw
npm run start:dev
```

---

### 3. ESP32 Firmware Configuration

**TODO: Implement in firmware**

**Required Changes:**
```cpp
// 1. Subscribe to command topic
String commandTopic = "sensor/" + deviceId + "/command";
mqtt.subscribe(commandTopic.c_str(), 1);

// 2. MQTT Callback
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  
  if (topicStr.endsWith("/command")) {
    // Parse JSON
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload, length);
    
    // Queue command (non-blocking)
    PendingCommand cmd;
    cmd.action = doc["action"].as<String>();
    cmd.target = doc["target"].as<String>();
    cmd.state = doc["state"].as<String>();
    cmd.duration = doc["duration"] | 0;
    commandQueue.push(cmd);
  }
}

// 3. Process command in loop()
void loop() {
  // ... existing code ...
  
  if (!commandQueue.isEmpty()) {
    PendingCommand cmd = commandQueue.pop();
    executeRelayCommand(cmd);
  }
}

// 4. Execute relay command
void executeRelayCommand(PendingCommand cmd) {
  if (cmd.action == "relay") {
    int pin = getRelayPin(cmd.target);
    
    if (cmd.state == "on") {
      digitalWrite(pin, LOW);  // Active LOW
      sendRelayAck(cmd.target, "on", true);
    }
    else if (cmd.state == "off") {
      digitalWrite(pin, HIGH);
      sendRelayAck(cmd.target, "off", true);
    }
    else if (cmd.state == "pulse") {
      digitalWrite(pin, LOW);
      pulseTimer.start(cmd.duration, [pin, cmd]() {
        digitalWrite(pin, HIGH);
        sendRelayAck(cmd.target, "off", true);
      });
      sendRelayAck(cmd.target, "on", true);
    }
  }
}

// 5. Send acknowledgment
void sendRelayAck(String target, String newState, bool success) {
  StaticJsonDocument<256> doc;
  
  if (success) {
    doc["event"] = "relay_ack";
    doc["target"] = target;
    doc["new_state"] = newState;
  } else {
    doc["event"] = "relay_error";
    doc["target"] = target;
    doc["error"] = "execution_failed";
  }
  
  doc["timestamp"] = getTimestamp();
  
  String payload;
  serializeJson(doc, payload);
  
  String eventTopic = "sensor/" + deviceId + "/event";
  mqtt.publish(eventTopic.c_str(), payload.c_str(), false, 1);
}
```

---

## 🧪 End-to-End Testing

### Test Setup
```bash
# Terminal 1: iot-backend
cd iot-backend
npm run start:dev

# Terminal 2: iot-gtw
cd iot-gtw
npm run start:dev

# Terminal 3: MQTT Monitor
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/#" -v

# Terminal 4: Send commands
cd iot-backend
./test-device-commands.sh
```

---

### Expected Results

**1. Backend logs:**
```
✅ Connected to MQTT broker
📤 Published to sensor/A1B2C3D4E5F6/command: {"action":"relay",...}
```

**2. MQTT Monitor:**
```
sensor/A1B2C3D4E5F6/command {"action":"relay","target":"out1","state":"on"}
sensor/A1B2C3D4E5F6/event {"event":"relay_ack","target":"out1","new_state":"on"}
```

**3. iot-gtw logs:**
```
✅ Saved [event] A1B2C3D4E5F6 → <LOG_ID>
```

**4. Database:**
```sql
SELECT * FROM iot_logs 
WHERE device_id = 'A1B2C3D4E5F6' 
  AND label = 'event' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔍 Debugging

### Backend Not Publishing?
```bash
# Check MQTT connection
curl http://localhost:3000/api/device-commands/status

# Check logs
cd iot-backend && npm run start:dev
# Look for: "✅ Connected to MQTT broker"
```

### Device Not Receiving?
```bash
# Check device subscription
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/+/command" -v

# Send test command
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"TEST","action":"on","target":"out1"}'

# Should see: sensor/TEST/command {"action":"relay",...}
```

### iot-gtw Not Receiving Ack?
```bash
# Check subscription
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/+/event" -v

# Manually publish test ack
mosquitto_pub -h 109.105.194.174 -p 8366 \
  -t "sensor/TEST/event" \
  -m '{"event":"relay_ack","target":"out1","new_state":"on"}'

# Check iot-gtw logs for: "✅ Saved [event] TEST → ..."
```

---

## 📚 Reference Documentation

| Component | Documentation |
|-----------|--------------|
| iot-backend | [DEVICE-COMMANDS-API.md](./docs/DEVICE-COMMANDS-API.md) |
| iot-backend | [DEVICE-COMMANDS-QUICK-REF.md](./DEVICE-COMMANDS-QUICK-REF.md) |
| iot-gtw | [MQTT-RELAY-CONTROL-SPEC.md](../iot-gtw/MQTT-RELAY-CONTROL-SPEC.md) |
| iot-gtw | [README.md](../iot-gtw/README.md) |

---

## ✅ Implementation Checklist

### Backend (iot-backend)
- ✅ MQTT client module
- ✅ Device Commands API
- ✅ DTOs & validation
- ✅ Swagger documentation
- ✅ Test scripts
- ✅ Environment config

### Gateway (iot-gtw)
- ✅ Subscribe to event topics
- ✅ Detect "event" label
- ✅ Save to database
- ✅ Minimal logging

### Firmware (ESP32)
- ⏳ Subscribe to command topic
- ⏳ Parse command JSON
- ⏳ Execute relay control
- ⏳ Send acknowledgment
- ⏳ Error handling

### Frontend (Optional)
- ⏳ Relay control UI
- ⏳ Command history
- ⏳ Real-time status

---

**Last Updated:** November 22, 2025  
**Status:** Backend ✅ | Gateway ✅ | Firmware ⏳
