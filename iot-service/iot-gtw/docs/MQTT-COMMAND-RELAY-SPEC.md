# MQTT Command & Relay Control - Specification

## 📋 Overview

Fitur untuk kontrol relay via MQTT command. Client (backend/frontend) dapat mengirim command ke device untuk mengontrol relay/output digital.

**Date:** November 22, 2025  
**Status:** 🎯 Planning Phase

---

## 🏗️ Architecture

```
┌─────────────────┐         MQTT          ┌──────────────────┐
│   IoT Backend   │ ──────publish────────> │   MQTT Broker    │
│   / Frontend    │                        │   (Mosquitto)    │
└─────────────────┘                        └──────────────────┘
                                                     │
                                                subscribe
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │   ESP32 Device   │
                                            │   (Firmware)     │
                                            └──────────────────┘
                                                     │
                                                  execute
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │  Relay Output    │
                                            │  GPIO Control    │
                                            └──────────────────┘
                                                     │
                                                 feedback
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │   MQTT Broker    │
                                            │   (Event Topic)  │
                                            └──────────────────┘
                                                     │
                                                subscribe
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │   IoT Backend    │
                                            │   (Save to DB)   │
                                            └──────────────────┘
```

---

## 📡 MQTT Topics

### 1. Command Topic (Backend → Device)
**Topic Pattern:** `sensor/<DEVICE_ID>/command`

**Example:**
```
sensor/DEMO1-00D42390A994/command
```

**Device:** Subscribe ke topic ini untuk menerima command

---

### 2. Event/Feedback Topic (Device → Backend)
**Topic Pattern:** `sensor/<DEVICE_ID>/event`

**Example:**
```
sensor/DEMO1-00D42390A994/event
```

**Backend:** Subscribe ke topic ini untuk menerima feedback dari device

---

## 📦 Payload Formats

### 1. Command Payload (Backend → Device)

#### A. Turn Relay ON
```json
{
  "action": "relay",
  "target": "out1",
  "state": "on",
  "timestamp": "2025-11-22 13:00:00"
}
```

#### B. Turn Relay OFF
```json
{
  "action": "relay",
  "target": "out2",
  "state": "off",
  "timestamp": "2025-11-22 13:00:00"
}
```

#### C. Pulse Relay (ON then auto-OFF)
```json
{
  "action": "relay",
  "target": "out1",
  "state": "pulse",
  "duration_ms": 5000,
  "timestamp": "2025-11-22 13:00:00"
}
```

**Notes:**
- `duration_ms`: Duration in milliseconds (default: 1000ms if not specified)
- Useful for momentary actions like hard reboot

---

### 2. Event Payload (Device → Backend)

#### A. Success ACK
```json
{
  "event": "relay_ack",
  "target": "out1",
  "new_state": "on",
  "timestamp": "2025-11-22 13:00:05",
  "device_id": "DEMO1-00D42390A994"
}
```

#### B. Error Response
```json
{
  "event": "relay_error",
  "target": "out3",
  "error": "Invalid target pin",
  "timestamp": "2025-11-22 13:00:05",
  "device_id": "DEMO1-00D42390A994"
}
```

#### C. Pulse Completed
```json
{
  "event": "relay_pulse_complete",
  "target": "out1",
  "duration_ms": 5000,
  "timestamp": "2025-11-22 13:00:10",
  "device_id": "DEMO1-00D42390A994"
}
```

---

## 🔌 Hardware Mapping

### Output Pins
```cpp
// Relay 1 (Generic Relay / Hard Reboot)
relay_out1 → RELAY_PIN (IO_DIGITAL_OUT_1_PIN)
             Default: HIGH (relay OFF)
             Command "on": LOW (relay ON)

// Relay 2 (Generic Output)
relay_out2 → GPIO38 (or other free GPIO)
             Default: HIGH (relay OFF)
             Command "on": LOW (relay ON)
```

### Pin Configuration
- **Active:** LOW (relay energized)
- **Inactive:** HIGH (relay de-energized)
- **Default State:** HIGH (safe state - relay OFF)

---

## 🔄 Firmware Flow

### 1. MQTT Subscribe
```cpp
void setupMQTT() {
  // Subscribe to command topic
  String commandTopic = "sensor/" + String(DEVICE_ID) + "/command";
  mqttClient.subscribe(commandTopic.c_str(), 1);
}
```

### 2. Command Callback
```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse JSON payload
  // Validate command
  // Add to command queue (non-blocking)
}
```

### 3. Command Queue Processing
```cpp
struct PendingCommand {
  String action;
  String target;
  String state;
  unsigned long duration_ms;
  unsigned long timestamp;
};

Queue<PendingCommand> commandQueue;

void loop() {
  // Process command queue
  if (!commandQueue.isEmpty()) {
    PendingCommand cmd = commandQueue.dequeue();
    executeCommand(cmd);
  }
}
```

### 4. Execute Command
```cpp
void executeCommand(PendingCommand cmd) {
  if (cmd.action == "relay") {
    if (cmd.target == "out1") {
      if (cmd.state == "on") {
        digitalWrite(RELAY_PIN, LOW);
        sendAck("out1", "on");
      } else if (cmd.state == "off") {
        digitalWrite(RELAY_PIN, HIGH);
        sendAck("out1", "off");
      } else if (cmd.state == "pulse") {
        // Execute pulse with timer
        startPulse("out1", cmd.duration_ms);
      }
    }
    // Similar for out2
  }
}
```

### 5. Send Feedback
```cpp
void sendAck(String target, String state) {
  String eventTopic = "sensor/" + String(DEVICE_ID) + "/event";
  
  StaticJsonDocument<256> doc;
  doc["event"] = "relay_ack";
  doc["target"] = target;
  doc["new_state"] = state;
  doc["timestamp"] = getCurrentTimestamp();
  doc["device_id"] = DEVICE_ID;
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.publish(eventTopic.c_str(), payload.c_str(), false, 1);
}
```

---

## 🔧 Backend Implementation (iot-gtw)

### 1. Subscribe to Event Topic

Update `mqtt.service.ts` to subscribe to event topics:

```typescript
private subscribeToTopics(): void {
  const topics = [
    'sensor/+/telemetry',    // Existing
    'sensor/+/event',        // NEW: Device events
  ];
  
  topics.forEach(topic => {
    this.client.subscribe(topic, { qos: 1 });
  });
}
```

### 2. Handle Event Messages

```typescript
private async handleMessage(topic: string, message: Buffer): Promise<void> {
  const messageStr = message.toString();
  const payload = JSON.parse(messageStr);
  
  // Detect label based on topic
  let label: LogLabel;
  if (topic.includes('/telemetry')) {
    label = LogLabel.TELEMETRY;
  } else if (topic.includes('/event')) {
    label = LogLabel.EVENT;  // NEW label
  } else if (topic.includes('/command')) {
    label = LogLabel.COMMAND;  // NEW label
  }
  
  // Save to database
  await this.iotLogService.create({
    label,
    topic,
    payload,
    deviceId: this.extractDeviceId(topic, payload),
    timestamp: new Date(),
  });
}
```

### 3. New Command Service (Optional)

Create `relay-command.service.ts`:

```typescript
@Injectable()
export class RelayCommandService {
  constructor(
    private readonly mqttService: MqttService,
  ) {}
  
  /**
   * Send relay command to device
   */
  async sendRelayCommand(
    deviceId: string,
    target: 'out1' | 'out2',
    state: 'on' | 'off' | 'pulse',
    durationMs?: number,
  ): Promise<void> {
    const topic = `sensor/${deviceId}/command`;
    
    const payload = {
      action: 'relay',
      target,
      state,
      ...(state === 'pulse' && { duration_ms: durationMs || 1000 }),
      timestamp: new Date().toISOString(),
    };
    
    await this.mqttService.publish(topic, payload);
  }
  
  /**
   * Turn relay ON
   */
  async turnOn(deviceId: string, target: 'out1' | 'out2'): Promise<void> {
    return this.sendRelayCommand(deviceId, target, 'on');
  }
  
  /**
   * Turn relay OFF
   */
  async turnOff(deviceId: string, target: 'out1' | 'out2'): Promise<void> {
    return this.sendRelayCommand(deviceId, target, 'off');
  }
  
  /**
   * Pulse relay (ON then auto-OFF)
   */
  async pulse(
    deviceId: string,
    target: 'out1' | 'out2',
    durationMs = 1000,
  ): Promise<void> {
    return this.sendRelayCommand(deviceId, target, 'pulse', durationMs);
  }
}
```

### 4. REST API Endpoint (Optional)

Create `relay-command.controller.ts`:

```typescript
@Controller('relay-command')
export class RelayCommandController {
  constructor(
    private readonly relayCommandService: RelayCommandService,
  ) {}
  
  @Post(':deviceId/on')
  async turnOn(
    @Param('deviceId') deviceId: string,
    @Body() body: { target: 'out1' | 'out2' },
  ) {
    await this.relayCommandService.turnOn(deviceId, body.target);
    return { success: true, message: 'Command sent' };
  }
  
  @Post(':deviceId/off')
  async turnOff(
    @Param('deviceId') deviceId: string,
    @Body() body: { target: 'out1' | 'out2' },
  ) {
    await this.relayCommandService.turnOff(deviceId, body.target);
    return { success: true, message: 'Command sent' };
  }
  
  @Post(':deviceId/pulse')
  async pulse(
    @Param('deviceId') deviceId: string,
    @Body() body: { target: 'out1' | 'out2'; duration_ms?: number },
  ) {
    await this.relayCommandService.pulse(
      deviceId,
      body.target,
      body.duration_ms,
    );
    return { success: true, message: 'Pulse command sent' };
  }
}
```

---

## 🗃️ Database Schema

### Option 1: Reuse `iot_log` table

Add new labels:
- `command` - Commands sent to device
- `event` - Events/feedback from device

```typescript
export enum LogLabel {
  TELEMETRY = 'telemetry',
  COMMAND = 'command',      // NEW
  EVENT = 'event',          // NEW
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  LOG = 'log',
}
```

### Option 2: New `device_command` table (Future)

```sql
CREATE TABLE device_command (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(100) NOT NULL,
  command_type VARCHAR(50) NOT NULL,  -- 'relay', 'reboot', etc.
  target VARCHAR(50),                  -- 'out1', 'out2'
  state VARCHAR(50),                   -- 'on', 'off', 'pulse'
  parameters JSONB,                    -- Additional params
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'ack', 'error'
  sent_at TIMESTAMP,
  ack_at TIMESTAMP,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_command_device_id ON device_command(device_id);
CREATE INDEX idx_device_command_status ON device_command(status);
```

---

## 🧪 Testing Plan

### 1. Manual MQTT Test (Using mosquitto_pub)

**Send command:**
```bash
mosquitto_pub -h localhost -p 1883 \
  -t "sensor/DEMO1-00D42390A994/command" \
  -m '{"action":"relay","target":"out1","state":"on","timestamp":"2025-11-22 13:00:00"}'
```

**Listen for events:**
```bash
mosquitto_sub -h localhost -p 1883 \
  -t "sensor/DEMO1-00D42390A994/event" -v
```

### 2. REST API Test (Using curl)

**Turn relay ON:**
```bash
curl -X POST http://localhost:3000/relay-command/DEMO1-00D42390A994/on \
  -H "Content-Type: application/json" \
  -d '{"target":"out1"}'
```

**Turn relay OFF:**
```bash
curl -X POST http://localhost:3000/relay-command/DEMO1-00D42390A994/off \
  -H "Content-Type: application/json" \
  -d '{"target":"out1"}'
```

**Pulse relay:**
```bash
curl -X POST http://localhost:3000/relay-command/DEMO1-00D42390A994/pulse \
  -H "Content-Type: application/json" \
  -d '{"target":"out1","duration_ms":5000}'
```

### 3. Frontend Test

Create UI with relay control buttons:
- [ ] Turn ON button
- [ ] Turn OFF button
- [ ] Pulse button (with duration input)
- [ ] Status indicator (based on events)
- [ ] Command history

---

## 🔒 Security Considerations

### 1. Authentication
- [ ] Require authentication for command API
- [ ] MQTT username/password for command topic
- [ ] Check user permission for device control

### 2. Authorization
- [ ] Verify user owns the device before sending command
- [ ] Role-based access (admin can control all, user only their devices)

### 3. Rate Limiting
- [ ] Limit commands per device per minute
- [ ] Prevent command spam/flooding

### 4. Validation
- [ ] Validate device_id exists
- [ ] Validate target pin is valid
- [ ] Validate state values
- [ ] Validate duration range (e.g., 100ms - 60000ms)

---

## 📊 Use Cases

### 1. Hard Reboot
```json
{
  "action": "relay",
  "target": "out1",
  "state": "pulse",
  "duration_ms": 5000
}
```
Power cycle the device or connected equipment.

### 2. Water Pump Control
```json
{
  "action": "relay",
  "target": "out2",
  "state": "on"
}
```
Turn on water pump. Turn off manually or via timer.

### 3. Valve Control
```json
{
  "action": "relay",
  "target": "out1",
  "state": "pulse",
  "duration_ms": 2000
}
```
Open valve for 2 seconds then auto-close.

### 4. Alarm Output
```json
{
  "action": "relay",
  "target": "out2",
  "state": "on"
}
```
Trigger alarm/buzzer based on sensor threshold.

---

## 🚀 Implementation Phases

### Phase 1: Firmware (ESP32) ✅ (Already Planned)
- [ ] Subscribe to command topic
- [ ] Parse command payload
- [ ] Execute relay commands
- [ ] Send ACK/error events
- [ ] Handle pulse with timer

### Phase 2: Backend (iot-gtw) - THIS PROJECT
- [ ] Subscribe to event topic
- [ ] Add `COMMAND` and `EVENT` labels
- [ ] Create `RelayCommandService`
- [ ] Create REST API endpoints
- [ ] Save commands and events to database

### Phase 3: Frontend (iot-angular)
- [ ] Create relay control UI
- [ ] Show relay status
- [ ] Show command history
- [ ] Real-time event updates (WebSocket?)

### Phase 4: Advanced Features
- [ ] Scheduled commands
- [ ] Automation rules (if sensor > threshold, turn on relay)
- [ ] Command templates
- [ ] Batch commands

---

## 📝 Notes

1. **Non-blocking:** Firmware should process commands in queue (non-blocking)
2. **Feedback:** Always send ACK or error event after command execution
3. **Timeout:** Backend should handle timeout if no ACK received (e.g., 10 seconds)
4. **Retry:** Consider retry mechanism for critical commands
5. **Logging:** Log all commands and events for audit trail

---

## 🎯 Next Steps

1. ✅ Document specification (this file)
2. ⏳ Implement firmware side (ESP32)
3. ⏳ Implement backend side (iot-gtw)
4. ⏳ Test MQTT flow
5. ⏳ Create REST API
6. ⏳ Build frontend UI

---

**Status:** 📋 Planning Complete - Ready for Implementation

**Author:** AI Assistant  
**Date:** November 22, 2025  
**Version:** 1.0
