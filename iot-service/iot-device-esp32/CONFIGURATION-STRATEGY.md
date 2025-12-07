# ⚙️ CONFIGURATION STRATEGY

## 🎯 KEY PRINCIPLES

### 1. **DYNAMIC Configuration (Not Hardcoded)**
All timing parameters can be changed via SD card `config.json` without reflashing firmware.

### 2. **ONE-by-ONE Data Sync (Not Batch)**
Always send data one file at a time to prevent network flooding and ensure reliability.

---

## 📊 CONFIGURABLE PARAMETERS

### **Sensor Reading Interval**

```json
// In config.json on SD card
{
  "telemetry": {
    "interval_ms": 30000,  // CONFIGURABLE: 10000-300000 (10s - 5min)
    "comment": "How often to read sensors"
  }
}
```

**Use Cases:**
```
High-frequency monitoring:  interval_ms: 10000  (10 seconds)
Standard monitoring:        interval_ms: 30000  (30 seconds) ← DEFAULT
Low-power mode:             interval_ms: 60000  (1 minute)
Battery saving:             interval_ms: 300000 (5 minutes)
```

**Runtime Behavior:**
```cpp
// In main.cpp
static unsigned long telemetryInterval = TELEMETRY_INTERVAL_MS; // Default from config.h

void loop() {
    // Service 1: Sensor Reading (DYNAMIC interval)
    if (now - lastSensorRead >= telemetryInterval) {
        readSensors();
        saveToSD();
        lastSensorRead = now;
    }
}

// Can be updated at runtime via MQTT or SD config reload
void updateTelemetryInterval(uint32_t newInterval) {
    if (newInterval >= 10000 && newInterval <= 300000) {
        telemetryInterval = newInterval;
        Serial.printf("[CONFIG] Telemetry interval updated: %d ms\n", newInterval);
    }
}
```

---

## 📤 DATA SYNC: ONE-by-ONE (NEVER BATCH)

### **Strategy: Sequential Send with Rate Limiting**

```
┌─────────────────────────────────────────────────┐
│ SYNC BEHAVIOR: ONE FILE AT A TIME               │
├─────────────────────────────────────────────────┤
│                                                 │
│  t=0s:   Check SD → 100 files pending           │
│          Send file 1 → Wait 10s                 │
│                                                 │
│  t=10s:  Send file 2 → Wait 10s                 │
│  t=20s:  Send file 3 → Wait 10s                 │
│  ...                                            │
│  t=90s:  Send file 10 → Burst limit reached     │
│                                                 │
│  t=90s:  PAUSE 30 seconds (prevent overload)    │
│                                                 │
│  t=120s: Resume → Send file 11 → Wait 10s       │
│  t=130s: Send file 12 → Wait 10s                │
│  ...                                            │
│                                                 │
│  Continue until:                                │
│  ✅ All files sent                              │
│  ❌ Connection lost (resume later)              │
│  ❌ SD card error                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Implementation:**

```cpp
// Service 3: Data Sync (in main.cpp)
void loop() {
    static unsigned long lastSync = 0;
    static int burstCount = 0;
    static bool pausingAfterBurst = false;
    static unsigned long pauseStartTime = 0;
    
    unsigned long now = millis();
    
    // Check if in pause mode (after burst)
    if (pausingAfterBurst) {
        if (now - pauseStartTime >= SYNC_PAUSE_AFTER_BURST_MS) {
            pausingAfterBurst = false;
            burstCount = 0;
            Serial.println("[SYNC] Pause ended, resuming sync");
        } else {
            return; // Still pausing
        }
    }
    
    // Sync timer (10 seconds between sends)
    if (connectionManager.isFullyConnected() && 
        now - lastSync >= SYNC_RATE_LIMIT_MS) {
        
        // Check if SD has pending data
        if (sdManager.hasPendingData()) {
            
            // Get oldest file (FIFO - oldest first)
            String oldestFile = sdManager.getOldestFile();
            
            if (!oldestFile.isEmpty()) {
                // Read file content
                String jsonData = sdManager.readFile(oldestFile);
                
                // Send ONE file only
                bool sendSuccess = mqtt.publish(MQTT_TOPIC, jsonData);
                
                if (sendSuccess) {
                    // Delete after successful send
                    sdManager.deleteFile(oldestFile);
                    burstCount++;
                    
                    Serial.printf("[SYNC] Sent & deleted: %s (%d/%d)\n", 
                                  oldestFile.c_str(), burstCount, SYNC_MAX_BURST);
                    
                    // Check burst limit (10 messages)
                    if (burstCount >= SYNC_MAX_BURST) {
                        pausingAfterBurst = true;
                        pauseStartTime = now;
                        Serial.println("[SYNC] Burst limit reached, pausing 30s");
                    }
                } else {
                    // Send failed - keep file, stop syncing
                    Serial.printf("[SYNC] Send failed: %s (keeping file)\n", 
                                  oldestFile.c_str());
                    // Don't increment burstCount
                    // Connection might be unstable, stop syncing
                }
            }
        }
        
        lastSync = now;
    }
}
```

---

## 🎛️ WHY ONE-by-ONE? (Not Batch)

### **❌ BATCH APPROACH (BAD):**
```cpp
// DON'T DO THIS!
void syncAllFiles() {
    List<String> files = sdManager.getAllFiles();
    for (String file : files) {
        mqtt.publish(file); // Flood the network! ❌
    }
}

// Problems:
// 1. Network flooding (broker overload)
// 2. No rate limiting
// 3. Packet loss at high rate
// 4. MQTT broker disconnect
// 5. No recovery on failure
```

### **✅ ONE-by-ONE APPROACH (GOOD):**
```cpp
// CORRECT APPROACH
void syncOneFile() {
    String oldest = sdManager.getOldestFile();
    if (mqtt.publish(oldest)) {
        sdManager.deleteFile(oldest); // Success
    } else {
        // Keep file, try next time
    }
}

// Benefits:
// 1. ✅ Network friendly (no flooding)
// 2. ✅ Rate limited (10s per message)
// 3. ✅ Reliable delivery (QoS 1)
// 4. ✅ Automatic retry (file kept on failure)
// 5. ✅ Burst control (pause after 10 msgs)
```

---

## 📈 SYNC PERFORMANCE ESTIMATES

### **Scenario: 100 Files Pending**

```
Sync Rate:  1 file / 10 seconds
Burst:      10 files / burst
Pause:      30 seconds after burst

Timeline:
─────────────────────────────────────────────────
Burst 1:  t=0-90s     → 10 files sent
Pause:    t=90-120s   → Wait 30s
Burst 2:  t=120-210s  → 10 files sent
Pause:    t=210-240s  → Wait 30s
Burst 3:  t=240-330s  → 10 files sent
...
Burst 10: t=1050-1140s → 10 files sent

Total time: ~19 minutes for 100 files
Rate:       ~5.3 files/minute (including pauses)
```

### **Is This Fast Enough?**

**Normal Operation (Connected):**
- Sensor reads every 30s
- Data sent immediately (real-time)
- SD only used as backup (empty)
- ✅ **No sync needed**

**After Outage (Offline → Connected):**
- 1 hour offline = 120 files pending (30s interval)
- Sync time: ~23 minutes
- ✅ **Acceptable** - data will arrive within 30 min

**Long Outage:**
- 24 hours offline = 2,880 files pending
- Sync time: ~9 hours
- ✅ **OK** - historical data, not real-time

---

## 🔧 CONFIGURABLE SYNC PARAMETERS

```json
// config.json on SD card
{
  "sync": {
    "enabled": true,
    "rate_limit_ms": 10000,        // CONFIGURABLE: 1000-60000 (1s-1min)
    "max_burst": 10,                // CONFIGURABLE: 1-100
    "pause_after_burst_ms": 30000,  // CONFIGURABLE: 10000-120000 (10s-2min)
    "priority": "oldest_first",     // "oldest_first" or "newest_first"
    "delete_after_send": true,      // true = delete, false = archive
    "comment": "ONE-by-ONE sync strategy with rate limiting"
  }
}
```

### **Tuning Options:**

| Use Case | rate_limit_ms | max_burst | pause_ms | Result |
|----------|---------------|-----------|----------|--------|
| **Slow/Stable** | 10000 (10s) | 10 | 30000 (30s) | ~5 files/min ← DEFAULT |
| **Fast Sync** | 5000 (5s) | 20 | 15000 (15s) | ~10 files/min |
| **Conservative** | 15000 (15s) | 5 | 60000 (1min) | ~3 files/min |
| **Aggressive** | 1000 (1s) | 50 | 10000 (10s) | ~45 files/min ⚠️ |

**Recommendation:** Keep default (10s, burst 10) for best reliability.

---

## 🎯 SUMMARY

### **1. Sensor Interval: CONFIGURABLE ✅**
```
Default: 30s
Range:   10s - 5min
Source:  config.json on SD card
Runtime: Can be updated via MQTT command
```

### **2. Data Sync: ONE-by-ONE ✅**
```
Strategy:  Sequential send (FIFO)
Rate:      1 file / 10 seconds
Burst:     Max 10 files, then pause 30s
Reliable:  QoS 1, delete after success
Friendly:  No network flooding
```

### **3. Benefits ✅**
```
✅ Flexible configuration (no reflash needed)
✅ Network-friendly sync (no overload)
✅ Reliable delivery (retry on failure)
✅ Automatic recovery (oldest first)
✅ Configurable for different use cases
```

---

## 🚀 NEXT IMPLEMENTATION

Now that strategy is clear, we can implement:

1. **SD Manager** - File operations (read, write, scan, delete)
2. **Config Manager** - Load/save config.json from SD
3. **Sync Service** - ONE-by-ONE sync with rate limiting
4. **Main Loop** - 3 independent services with configurable timers

**Ready to code? 💪**
