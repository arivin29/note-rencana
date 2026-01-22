# 🎯 NESTJS MQTT SUBSCRIBE & SAVE TO DATABASE - Complete Guide

## ✅ Status Saat Ini

- ✅ Config `.env` updated: `MQTT_TOPIC=sensor/#,device/#`
- ✅ Code `mqtt.service.ts` updated untuk multiple topics
- ✅ Enhanced logging sudah diimplementasi
- ✅ Publish test berhasil
- ⚠️  **Need to verify:** NestJS sudah restart dan subscribe ke topic yang benar

---

## 🔍 Step 1: Verify NestJS Configuration

### Check NestJS Startup Logs

**Di terminal NestJS, cari log ini:**

```
[Nest] LOG [MqttService] Connecting to MQTT broker: mqtt://109.105.194.174:8366
[Nest] LOG [MqttService] ✅ Connected to MQTT broker
[Nest] LOG [MqttService] 🔍 DEBUG: Attempting to subscribe to 2 topic(s): sensor/#, device/#
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'sensor/#'
[Nest] LOG [MqttService] 📡 Now listening for messages on topic: 'sensor/#'
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'device/#'
[Nest] LOG [MqttService] 📡 Now listening for messages on topic: 'device/#'
```

**✅ GOOD:** Jika ada log "2 topic(s): sensor/#, device/#"  
**❌ BAD:** Jika masih "1 topic(s): sensor" atau hanya "sensor" (tanpa `/#`)

### If Still Wrong Config:

1. **Stop NestJS:** `Ctrl + C`
2. **Verify .env file:**
   ```bash
   cat .env | grep MQTT_TOPIC
   # Should output: MQTT_TOPIC=sensor/#,device/#
   ```
3. **Clear cache (if needed):**
   ```bash
   rm -rf dist/
   ```
4. **Start again:**
   ```bash
   npm run start:dev
   ```

---

## 🚀 Step 2: Test MQTT Subscribe & Save

### Option A: Test dengan `quick-test.js`

```bash
# Terminal baru (jangan di terminal NestJS)
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node quick-test.js
```

**Expected Output:**
```
🚀 Quick MQTT Test Publisher
📡 Broker: mqtt://109.105.194.174:8366

✅ Connected to MQTT broker

📤 Test 1: Publishing to topic "sensor"
   Payload: {"deviceId":"SENSOR-001","temperature":25.5,...}
✅ Published to "sensor"

📤 Test 2: Publishing to topic "sensor/test"
✅ Published to "sensor/test"

📤 Test 3: Publishing to topic "device/control"
   Payload: {"cmd":"restart","id":"NODE001"}
✅ Published to "device/control"

✅ All tests completed!
```

### Option B: Test dari MQTTX (GUI)

1. Open MQTTX
2. Connect to: `iot@109.105.194.174...`
3. Publish ke topic `sensor` atau `device/control` dengan payload:
   ```json
   {
     "deviceId": "TEST-123",
     "temperature": 25.5,
     "humidity": 60
   }
   ```

---

## 📋 Step 3: Monitor NestJS Logs

**Setelah publish, di terminal NestJS harus muncul:**

### ✅ COMPLETE SUCCESS LOG:

```
[Nest] LOG [MqttService] 🔔 RAW MQTT MESSAGE RECEIVED!
[Nest] LOG [MqttService]    📍 Topic: sensor
[Nest] LOG [MqttService]    📦 Message (raw): {"deviceId":"SENSOR-001","temperature":25.5,"humidity":60.2,"timestamp":"2025-11-20T12:45:00.000Z"}
[Nest] LOG [MqttService]    📏 Length: 105 bytes
[Nest] LOG [MqttService]    ⏰ Timestamp: 2025-11-20T12:45:30.123Z
[Nest] LOG [MqttService] 📨 Received MQTT message from topic 'sensor': {"deviceId":"SENSOR-001"...
[Nest] LOG [MqttService] 📦 Parsed as JSON: {"deviceId":"SENSOR-001","temperature":25.5,...}
[Nest] LOG [MqttService] 🏷️  Detected label: TELEMETRY
[Nest] LOG [MqttService] 🔌 Detected device ID: SENSOR-001
[Nest] LOG [MqttService] 💾 Saving to database...
[Nest] LOG [IotLogService] 🔵 Creating IoT log entry...
[Nest] LOG [IotLogService]    Label: TELEMETRY
[Nest] LOG [IotLogService]    Topic: sensor
[Nest] LOG [IotLogService]    Device ID: SENSOR-001
[Nest] LOG [IotLogService]    Payload: {"deviceId":"SENSOR-001","temperature":25.5,...}
[Nest] LOG [IotLogService] 🔵 Saving to database...
[Nest] LOG [IotLogService] ✅ IoT log created successfully: 550e8400-e29b-41d4-a716-446655450010 [TELEMETRY]
[Nest] LOG [MqttService] ✅ Successfully saved to database with ID: 550e8400-e29b-41d4-a716-446655450010 [TELEMETRY] from topic 'sensor'
```

### Troubleshooting by Log Pattern:

#### ❌ NO LOG AT ALL (no 🔔)
**Problem:** NestJS tidak receive message  
**Cause:** 
- Topic tidak match (check subscription)
- MQTT connection lost
- Published to wrong topic

**Solution:**
```bash
# Check NestJS subscription logs
# Should show: "Subscribed to MQTT topic: 'sensor/#'"

# Test connection
node debug-mqtt-listener.js
# If this also doesn't receive, problem is MQTT broker/network
```

#### ⚠️  LOG 🔔 ADA tapi STOP di tengah
**Problem:** Error during processing  
**Look for:** ERROR log dengan ❌ emoji

**Common errors:**

**A. Database Connection Error:**
```
[Nest] ERROR [IotLogService] ❌ Failed to create IoT log: Connection terminated
```
**Solution:**
```bash
# Check database connection
node check-iot-logs.js

# If connection fails, check .env DB credentials
cat .env | grep DB_
```

**B. Table Not Found Error:**
```
[Nest] ERROR [IotLogService] ❌ Failed to create IoT log: relation "iot_log" does not exist
```
**Solution:**
```bash
# Run migrations
npm run migration:run
```

**C. Column Error:**
```
[Nest] ERROR [IotLogService] ❌ Failed to create IoT log: column "xxx" does not exist
```
**Solution:**
```bash
# Check entity vs database schema
# May need to update entity or run migrations
```

---

## 🗄️ Step 4: Verify Database

### Check Database dengan Script:

```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node check-iot-logs.js
```

**Expected Output:**

```
✅ Connected to database
✅ Table "iot_log" exists

📊 Total logs in database: 15

📈 Logs by label:
   TELEMETRY: 10
   COMMAND: 3
   LOG: 2

📋 Last 5 logs:

1. ID: 550e8400-e29b-41d4-a716-446655450010
   Label: TELEMETRY
   Topic: sensor
   Device ID: SENSOR-001
   Payload: {"deviceId":"SENSOR-001","temperature":25.5,...
   Created: 2025-11-20 12:45:30

2. ID: 550e8400-e29b-41d4-a716-446655450011
   Label: LOG
   Topic: sensor/test
   Device ID: N/A
   Payload: Hello from sensor/test
   Created: 2025-11-20 12:45:31

3. ID: 550e8400-e29b-41d4-a716-446655450012
   Label: COMMAND
   Topic: device/control
   Device ID: NODE001
   Payload: {"cmd":"restart","id":"NODE001"}
   Created: 2025-11-20 12:45:32
```

### Check Database via API:

```bash
# Get statistics
curl http://localhost:5001/api/iot-logs/stats

# Get unprocessed logs
curl http://localhost:5001/api/iot-logs/unprocessed?limit=10

# Get by label
curl http://localhost:5001/api/iot-logs/by-label/TELEMETRY?limit=5

# Get by device ID
curl http://localhost:5001/api/iot-logs/by-device/SENSOR-001
```

---

## 🔄 Complete Flow Diagram

```
1. MQTT Broker (109.105.194.174:8366)
   ↓
   ↓ (publish to topic: sensor, sensor/*, device/*)
   ↓
2. NestJS MqttService (subscribed to: sensor/#, device/#)
   ├─ Event: 'message' triggered
   ├─ Log: 🔔 RAW MQTT MESSAGE RECEIVED!
   ↓
3. handleMessage() method
   ├─ Parse payload (JSON or raw text)
   ├─ Log: 📦 Parsed as JSON
   ↓
4. IotLogService.detectLabel()
   ├─ Auto-detect label from payload
   ├─ Log: 🏷️ Detected label: TELEMETRY
   ↓
5. IotLogService.extractDeviceId()
   ├─ Extract deviceId from payload
   ├─ Log: 🔌 Detected device ID: SENSOR-001
   ↓
6. IotLogService.create()
   ├─ Create entity
   ├─ Log: 🔵 Creating IoT log entry...
   ├─ Save to PostgreSQL
   ├─ Log: 🔵 Saving to database...
   ↓
7. Database (iot_log table)
   ├─ Log: ✅ IoT log created successfully
   └─ Return saved entity with UUID
```

---

## 🎯 Label Auto-Detection Rules

Service akan auto-detect label berdasarkan payload content:

```typescript
// TELEMETRY - Sensor readings
{
  "temperature": 25.5,
  "humidity": 60,
  "value": 123
}
→ Label: TELEMETRY

// COMMAND - Control commands
{
  "cmd": "restart",
  "command": "turn_on",
  "action": "reboot"
}
→ Label: COMMAND

// ERROR - Error messages
{
  "error": "Connection failed",
  "status": "error"
}
→ Label: ERROR

// PAIRING - Device pairing
{
  "action": "pair",
  "type": "pairing"
}
→ Label: PAIRING

// Default
{
  "anything": "else"
}
→ Label: LOG
```

---

## 🔧 Common Issues & Solutions

### Issue 1: No 🔔 log appears

**Diagnosis:**
```bash
# Check NestJS subscription
# Look for: "Subscribed to MQTT topic: 'sensor/#'"
# in startup logs

# Test with debug listener
node debug-mqtt-listener.js
# Then publish in another terminal
node quick-test.js
```

**If debug listener ALSO doesn't receive:**
- MQTT broker issue
- Network/firewall issue
- Topic mismatch

**If debug listener receives but NestJS doesn't:**
- NestJS not restarted after config change
- Check subscription topic in NestJS logs

### Issue 2: 🔔 appears but no ✅

**Diagnosis:**
```bash
# Look for ERROR log in NestJS terminal
# Will show: ❌ Failed to create IoT log: <error message>
```

**Common causes:**
1. **Database not connected** → Check DB credentials
2. **Table not exists** → Run `npm run migration:run`
3. **Schema mismatch** → Check entity vs database

### Issue 3: ✅ appears but no data in database

**Diagnosis:**
```bash
node check-iot-logs.js
```

**Check:**
1. Connected to correct database?
2. Checking correct table? (should be `iot_log`)
3. Time filter? (script shows all data)

---

## 📝 Testing Checklist

### Pre-flight:
- [ ] NestJS running (`npm run start:dev`)
- [ ] Check startup log: "Subscribed to MQTT topic: 'sensor/#'" ✅
- [ ] Check startup log: "Subscribed to MQTT topic: 'device/#'" ✅
- [ ] Database accessible (test with `node check-iot-logs.js`)
- [ ] Table `iot_log` exists

### Test Flow:
- [ ] Publish message: `node quick-test.js`
- [ ] See 🔔 emoji in NestJS log (3x for 3 messages)
- [ ] See 📦 Parsed as JSON
- [ ] See 🏷️ Detected label
- [ ] See 💾 Saving to database
- [ ] See ✅ IoT log created successfully (3x)
- [ ] Run `node check-iot-logs.js`
- [ ] Confirm 3 new logs in database
- [ ] Check via API: `curl http://localhost:5001/api/iot-logs/stats`

---

## 🚀 Quick Test Commands

```bash
# 1. Check if NestJS subscribed correctly
# Look at NestJS terminal startup logs
# Should see: "2 topic(s): sensor/#, device/#"

# 2. Publish test messages
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node quick-test.js

# 3. Watch NestJS logs
# Should see 3x: 🔔 → 📦 → 🏷️ → 💾 → ✅

# 4. Check database
node check-iot-logs.js

# 5. Check via API
curl http://localhost:5001/api/iot-logs/stats
```

---

## 📊 Expected Results

**After running `node quick-test.js`:**

1. **NestJS terminal:** 3 complete log sequences with ✅
2. **Database:** 3 new entries
3. **API stats:** Total count increased by 3

**If you see all 3:** ✅ **WORKING PERFECTLY!**

---

**Next:** Run `node quick-test.js` dan screenshot NestJS logs untuk saya lihat! 🚀
