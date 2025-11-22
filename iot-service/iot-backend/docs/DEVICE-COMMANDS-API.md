# Device Commands API Documentation

REST API endpoints untuk mengirim perintah ke IoT devices melalui MQTT.

---

## 📋 Overview

**Base URL:** `http://localhost:3000/api/device-commands`

API ini memungkinkan client (web/mobile app) untuk mengirim perintah kontrol ke IoT devices melalui MQTT broker. Backend akan menerima HTTP request dan meneruskannya ke MQTT topic yang sesuai.

---

## 🔌 Architecture

```
Client (Web/Mobile)
    ↓ HTTP POST
Backend (NestJS)
    ↓ MQTT Publish
MQTT Broker (mosquitto)
    ↓ MQTT Subscribe
IoT Device (ESP32)
    ↓ Execute Command
    ↓ MQTT Publish (Ack)
iot-gtw Service
    ↓ Save to Database
Database (PostgreSQL)
```

---

## 🎯 Endpoints

### 1. Send Relay Command

**POST** `/device-commands/relay`

Mengirim perintah kontrol relay (ON/OFF/PULSE) ke device.

#### Request Body

```json
{
  "deviceId": "A1B2C3D4E5F6",
  "action": "on",
  "target": "out1",
  "duration": 5000
}
```

#### Parameters

| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|--------|
| `deviceId` | string | ✅ Yes | Device ID (MAC address) | e.g., `A1B2C3D4E5F6` |
| `action` | enum | ✅ Yes | Relay action | `on`, `off`, `pulse` |
| `target` | enum | ✅ Yes | Target relay output | `out1`, `out2` |
| `duration` | number | ⚠️ Conditional | Duration in ms (required for `pulse`) | Min: 100 |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Command sent successfully",
  "topic": "sensor/A1B2C3D4E5F6/command",
  "payload": {
    "action": "relay",
    "target": "out1",
    "state": "on"
  },
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

#### Error Response (400 Bad Request)

```json
{
  "statusCode": 400,
  "message": "Duration is required for PULSE action",
  "error": "Bad Request"
}
```

---

### 2. Get MQTT Status

**GET** `/device-commands/status`

Check MQTT broker connection status.

#### Response (200 OK)

```json
{
  "connected": true
}
```

---

## 📝 Usage Examples

### Example 1: Turn ON Relay 1

```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "A1B2C3D4E5F6",
    "action": "on",
    "target": "out1"
  }'
```

**MQTT Payload Sent:**
```json
{
  "action": "relay",
  "target": "out1",
  "state": "on"
}
```

**MQTT Topic:** `sensor/A1B2C3D4E5F6/command`

---

### Example 2: Turn OFF Relay 2

```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "A1B2C3D4E5F6",
    "action": "off",
    "target": "out2"
  }'
```

**MQTT Payload:**
```json
{
  "action": "relay",
  "target": "out2",
  "state": "off"
}
```

---

### Example 3: PULSE Relay (Auto OFF after duration)

```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "A1B2C3D4E5F6",
    "action": "pulse",
    "target": "out1",
    "duration": 5000
  }'
```

**MQTT Payload:**
```json
{
  "action": "relay",
  "target": "out1",
  "state": "pulse",
  "duration": 5000
}
```

**Behavior:** Relay ON → wait 5000ms → Relay OFF

---

### Example 4: Check MQTT Connection

```bash
curl http://localhost:3000/api/device-commands/status
```

**Response:**
```json
{
  "connected": true
}
```

---

## 🔄 Device Acknowledgment

Setelah device menerima dan mengeksekusi command, device akan mengirim acknowledgment ke topic:

**Topic:** `sensor/<DEVICE_ID>/event`

**Payload Success:**
```json
{
  "event": "relay_ack",
  "target": "out1",
  "new_state": "on",
  "timestamp": 1700000000
}
```

**Payload Error:**
```json
{
  "event": "relay_error",
  "target": "out1",
  "error": "invalid_pin",
  "timestamp": 1700000000
}
```

Acknowledgment ini akan disimpan oleh `iot-gtw` service dengan label `event`.

---

## 🔐 MQTT Configuration

Backend menggunakan konfigurasi MQTT dari environment variables:

```bash
MQTT_BROKER_URL=mqtt://109.105.194.174:8366
MQTT_USERNAME=
MQTT_PASSWORD=
```

### Connection Details

- **Protocol:** MQTT v3.1.1
- **QoS:** 1 (At least once delivery)
- **Clean Session:** true
- **Reconnect:** Automatic with 1s interval

---

## 📊 MQTT Topic Structure

### Command Topics (Subscribe by Device)

| Topic Pattern | Direction | Description |
|--------------|-----------|-------------|
| `sensor/<DEVICE_ID>/command` | Backend → Device | Relay control commands |

### Event Topics (Publish by Device)

| Topic Pattern | Direction | Description |
|--------------|-----------|-------------|
| `sensor/<DEVICE_ID>/event` | Device → Backend | Command acknowledgments & errors |
| `sensor/<DEVICE_ID>` | Device → Backend | Telemetry data (sensors, signal, system) |

---

## 🧪 Testing

### 1. Start Backend

```bash
cd iot-backend
npm run start:dev
```

### 2. Test MQTT Status

```bash
curl http://localhost:3000/api/device-commands/status
```

Expected: `{"connected": true}`

### 3. Send Test Command

```bash
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TEST_DEVICE",
    "action": "on",
    "target": "out1"
  }'
```

### 4. Monitor MQTT Traffic

```bash
# Subscribe to all sensor topics
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/#" -v

# Subscribe to specific device commands
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/A1B2C3D4E5F6/command" -v
```

---

## 🛠️ Integration with Frontend

### Angular/TypeScript Example

```typescript
interface RelayCommandRequest {
  deviceId: string;
  action: 'on' | 'off' | 'pulse';
  target: 'out1' | 'out2';
  duration?: number;
}

interface CommandResponse {
  success: boolean;
  message: string;
  topic: string;
  payload: any;
  timestamp: string;
}

class DeviceCommandService {
  private apiUrl = 'http://localhost:3000/api/device-commands';

  async sendRelayCommand(request: RelayCommandRequest): Promise<CommandResponse> {
    const response = await fetch(`${this.apiUrl}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async getMqttStatus(): Promise<{ connected: boolean }> {
    const response = await fetch(`${this.apiUrl}/status`);
    return response.json();
  }
}

// Usage
const service = new DeviceCommandService();

// Turn ON relay 1
await service.sendRelayCommand({
  deviceId: 'A1B2C3D4E5F6',
  action: 'on',
  target: 'out1',
});

// Pulse relay 2 for 3 seconds
await service.sendRelayCommand({
  deviceId: 'A1B2C3D4E5F6',
  action: 'pulse',
  target: 'out2',
  duration: 3000,
});
```

### React Example

```javascript
const sendRelayCommand = async (deviceId, action, target, duration) => {
  try {
    const response = await fetch('http://localhost:3000/api/device-commands/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, action, target, duration }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message);
    }

    console.log('Command sent:', result);
    return result;
  } catch (error) {
    console.error('Failed to send command:', error);
    throw error;
  }
};

// Usage
await sendRelayCommand('A1B2C3D4E5F6', 'on', 'out1');
```

---

## 🎯 Use Cases

### 1. Remote Reboot (Hard Reset)

```json
{
  "deviceId": "A1B2C3D4E5F6",
  "action": "pulse",
  "target": "out1",
  "duration": 2000
}
```

`out1` connected to device power relay → hard reboot.

---

### 2. Water Pump Control

```json
{
  "deviceId": "A1B2C3D4E5F6",
  "action": "on",
  "target": "out2"
}
```

`out2` connected to water pump relay → start pumping.

```json
{
  "deviceId": "A1B2C3D4E5F6",
  "action": "off",
  "target": "out2"
}
```

Stop pumping.

---

### 3. Scheduled Irrigation (Pulse)

```json
{
  "deviceId": "A1B2C3D4E5F6",
  "action": "pulse",
  "target": "out2",
  "duration": 300000
}
```

Water pump ON for 5 minutes, then auto OFF.

---

## 🔍 Troubleshooting

### Command Not Received by Device

1. **Check MQTT Status:**
   ```bash
   curl http://localhost:3000/api/device-commands/status
   ```
   Should return `{"connected": true}`

2. **Verify Device is Online:**
   ```bash
   mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/<DEVICE_ID>" -v
   ```
   Should see telemetry data.

3. **Check Device Subscription:**
   Device firmware must subscribe to `sensor/<DEVICE_ID>/command`

4. **Monitor MQTT Traffic:**
   ```bash
   mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/#" -v
   ```

---

### Backend Not Connected to MQTT

1. **Check Environment Variables:**
   ```bash
   cat iot-backend/.env | grep MQTT
   ```

2. **Check MQTT Broker:**
   ```bash
   nc -zv 109.105.194.174 8366
   ```

3. **Check Backend Logs:**
   ```bash
   # In iot-backend directory
   npm run start:dev
   ```
   Look for: `✅ Connected to MQTT broker`

---

### Invalid Parameters Error

**Error:**
```json
{
  "statusCode": 400,
  "message": ["action must be one of the following values: on, off, pulse"],
  "error": "Bad Request"
}
```

**Solution:** Use valid enum values:
- `action`: `on`, `off`, `pulse`
- `target`: `out1`, `out2`

---

## 📚 Related Documentation

- [MQTT Relay Control Specification](../iot-gtw/MQTT-RELAY-CONTROL-SPEC.md)
- [IoT Gateway Documentation](../iot-gtw/README.md)
- [ESP32 Firmware Guide](../iot-device-esp32/README.md)

---

## 🔄 API Versioning

Current version: **v1**

Future endpoints akan menggunakan prefix `/v1/`:
- `/api/v1/device-commands/relay`
- `/api/v1/device-commands/status`

---

## 📊 Performance Considerations

### Request Limits

- **Rate Limit:** None (implement if needed)
- **Timeout:** 4000ms for MQTT publish
- **QoS:** 1 (ensures delivery but no guarantee of execution)

### Scalability

- Single MQTT connection shared across all requests
- Auto-reconnect on disconnection
- Connection pooling handled by `mqtt` package

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0  
**Backend Location:** `iot-backend/src/modules/device-commands/`
