# Relay Control via MQTT - Implementation Guide

## 🔌 Hardware Configuration

### NE555 Relay Module
- **Model**: Art Techno NE555 Delay Timer Relay 5V 10A
- **GPIO Pin**: GPIO14 (`RELAY_NE555_PIN`)
- **Isolation**: PC817 optocoupler (safe for ESP32 3.3V)
- **Trigger Logic**: **Active LOW**
  - GPIO LOW (0V) = Relay ON (de-energized)
  - GPIO HIGH (3.3V) = Relay OFF (energized)

### Wiring Diagram
```
ESP32-S3 DevKitC-1          NE555 Relay Module
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│  GND ───────────┼─────────┤ GND              │
│                 │         │                  │
│  GPIO14 ────────┼─────────┤ IN/TRIG          │
│                 │         │                  │
└─────────────────┘         │ VCC (5V) ◄───────┤──── External 5V PSU
                            │                  │
                            │ NO ◄─────────────┤──── Load
                            │ COM ◄────────────┤──── Load
                            │ NC               │
                            └──────────────────┘
```

**⚠️ Important Notes:**
- VCC relay module must use **separate 5V power supply** (not from ESP32)
- Common GND between ESP32 and relay module required
- GPIO15 already used for LTE module restart relay (DO NOT MODIFY)
- GPIO38 used for digital input (pump status monitoring)

---

## 📡 MQTT Command Topic

### Subscribe Topic
```
sensor/{device_id}/command
```
Example: `sensor/DEMO1-00D42390A994/command`

### Command Format (JSON)
```json
{
    "action": "relay",
    "target": "out1",
    "state": "on|off|restart"
}
```

### Command Examples

#### 1. Turn Relay ON
```json
{
    "action": "relay",
    "target": "out1",
    "state": "on"
}
```
- GPIO14 = LOW
- Relay de-energized
- Load connected to NO terminal will be **disconnected**

#### 2. Turn Relay OFF
```json
{
    "action": "relay",
    "target": "out1",
    "state": "off"
}
```
- GPIO14 = HIGH
- Relay energized (current flowing)
- Load connected to NO terminal will be **connected**

#### 3. Restart Sequence
```json
{
    "action": "relay",
    "target": "out1",
    "state": "restart"
}
```
- Sequence: OFF (5 seconds) → ON
- Useful for hard restart of connected device
- Total duration: ~5 seconds

---

## 📤 Status Feedback Topic

### Publish Topic
```
sensor/{device_id}/relay_status
```
Example: `sensor/DEMO1-00D42390A994/relay_status`

### Status Message Format
```json
{
    "target": "out1",
    "state": "on|off|restart",
    "success": true
}
```

---

## 🔄 Auto-Test Mode

When device boots, relay enters **test mode** (auto-toggle every 10 seconds):

```
[Relay Test] 🔴 ON
[Relay] (Test mode active - will stop after MQTT command received)

... (10 seconds later) ...

[Relay Test] ⚪ OFF
[Relay] (Test mode active - will stop after MQTT command received)
```

### Test Mode Behavior
- **Enabled**: On boot until first MQTT command received
- **Interval**: 10 seconds toggle (defined in `RELAY_TEST_INTERVAL_MS`)
- **Purpose**: Verify relay hardware before remote control
- **Auto-disable**: Once any MQTT command received, test mode stops

### Disable Test Mode
Send any MQTT command to disable auto-test:
```json
{"action": "relay", "target": "out1", "state": "off"}
```

---

## 🧪 Testing Guide

### 1. Hardware Test (No MQTT)
Flash firmware and observe serial monitor:
```
[Relay] NE555 module initialized on GPIO14
[Relay Test] 🔴 ON
[Relay] (Test mode active - will stop after MQTT command received)
```
- You should hear relay **clicking** every 10 seconds
- Verify with multimeter (continuity test on NO/COM terminals)

### 2. MQTT Control Test
Use MQTT client (e.g., MQTT Explorer, mosquitto_pub):

```bash
# Turn relay ON
mosquitto_pub -h your-broker.com -t sensor/DEMO1-00D42390A994/command \
  -m '{"action":"relay","target":"out1","state":"on"}'

# Turn relay OFF
mosquitto_pub -h your-broker.com -t sensor/DEMO1-00D42390A994/command \
  -m '{"action":"relay","target":"out1","state":"off"}'

# Restart sequence
mosquitto_pub -h your-broker.com -t sensor/DEMO1-00D42390A994/command \
  -m '{"action":"relay","target":"out1","state":"restart"}'
```

### 3. Verify Status Feedback
Subscribe to status topic:
```bash
mosquitto_sub -h your-broker.com -t sensor/DEMO1-00D42390A994/relay_status
```

Expected response:
```json
{"target":"out1","state":"on","success":true}
```

---

## 🛡️ Safety Features

### 1. Optocoupler Isolation
- PC817 optocoupler provides galvanic isolation
- ESP32 GPIO protected from relay coil voltage spikes
- Safe for 3.3V logic interfacing with 5V relay

### 2. Pin Conflict Prevention
- GPIO14: NE555 relay (newly added)
- GPIO15: LTE module restart relay (PROTECTED - do not modify)
- GPIO38: Digital input monitoring (moved from GPIO14)

### 3. Command Validation
```cpp
if (target != "out1") {
    Serial.printf("[Relay] ❌ Unknown target: %s\n", target.c_str());
    return;
}
```
- Only accepts valid target "out1"
- Unknown commands rejected with error message

### 4. State Validation
```cpp
if (state == "on") { ... }
else if (state == "off") { ... }
else if (state == "restart") { ... }
else {
    Serial.printf("[Relay] ❌ Unknown state: %s\n", state.c_str());
}
```

---

## 📊 Serial Monitor Output Examples

### Boot Sequence
```
[Relay] NE555 module initialized on GPIO14
[Boot] Publishing boot event to sensor/DEMO1-00D42390A994/boot
[Boot] ✅ Notification sent
[Boot] Subscribing to sensor/DEMO1-00D42390A994/command
[Boot] ✅ Subscribed to command topic
```

### Test Mode Active
```
[Relay Test] 🔴 ON
[Relay] (Test mode active - will stop after MQTT command received)

[Relay Test] ⚪ OFF
[Relay] (Test mode active - will stop after MQTT command received)
```

### MQTT Command Received
```
[MQTT] Message arrived [sensor/DEMO1-00D42390A994/command] 61 bytes
[Command] Received command from server
[Command] Payload: {"action":"relay","target":"out1","state":"on"}
[Command] Relay control: target=out1, state=on
[Relay] ✅ OUT1 → ON (GPIO14 = LOW)
```

### Restart Sequence
```
[Command] Relay control: target=out1, state=restart
[Relay] 🔄 Restart sequence...
[Relay]   → OFF (5 seconds)
[Relay]   → ON
[Relay] ✅ Restart completed
```

---

## 🔧 Configuration Constants

### In `include/config.h`
```cpp
#define RELAY_NE555_PIN         14      // GPIO14 - NE555 Relay Module (active LOW)
#define RELAY_TEST_INTERVAL_MS  10000   // Test relay every 10 seconds
#define IO_DIGITAL_IN_1_PIN     38      // GPIO38 - Digital Input for pump status
```

### In `src/main.cpp`
```cpp
bool relayTestMode = true;   // Auto-toggle test mode (disable after MQTT command)
bool relayState = false;     // Current relay state (false=OFF, true=ON)
unsigned long lastRelayTest = 0;  // Last test toggle timestamp
```

---

## 🚀 Future Enhancements

### 1. Scheduled Control
Add time-based scheduling:
```json
{
    "action": "relay",
    "target": "out1",
    "schedule": {
        "on_time": "08:00",
        "off_time": "18:00"
    }
}
```

### 2. Multiple Relay Support
Expand to control additional relays:
```json
{
    "action": "relay",
    "target": "out2",
    "state": "on"
}
```

### 3. Timer Mode
Auto-off after duration:
```json
{
    "action": "relay",
    "target": "out1",
    "state": "on",
    "duration": 300  // seconds
}
```

### 4. Conditional Control
Based on sensor thresholds:
```json
{
    "action": "relay",
    "target": "out1",
    "condition": {
        "sensor": "pressure",
        "threshold": 5.0,
        "operator": ">"
    }
}
```

---

## 📝 Troubleshooting

### Issue: Relay not clicking
**Check:**
1. GPIO14 voltage with multimeter (should toggle 0V ↔ 3.3V)
2. External 5V power supply connected to VCC
3. Common GND between ESP32 and relay module
4. NE555 timer adjustment (potentiometer on module)

### Issue: MQTT commands not working
**Check:**
1. Subscribe confirmation in serial monitor
2. Command topic format: `sensor/{device_id}/command`
3. JSON payload format valid
4. MQTT broker connectivity

### Issue: Test mode won't stop
**Check:**
1. Send valid MQTT command (sets `relayTestMode = false`)
2. Verify command callback executed (check serial output)
3. Re-upload firmware if stuck

### Issue: Relay state inverted
**Verify active LOW logic:**
- ON command = GPIO LOW = relay de-energized
- OFF command = GPIO HIGH = relay energized
- If inverted, check NO/NC wiring on relay terminals

---

## 📚 Code References

### Main Files Modified
1. **`include/config.h`**: Pin definitions
2. **`src/main.cpp`**: 
   - `controlRelay()` function
   - `mqttCallback()` command handling
   - `loop()` test mode logic
3. **`src/telemetry.cpp`**: Subscribe to command topic on boot

### Key Functions
- `controlRelay(target, state)`: Execute relay control
- `mqttCallback(topic, payload, length)`: Parse MQTT commands
- Auto-test logic in `loop()`: Toggle every 10 seconds

---

## ✅ Implementation Checklist

- [x] GPIO14 configured for NE555 relay
- [x] GPIO38 reassigned for digital input (pump status)
- [x] Active LOW relay logic implemented
- [x] Auto-test mode (10-second toggle)
- [x] MQTT command topic subscribe
- [x] Command parsing (action, target, state)
- [x] Relay control function (on/off/restart)
- [x] Status feedback publish
- [x] Test mode auto-disable after first command
- [x] Serial debug output
- [x] Safety validation (target/state checks)

---

## 📞 Support

For hardware issues:
- Check NE555 relay module datasheet
- Verify optocoupler PC817 specifications
- Test with simple Arduino blink sketch first

For MQTT issues:
- Verify broker connection with MQTT Explorer
- Check QoS settings (currently QoS 0)
- Test with mosquitto_pub/sub CLI tools

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-25  
**Firmware Version**: esp32s3-multisensor-v2.1  
**Hardware**: ESP32-S3 DevKitC-1 + NE555 Relay Module
