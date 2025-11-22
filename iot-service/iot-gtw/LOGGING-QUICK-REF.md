# Logging Quick Reference

## 🎯 Current Logging Mode: **MINIMAL** (Production-Ready)

---

## Toggle Logging Modes

### 1. **Minimal Mode (Current)** - Production ✅
```bash
# .env
DB_LOGGING=false  # or just remove this line
```

**Output:**
```
[Nest] LOG [MqttService] ✅ Saved [telemetry] DEMO1-00D42390A994 → 18e4807c...
```

---

### 2. **Debug Mode** - When troubleshooting
```bash
# .env
DB_LOGGING=true
```

**Output:**
```
query: START TRANSACTION
query: INSERT INTO "iot_log"...
query: COMMIT
[Nest] LOG [MqttService] ✅ Saved [telemetry] DEMO1-00D42390A994 → 18e4807c...
```

---

### 3. **Full Verbose Mode** - Deep debugging (manual code change needed)

Uncomment verbose logs in `mqtt.service.ts`:

```typescript
// In handleMessage() method:
this.logger.log(`📨 Received from '${topic}': ${messageStr}`);
this.logger.log(`🏷️  Label: ${label}`);
this.logger.log(`🔌 Device: ${deviceId || 'none'}`);
```

---

## What Gets Logged (Current Setup)

### ✅ Always Logged:
- MQTT connection events (connect, disconnect, error)
- Message received summary (1 line per message)
- Telemetry processing results
- Errors and warnings
- Scheduler activities

### ❌ NOT Logged (to reduce noise):
- Raw MQTT payload
- Step-by-step parsing
- Database query details (unless DB_LOGGING=true)
- Internal service operations

---

## Quick Checks

### Check if messages are being received:
```bash
tail -f logs/app.log | grep "Saved"
```

### Check for errors:
```bash
tail -f logs/app.log | grep "ERROR"
```

### Check scheduler activity:
```bash
tail -f logs/app.log | grep "TelemetrySchedulerService"
```

### Check database queries (if DB_LOGGING=true):
```bash
tail -f logs/app.log | grep "query:"
```

---

## Log Format Reference

### MQTT Message Received:
```
✅ Saved [label] deviceId → logId
```
Example:
```
✅ Saved [telemetry] DEMO1-00D42390A994 → 18e4807c-4238-4a07-9f71-e25ea0209cb2
```

### Telemetry Processing:
```
Starting scheduled telemetry processing...
Found X unprocessed telemetry logs
Scheduled processing completed: X success, Y failed, Zms
```

### Errors:
```
❌ Failed to handle MQTT message from topic 'xxx': error message
❌ Failed to create IoT log: error message
```

---

## Restart Required After Changes

```bash
# Stop current service (Ctrl+C if running in terminal)
# Then restart:
npm run start:dev
```

---

## Files That Control Logging

1. **`src/config/database.config.ts`** - TypeORM query logging
2. **`src/modules/mqtt/mqtt.service.ts`** - MQTT message logging
3. **`src/modules/iot-log/iot-log.service.ts`** - IoT log service logging
4. **`.env`** - Environment variables (DB_LOGGING)

---

## Troubleshooting

### Problem: Too much noise
**Solution:** Make sure `DB_LOGGING` is not set to `true` in `.env`

### Problem: Not seeing any messages
**Solution:** Enable verbose mode temporarily to debug

### Problem: Need to see SQL queries
**Solution:** Set `DB_LOGGING=true` in `.env` and restart

---

**Last Updated:** Nov 22, 2025 @ 12:50 PM
