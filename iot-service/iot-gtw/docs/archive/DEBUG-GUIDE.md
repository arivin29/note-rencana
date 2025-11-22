# 🔍 DEBUG GUIDE - MQTT Message Not Saving to Database

## Step-by-Step Debugging Process

### ✅ STEP 1: Check MQTT Configuration

```bash
node check-mqtt-config.js
```

**What to verify:**
- Broker URL is correct: `mqtt://109.105.194.174:8366`
- Topic is correct: `sensor` (dari screenshot Anda terlihat ada topic `sensor/#`)
- Database credentials are set

**⚠️ IMPORTANT:** Dari screenshot, saya lihat message masuk ke topic:
- `sensor/hello` 
- `device/control`

Jika NestJS subscribe ke `sensor` (tanpa `#`), maka:
- ✅ `sensor` akan match message ke topic `sensor` (exact)
- ❌ `sensor` TIDAK akan match `sensor/hello` atau `sensor/test`
- ✅ `sensor/#` akan match semua: `sensor`, `sensor/hello`, `sensor/test`, dll

**🔧 FIX:** Ubah topic di `.env` menjadi `sensor/#` jika ingin catch semua subtopic!

---

### ✅ STEP 2: Verify NestJS is Running and Connected

Check logs dari NestJS terminal, harus ada:

```
[Nest] LOG [MqttService] Connecting to MQTT broker: mqtt://109.105.194.174:8366
[Nest] LOG [MqttService] ✅ Connected to MQTT broker
[Nest] LOG [MqttService] 🔍 DEBUG: Attempting to subscribe to topic: 'sensor'
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'sensor'
[Nest] LOG [MqttService] 📡 Now listening for messages on topic: 'sensor'
```

**If you see this:** ✅ NestJS is connected and subscribed

**If you DON'T see this:** ❌ Check MQTT credentials or broker is down

---

### ✅ STEP 3: Run Debug MQTT Listener (Parallel Test)

Open **NEW terminal** (jangan di terminal yang run NestJS), run:

```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node debug-mqtt-listener.js
```

**Expected output:**
```
🔍 MQTT Debug Listener
============================================================
📡 Broker: mqtt://109.105.194.174:8366
📨 Topic: sensor
⏰ Started: 2025-11-20T12:30:00.000Z
============================================================

✅ Connected to MQTT broker
✅ Subscribed to topic: 'sensor'

👂 Listening for messages...
------------------------------------------------------------
```

**Leave this running!** This will show you if messages are being received.

---

### ✅ STEP 4: Publish Test Message

Open **ANOTHER new terminal**, run:

```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node test-mqtt-publish.js
```

**Expected behavior:**

**Terminal 1 (NestJS)** should show:
```
[Nest] LOG [MqttService] 🔔 RAW MQTT MESSAGE RECEIVED!
[Nest] LOG [MqttService]    📍 Topic: sensor
[Nest] LOG [MqttService]    📦 Message (raw): {"deviceId":"SENSOR-001","temperature":25.5}
[Nest] LOG [MqttService]    📏 Length: 45 bytes
[Nest] LOG [MqttService]    ⏰ Timestamp: 2025-11-20T12:30:00.000Z
[Nest] LOG [MqttService] 📨 Received MQTT message from topic 'sensor': {"deviceId":"SENSOR-001"...
[Nest] LOG [MqttService] 📦 Parsed as JSON: {"deviceId":"SENSOR-001",...}
[Nest] LOG [MqttService] 🏷️  Detected label: TELEMETRY
[Nest] LOG [MqttService] 🔌 Detected device ID: SENSOR-001
[Nest] LOG [MqttService] 💾 Saving to database...
[Nest] LOG [IotLogService] 🔵 Creating IoT log entry...
[Nest] LOG [IotLogService] ✅ IoT log created successfully: abc-123-uuid [TELEMETRY]
```

**Terminal 2 (Debug Listener)** should show:
```
📬 Message #1 received at 2025-11-20T12:30:00.000Z
   Topic: sensor
   Length: 45 bytes
   Raw: {"deviceId":"SENSOR-001","temperature":25.5}
   Parsed JSON: {
     "deviceId": "SENSOR-001",
     "temperature": 25.5
   }
------------------------------------------------------------
```

**Terminal 3 (Test Publisher)** should show:
```
✅ Connected to MQTT broker
📤 Publishing message 1/3:
   Topic: sensor
   Payload: {"deviceId":"SENSOR-001","temperature":25.5}
✅ Message 1 published successfully
```

---

### ✅ STEP 5: Check Database

```bash
node check-iot-logs.js
```

**Expected output:**
```
✅ Connected to database
✅ Table "iot_log" exists

📊 Total logs in database: 3

📈 Logs by label:
   TELEMETRY: 2
   LOG: 1

📋 Last 5 logs:
1. ID: abc-123-uuid
   Label: TELEMETRY
   Topic: sensor
   Device ID: SENSOR-001
   ...
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "No messages received" in Debug Listener

**Symptoms:**
- Debug listener connects but no messages appear
- NestJS also shows no messages

**Possible Causes:**
1. **Wrong topic** - You're subscribing to `sensor` but messages come to `sensor/hello`
2. **MQTT credentials** - Broker requires authentication
3. **Network/Firewall** - Port 8366 blocked

**Solutions:**

**A. Check topic with wildcard:**
```bash
# Edit .env file
MQTT_TOPIC=sensor/#

# Restart NestJS
```

**B. Test with mosquitto client:**
```bash
# Subscribe to ALL topics to see what's coming
mosquitto_sub -h 109.105.194.174 -p 8366 -t '#' -v

# In another terminal, publish
mosquitto_pub -h 109.105.194.174 -p 8366 -t 'sensor' -m 'test'
```

---

### Issue 2: Messages received but NOT saved to database

**Symptoms:**
- NestJS logs show "🔔 RAW MQTT MESSAGE RECEIVED!"
- But no "✅ IoT log created successfully"
- Or shows error when saving

**Possible Causes:**
1. Database not connected
2. Table `iot_log` doesn't exist
3. Database credentials wrong

**Solutions:**

**A. Check database connection:**
```bash
node check-iot-logs.js
```

If you see error like "ECONNREFUSED", check:
- PostgreSQL is running
- `.env` has correct DB credentials
- Database exists

**B. Run migrations:**
```bash
npm run migration:run
```

**C. Check NestJS logs for database errors:**
Look for:
```
[Nest] ERROR [IotLogService] ❌ Failed to create IoT log: ...
```

---

### Issue 3: Messages only received on certain topics

**From your screenshot, I see:**
- `sensor/hello` - message "hello bro"
- `device/control` - JSON message

**If NestJS subscribes to `sensor` (no wildcard):**
- ❌ Will NOT receive `sensor/hello`
- ❌ Will NOT receive `device/control`
- ✅ Will ONLY receive exact `sensor`

**Solution: Use wildcard subscription**

Edit `.env`:
```env
# To receive ALL sensor/* topics
MQTT_TOPIC=sensor/#

# OR to receive multiple specific patterns
MQTT_TOPIC=sensor/#,device/#
```

**Or in code** (`mqtt.service.ts`), subscribe to multiple topics:
```typescript
private subscribeToTopics(): void {
  const topics = ['sensor/#', 'device/#'];
  
  topics.forEach(topic => {
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      // ...
    });
  });
}
```

---

## 📊 Quick Diagnostic Commands

```bash
# 1. Check configuration
node check-mqtt-config.js

# 2. Listen for ALL messages (debug)
node debug-mqtt-listener.js

# 3. Publish test message
node test-mqtt-publish.js

# 4. Check database
node check-iot-logs.js

# 5. Check NestJS logs (in NestJS terminal)
# Look for the emoji logs: 🔔 📨 💾 ✅
```

---

## 🎯 Expected Flow (When Working)

```
1. MQTT Broker receives message
   ↓
2. NestJS MqttService receives message
   → Log: 🔔 RAW MQTT MESSAGE RECEIVED!
   ↓
3. Parse message
   → Log: 📦 Parsed as JSON
   ↓
4. Detect label
   → Log: 🏷️ Detected label: TELEMETRY
   ↓
5. Extract device ID
   → Log: 🔌 Detected device ID: SENSOR-001
   ↓
6. Save to database
   → Log: 💾 Saving to database...
   → Log: 🔵 Creating IoT log entry...
   ↓
7. Success!
   → Log: ✅ IoT log created successfully: <uuid>
```

**If any step is missing**, that's where the problem is!

---

## 🔥 Quick Fix for Your Issue

Based on your screenshot showing `sensor/hello`, the most likely issue is:

**Your NestJS subscribes to:** `sensor`  
**But messages come to:** `sensor/hello`

**Quick Fix:**

1. Edit `.env`:
```env
MQTT_TOPIC=sensor/#
```

2. Restart NestJS (Ctrl+C then `npm run start:dev`)

3. Publish test:
```bash
node test-mqtt-publish.js
```

4. Check logs - should see 🔔 message

5. Check database:
```bash
node check-iot-logs.js
```

---

**Created:** 2025-11-20  
**Next:** Follow Step 1-5 in order, note where it fails
