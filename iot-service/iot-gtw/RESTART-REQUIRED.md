# 🔥 QUICK FIX - Multiple Topics

## ❌ Masalah Baru Ditemukan!

Dari log NestJS:
```
📡 MQTT Topic: sensor    ← Masih 'sensor' lama
```

Dari screenshot MQTTX:
```
Topic: device/control    ← Message publish ke sini!
```

**NestJS subscribe ke:** `sensor`  
**Message Anda publish ke:** `device/control`  
**Hasil:** TIDAK MATCH! ❌

## ✅ Solusi

### 1. Update `.env` - Subscribe ke Multiple Topics
```env
MQTT_TOPIC=sensor/#,device/#
```

Sekarang akan subscribe ke:
- `sensor/#` = catch all sensor messages
- `device/#` = catch all device messages

### 2. Update Code - Support Multiple Topics
Modified `mqtt.service.ts` untuk support comma-separated topics.

### 3. RESTART NestJS! ⚠️

**PENTING:** NestJS harus di-restart untuk load config baru!

```bash
# Di terminal NestJS:
Ctrl + C    (stop)
npm run start:dev    (start ulang)
```

**Check logs harus ada:**
```
[Nest] LOG [MqttService] 🔍 DEBUG: Attempting to subscribe to 2 topic(s): sensor/#, device/#
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'sensor/#'
[Nest] LOG [MqttService] 📡 Now listening for messages on topic: 'sensor/#'
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'device/#'
[Nest] LOG [MqttService] 📡 Now listening for messages on topic: 'device/#'
```

## 🚀 Testing

### Step 1: Restart NestJS (WAJIB!)
```bash
# Stop: Ctrl+C
# Start:
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
npm run start:dev
```

### Step 2: Publish Test Messages
```bash
# New terminal:
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
node quick-test.js
```

Ini akan publish 3 messages:
1. ✅ Topic `sensor` - sensor data
2. ✅ Topic `sensor/test` - test message
3. ✅ Topic `device/control` - control command

### Step 3: Check NestJS Logs

Harus muncul **3x** log seperti ini:

```
[Nest] LOG [MqttService] 🔔 RAW MQTT MESSAGE RECEIVED!
[Nest] LOG [MqttService]    📍 Topic: sensor
[Nest] LOG [MqttService]    📦 Message (raw): {"deviceId":"SENSOR-001"...}
...
[Nest] LOG [IotLogService] ✅ IoT log created successfully: <uuid>

[Nest] LOG [MqttService] 🔔 RAW MQTT MESSAGE RECEIVED!
[Nest] LOG [MqttService]    📍 Topic: sensor/test
...

[Nest] LOG [MqttService] 🔔 RAW MQTT MESSAGE RECEIVED!
[Nest] LOG [MqttService]    📍 Topic: device/control
...
```

### Step 4: Check Database
```bash
node check-iot-logs.js
```

Should show 3 new logs!

## 📋 Checklist

- [ ] ✅ Update `.env` (sudah done)
- [ ] ✅ Update `mqtt.service.ts` (sudah done)
- [ ] ⚠️  **RESTART NestJS** ← LAKUKAN INI!
- [ ] Check logs: "subscribe to 2 topic(s)"
- [ ] Run: `node quick-test.js`
- [ ] See 3x 🔔 emoji in NestJS logs
- [ ] Run: `node check-iot-logs.js`
- [ ] See 3 new entries in database

## 💡 Testing dari MQTTX

Setelah restart NestJS, publish dari MQTTX ke topic:
- ✅ `sensor` - akan masuk
- ✅ `sensor/hello` - akan masuk
- ✅ `sensor/test` - akan masuk
- ✅ `device/control` - akan masuk
- ✅ `device/status` - akan masuk

## ⚠️ CRITICAL: Must Restart NestJS!

Config `.env` hanya dibaca saat startup!  
Jika tidak restart, masih pakai config lama: `sensor` (bukan `sensor/#,device/#`)

---

**Status:** ✅ Code fixed, ⚠️ **NEED RESTART**
