# MQTT Ping/Pong - cek_waktu Topic

## Overview
Fitur ping/pong untuk IoT devices dengan response timestamp server Indonesia (UTC+7).

## Features
- ✅ Subscribe to topic `cek_waktu`
- ✅ Auto-respond dengan server timestamp (Indonesia UTC+7)
- ✅ Support JSON & plain text request
- ✅ Response ke topic `cek_waktu/response`
- ✅ Multiple format timestamp (ISO, Local, Unix)
- ✅ Request tracking & logging

## How It Works

```
IoT Device                    MQTT Server                    Gateway Service
    |                              |                                |
    |------- Publish to ---------->|                                |
    |     'cek_waktu'              |--------- Message ------------>|
    |                              |                                |
    |                              |                                | Process & Get
    |                              |                                | Indonesia Time
    |                              |                                | (UTC+7)
    |                              |<-------- Publish -------------|
    |<------ Subscribe to ---------|        'cek_waktu/response'   |
    |   'cek_waktu/response'       |                                |
    |                              |                                |
```

## Request Format

### Simple Ping (Plain Text)
```bash
mosquitto_pub -h localhost -t "cek_waktu" -m "ping"
```

### JSON Request
```bash
mosquitto_pub -h localhost -t "cek_waktu" -m '{"device_id": "ESP32-001", "action": "time_sync"}'
```

### Empty Request
```bash
mosquitto_pub -h localhost -t "cek_waktu" -m ""
```

## Response Format

```json
{
  "status": "ok",
  "message": "Server time response",
  "server_time": {
    "iso": "2024-11-21T14:30:45.123Z",
    "local": "21/11/2024, 21:30:45",
    "timezone": "Asia/Jakarta (UTC+7)",
    "unix": 1700581845
  },
  "request": {
    "device_id": "ESP32-001",
    "action": "time_sync"
  },
  "received_at": "2024-11-21T14:30:45.120Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Status response: `ok` atau `error` |
| `message` | string | Deskripsi response |
| `server_time.iso` | string | ISO 8601 format (UTC+7) |
| `server_time.local` | string | Format lokal Indonesia |
| `server_time.timezone` | string | Timezone info |
| `server_time.unix` | number | Unix timestamp (seconds) |
| `request` | object | Echo dari request yang dikirim |
| `received_at` | string | Timestamp saat request diterima (UTC) |

## Subscribe to Response

### Using mosquitto_sub
```bash
# Subscribe dan tunggu response
mosquitto_sub -h localhost -t "cek_waktu/response" -v
```

### Full Test Flow
```bash
# Terminal 1: Subscribe to response
mosquitto_sub -h localhost -t "cek_waktu/response" -v

# Terminal 2: Send request
mosquitto_pub -h localhost -t "cek_waktu" -m '{"device":"ESP32-001"}'

# Terminal 1 akan menerima response
```

## Use Cases

### 1. Time Synchronization
IoT device sync waktu dengan server:
```json
// Request
{
  "device_id": "ESP32-001",
  "action": "time_sync",
  "current_time": "2024-11-21T10:00:00Z"
}

// Response
{
  "status": "ok",
  "server_time": {
    "unix": 1700581845,
    "iso": "2024-11-21T21:30:45.123+07:00"
  }
}
```

### 2. Connection Check (Ping)
Device check koneksi masih alive:
```bash
# Simple ping
mosquitto_pub -t "cek_waktu" -m "ping"

# Response menandakan server online
```

### 3. Latency Measurement
Measure round-trip time:
```json
{
  "device_id": "ESP32-001",
  "sent_at": 1700581840,
  "action": "latency_check"
}
```

## Arduino/ESP32 Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  // Check if response topic
  if (strcmp(topic, "cek_waktu/response") == 0) {
    
    // Parse JSON response
    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload, length);
    
    // Extract server time
    long serverUnixTime = doc["server_time"]["unix"];
    const char* localTime = doc["server_time"]["local"];
    
    Serial.print("Server Time (Unix): ");
    Serial.println(serverUnixTime);
    Serial.print("Server Time (Local): ");
    Serial.println(localTime);
    
    // Sync local RTC if needed
    // setTime(serverUnixTime);
  }
}

void requestServerTime() {
  StaticJsonDocument<128> doc;
  doc["device_id"] = "ESP32-001";
  doc["action"] = "time_sync";
  
  char buffer[128];
  serializeJson(doc, buffer);
  
  client.publish("cek_waktu", buffer);
  Serial.println("Time sync request sent");
}

void setup() {
  Serial.begin(115200);
  
  // Connect WiFi & MQTT
  // ... (WiFi & MQTT connection code)
  
  client.setCallback(callback);
  client.subscribe("cek_waktu/response");
  
  // Request time every 1 hour
  requestServerTime();
}

void loop() {
  client.loop();
  
  // Auto request every hour
  static unsigned long lastRequest = 0;
  if (millis() - lastRequest > 3600000) { // 1 hour
    requestServerTime();
    lastRequest = millis();
  }
}
```

## Python Client Example

```python
import paho.mqtt.client as mqtt
import json
import time

def on_message(client, userdata, msg):
    if msg.topic == "cek_waktu/response":
        response = json.loads(msg.payload.decode())
        print(f"✅ Server Response:")
        print(f"   Status: {response['status']}")
        print(f"   Server Time (Local): {response['server_time']['local']}")
        print(f"   Server Time (Unix): {response['server_time']['unix']}")
        print(f"   Timezone: {response['server_time']['timezone']}")

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    # Subscribe to response topic
    client.subscribe("cek_waktu/response")
    
    # Send ping request
    request = {
        "device_id": "PYTHON-CLIENT-001",
        "action": "time_sync"
    }
    client.publish("cek_waktu", json.dumps(request))
    print("📤 Time sync request sent")

# Setup MQTT client
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Connect to broker
client.connect("localhost", 1883, 60)

# Start loop
client.loop_forever()
```

## Node.js Client Example

```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  // Subscribe to response
  client.subscribe('cek_waktu/response', (err) => {
    if (!err) {
      console.log('📡 Subscribed to cek_waktu/response');
      
      // Send request
      const request = {
        device_id: 'NODEJS-CLIENT-001',
        action: 'time_sync',
        sent_at: Date.now()
      };
      
      client.publish('cek_waktu', JSON.stringify(request));
      console.log('📤 Time sync request sent');
    }
  });
});

client.on('message', (topic, message) => {
  if (topic === 'cek_waktu/response') {
    const response = JSON.parse(message.toString());
    
    console.log('📥 Server Response:');
    console.log('   Status:', response.status);
    console.log('   Server Time (Local):', response.server_time.local);
    console.log('   Server Time (Unix):', response.server_time.unix);
    console.log('   Timezone:', response.server_time.timezone);
    
    // Calculate latency
    if (response.request.sent_at) {
      const latency = Date.now() - response.request.sent_at;
      console.log('   Latency:', latency, 'ms');
    }
  }
});
```

## Testing

### Test Script
Saya sudah buat test script di `iot-gtw/test-cek-waktu.sh`

```bash
cd iot-gtw
chmod +x test-cek-waktu.sh
./test-cek-waktu.sh
```

### Manual Testing

#### 1. Start Gateway Service
```bash
cd iot-gtw
npm run start:dev
```

#### 2. Subscribe to Response (Terminal 1)
```bash
mosquitto_sub -h localhost -t "cek_waktu/response" -v
```

#### 3. Send Request (Terminal 2)
```bash
# Test 1: Plain text
mosquitto_pub -h localhost -t "cek_waktu" -m "ping"

# Test 2: JSON request
mosquitto_pub -h localhost -t "cek_waktu" -m '{"device":"ESP32-001","action":"sync"}'

# Test 3: Empty message
mosquitto_pub -h localhost -t "cek_waktu" -m ""
```

#### 4. Check Response (Terminal 1)
```
cek_waktu/response {
  "status": "ok",
  "server_time": {
    "local": "21/11/2024, 21:30:45",
    "unix": 1700581845
  },
  ...
}
```

## Logs

Gateway service akan log setiap request:

```
[MqttService] 📨 Received MQTT message from topic 'cek_waktu': ping
[MqttService] ⏰ PING/PONG: Responded to 'cek_waktu' request
[MqttService]    📅 Server Time (Indonesia): 21/11/2024, 21:30:45
[MqttService]    📤 Response published to: cek_waktu/response
```

## Benefits

1. **Time Synchronization**: IoT devices bisa sync waktu dengan server
2. **Connection Check**: Devices bisa check apakah masih terhubung
3. **Latency Measurement**: Bisa measure round-trip time
4. **Standard Timezone**: Semua devices punya referensi waktu yang sama (Indonesia UTC+7)
5. **No Database Pollution**: Request cek_waktu tidak disimpan ke database

## Notes

- ⚠️ Request ke `cek_waktu` **TIDAK** disimpan ke database
- ✅ Response selalu ke topic `cek_waktu/response`
- ⏰ Timezone fixed ke Asia/Jakarta (UTC+7)
- 📦 Support both JSON & plain text request
- 🔄 Auto-subscribe saat service start

## Troubleshooting

### Issue: Tidak dapat response
**Solution**: 
```bash
# Check apakah subscribe ke topic yang benar
mosquitto_sub -h localhost -t "cek_waktu/response" -v

# Check broker running
mosquitto -v
```

### Issue: Response delay
**Solution**: Check network latency dan broker load

### Issue: Wrong timezone
**Solution**: Server timezone fixed ke UTC+7, pastikan calculation benar

---

**Created**: 2024-11-21  
**Feature**: MQTT Ping/Pong Time Sync  
**Status**: ✅ Implemented
