# MQTT Auto-Reconnect Implementation

**Date:** November 23, 2025  
**Status:** ✅ Complete  
**Module:** iot-backend

---

## 📋 Overview

Enhanced MQTT service with robust auto-reconnect mechanism to ensure continuous connectivity even when broker becomes unavailable.

---

## ✅ Features Implemented

### 1. Auto-Reconnect
```typescript
reconnectPeriod: 5000  // Retry every 5 seconds
maxReconnectAttempts: 50  // Up to 50 attempts (4+ minutes)
```

### 2. Connection Events
- ✅ `connect` - Connection established
- ✅ `disconnect` - Connection lost
- ✅ `offline` - Client went offline
- ✅ `reconnect` - Reconnection attempt
- ✅ `close` - Connection closed
- ✅ `error` - Connection error

### 3. Status Tracking
```typescript
{
  connected: boolean,
  reconnectAttempts: number,
  maxReconnectAttempts: number,
  autoReconnect: boolean
}
```

### 4. Graceful Startup
- Initial connection timeout: 10 seconds
- Don't block startup if broker unavailable
- Continue trying in background

---

## 🔄 Auto-Reconnect Behavior

### Scenario 1: Broker Goes Down
```
1. ✅ Connected to MQTT broker
2. ⚠️  Broker becomes unavailable
3. 📴 MQTT client is offline - will auto-reconnect...
4. 🔄 Reconnecting to MQTT broker... (attempt 1/50)
5. 🔄 Reconnecting to MQTT broker... (attempt 2/50)
6. ... every 5 seconds ...
7. ✅ Connected to MQTT broker (when broker returns)
```

### Scenario 2: Network Interruption
```
1. ✅ Connected
2. 🔌 MQTT connection closed
3. 🔄 Auto-reconnect starts immediately
4. ✅ Connected within seconds
5. 🔄 Auto-reconnect enabled (every 5s if disconnected)
```

### Scenario 3: Max Attempts Reached
```
1. 🔄 Reconnecting... (attempt 48/50)
2. 🔄 Reconnecting... (attempt 49/50)
3. 🔄 Reconnecting... (attempt 50/50)
4. ❌ Max reconnect attempts (50) reached. Stopping reconnection.
5. Manual intervention required: Call forceReconnect()
```

---

## 📊 Configuration

### Connection Options
```typescript
{
  clientId: 'iot-backend-{random}',  // Unique client ID
  clean: true,                       // Clean session on connect
  connectTimeout: 4000,              // 4 second connection timeout
  reconnectPeriod: 5000,             // Retry every 5 seconds
  keepalive: 60,                     // Ping every 60 seconds
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
}
```

### Environment Variables
```bash
MQTT_BROKER_URL=mqtt://109.105.194.174:8366
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

---

## 🛠️ Methods

### Check Connection
```typescript
// Simple check
const isConnected = mqttService.isClientConnected();

// Detailed status
const status = mqttService.getConnectionStatus();
console.log(status);
// {
//   connected: true,
//   reconnectAttempts: 0,
//   maxReconnectAttempts: 50,
//   autoReconnect: true
// }
```

### Force Reconnect
```typescript
// If auto-reconnect stopped after max attempts
await mqttService.forceReconnect();
```

### Publish with Error Handling
```typescript
try {
  await mqttService.publish('sensor/device123/command', {
    action: 'relay',
    state: 'on'
  });
} catch (error) {
  // Error: MQTT client is not connected. Auto-reconnect is active, please retry in a moment.
  console.error(error.message);
}
```

---

## 📝 Log Examples

### Successful Connection
```
[MqttService] Connecting to MQTT broker: mqtt://109.105.194.174:8366
[MqttService] ✅ Connected to MQTT broker
[MqttService] 🔄 Auto-reconnect enabled (every 5s if disconnected)
```

### Disconnection & Reconnect
```
[MqttService] ⚠️  Disconnected from MQTT broker
[MqttService] 📴 MQTT client is offline - will auto-reconnect...
[MqttService] 🔄 Reconnecting to MQTT broker... (attempt 1/50)
[MqttService] ✅ Connected to MQTT broker
[MqttService] 🔄 Auto-reconnect enabled (every 5s if disconnected)
```

### Publish Success
```
[MqttService] 📤 Published to sensor/DEMO1-00D42390A994/command
[MqttService]    Payload: {"action":"relay","target":"out1","state":"on"}
```

### Publish Failure (Disconnected)
```
[MqttService] ❌ MQTT client is not connected. Auto-reconnect is active, please retry in a moment.
```

---

## 🧪 Testing

### Test 1: Normal Connection
```bash
# Start backend
npm run start:dev

# Check logs
# Should see: ✅ Connected to MQTT broker
```

### Test 2: Broker Down on Startup
```bash
# Stop MQTT broker
# Start backend
npm run start:dev

# Check logs
# Should see: ⚠️  Initial connection timeout - will retry in background
# Backend continues to start
# Auto-reconnect tries every 5 seconds
```

### Test 3: Connection Loss During Runtime
```bash
# Backend running and connected
# Stop MQTT broker

# Check logs
# Should see:
# 📴 MQTT client is offline - will auto-reconnect...
# 🔄 Reconnecting to MQTT broker... (attempt 1/50)

# Start MQTT broker again
# Should see: ✅ Connected to MQTT broker
```

### Test 4: Publish When Disconnected
```bash
# While disconnected, try to send command via API
curl -X POST http://localhost:3000/api/device-commands/relay \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "TEST", "action": "on", "target": "out1"}'

# Response:
# {
#   "error": "MQTT client is not connected. Auto-reconnect is active, please retry in a moment."
# }
```

---

## 🔧 Troubleshooting

### Problem: Connection keeps failing
**Solution:**
```bash
# Check broker is running
telnet 109.105.194.174 8366

# Check credentials
echo "MQTT_USERNAME: $MQTT_USERNAME"
echo "MQTT_PASSWORD: $MQTT_PASSWORD"

# Check logs
tail -f logs/iot-backend.log | grep MQTT
```

### Problem: Max attempts reached
**Solution:**
```typescript
// In backend console or API endpoint
await mqttService.forceReconnect();
```

### Problem: Backend stuck on startup
**Solution:**
- ✅ Already fixed! Backend doesn't block on MQTT connection
- Initial timeout: 10 seconds
- Continues in background if broker unavailable

---

## 📈 Improvements Made

### Before
```typescript
reconnectPeriod: 1000  // Too aggressive
// No max attempts
// No offline event handler
// Blocking startup
// No detailed status
```

### After
```typescript
reconnectPeriod: 5000  // ✅ More reasonable
maxReconnectAttempts: 50  // ✅ Prevents infinite retries
keepalive: 60  // ✅ Connection health check
// ✅ All events handled
// ✅ Non-blocking startup
// ✅ Detailed status tracking
// ✅ Force reconnect method
```

---

## 🎯 Benefits

✅ **Resilient** - Auto-recovers from disconnections  
✅ **Non-blocking** - Doesn't prevent startup  
✅ **Traceable** - Clear logging of all events  
✅ **Configurable** - Easy to adjust timing  
✅ **Safe** - Max attempts prevents infinite loops  
✅ **Manual Override** - Force reconnect when needed  

---

## 🔗 Related Files

- `src/modules/mqtt/mqtt.service.ts` - Main implementation
- `src/modules/mqtt/mqtt.module.ts` - Module definition
- `src/modules/device-commands/device-commands.service.ts` - Usage example
- `.env` - MQTT configuration

---

## ✅ Checklist

- [x] Auto-reconnect enabled (5s interval)
- [x] Max attempts limit (50)
- [x] All connection events handled
- [x] Non-blocking startup
- [x] Connection status tracking
- [x] Force reconnect method
- [x] Graceful error messages
- [x] Comprehensive logging
- [x] Keepalive mechanism
- [x] Documentation created

---

**Status:** ✅ Complete  
**Auto-Reconnect:** ✅ Enabled  
**Retry Interval:** 5 seconds  
**Max Attempts:** 50  

MQTT service now automatically reconnects when disconnected! 🎉
