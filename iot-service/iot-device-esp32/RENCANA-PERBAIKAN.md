# 🎯 RENCANA PERBAIKAN - Offline Mode & Data Resilience

## 📊 HARDWARE YANG TERSEDIA

```
ESP32S3 Device Capabilities:
├─ ESP32S3 (1U N16R8) - 16MB Flash, 8MB PSRAM
├─ 4G LTE SIM7600CE
├─ RS485 (Multi Sensor, 1km range)
├─ 2x Analog 4-20mA
├─ RTC DS3231M (Industrial Grade)
├─ 4x Digital Input (0-24V)
├─ 4x Digital Output (Relay)
├─ 2x ADS1115 (16-bit ADC)
├─ Micro SD Card Slot (Optional - TIDAK DIGUNAKAN)
├─ DHT20 (Temperature & Humidity)
└─ GPIO1, GPIO2, Serial3, I2C
```

---

## 🔍 MASALAH YANG DIIDENTIFIKASI

### 1️⃣ **CRITICAL - Device Stuck saat LTE Down**
```
Current Behavior:
- SIM card dicabut
- Device stuck di retry loop selamanya
- Sensor TIDAK dibaca
- Data HILANG
- Device tidak melakukan apapun yang berguna

Impact: 🔴 CRITICAL
- Data loss selama downtime
- Device unusable without LTE
- Waste of hardware resources
```

### 2️⃣ **CRITICAL - Infinite Retry Loop**
```
Current Behavior:
- LTE fail → Retry 30s → Fail → Retry 30s → FOREVER
- Tidak ada maximum retry limit
- Tidak ada fallback strategy
- Tidak ada ESP restart setelah X attempts

Impact: 🔴 CRITICAL
- Device stuck indefinitely
- Cannot recover without manual intervention
- Power waste
```

### 3️⃣ **HIGH - No Data Persistence**
```
Current Behavior:
- MQTT publish fail → Data hilang
- No buffering mechanism
- No retry queue
- No offline storage

Impact: 🟠 HIGH
- Data loss during network issues
- Cannot recover unsent data
- Historical data not available
```

### 4️⃣ **MEDIUM - No Memory Management**
```
Current Behavior:
- No heap monitoring
- No automatic cleanup
- Risk of memory leak
- No circular buffer

Impact: 🟡 MEDIUM
- Potential crash after long operation
- Memory fragmentation
```

---

## 🎯 STRATEGI SOLUSI

### **CONSTRAINT: NO SD CARD**

Karena SD card tidak digunakan, kita akan gunakan:
1. ✅ **ESP32 Flash Memory** (NVS - Non-Volatile Storage)
2. ✅ **PSRAM** (8MB) untuk buffering
3. ✅ **RTC Memory** untuk critical data

---

## 📝 RENCANA IMPLEMENTASI

### **PHASE 1: OFFLINE MODE** (Priority: 🔴 CRITICAL)

#### Tujuan:
Device tetap berfungsi & baca sensor walaupun LTE down

#### Design:
```cpp
State Machine:
┌─────────────────────────────────────────────────────────┐
│ FULLY_CONNECTED                                         │
│ - Read sensors every 30s                                │
│ - Send telemetry immediately                            │
│ - Update last_success timestamp                         │
└──────────┬──────────────────────────────────────────────┘
           │ LTE/MQTT Down
           ▼
┌─────────────────────────────────────────────────────────┐
│ RETRY_MODE (0-10 attempts)                              │
│ - Continue reading sensors every 30s                    │
│ - Buffer data to RAM (PSRAM)                            │
│ - Retry LTE every 30s                                   │
│ - Max 10 retries (~5 minutes)                           │
└──────────┬──────────────────────────────────────────────┘
           │ Still failing after 10 retries
           ▼
┌─────────────────────────────────────────────────────────┐
│ OFFLINE_MODE                                            │
│ - Continue reading sensors every 30s                    │
│ - Store data to NVS (Flash)                             │
│ - Retry LTE every 5 minutes (low frequency)             │
│ - LED indicator: Blinking (offline)                     │
└──────────┬──────────────────────────────────────────────┘
           │ Connection restored
           ▼
┌─────────────────────────────────────────────────────────┐
│ SYNC_MODE                                               │
│ - Send buffered data from NVS                           │
│ - Resume normal operation                               │
│ - Clear sent data from NVS                              │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Details:

**1. Sensor Reading Decoupled from Connection**
```cpp
// BEFORE (BAD):
void loop() {
    if (isFullyConnected()) {
        readSensors();
        sendTelemetry();
    }
}

// AFTER (GOOD):
void loop() {
    // ALWAYS read sensors
    if (shouldReadSensors()) {
        readSensors();
        
        if (isFullyConnected()) {
            sendTelemetry();
        } else {
            bufferTelemetry();  // Store for later
        }
    }
    
    connectionManager.loop();
}
```

**2. Retry Limit & Offline Mode**
```cpp
#define MAX_RETRY_ATTEMPTS 10           // 10 retries = ~5 minutes
#define OFFLINE_RETRY_INTERVAL 300000   // 5 minutes in offline mode
#define ESP_RESTART_THRESHOLD 30        // Restart after 30 total failures

States:
- RETRY_MODE: 0-10 failures → Retry every 30s
- OFFLINE_MODE: >10 failures → Retry every 5min
- ESP_RESTART: >30 failures → Restart ESP32
```

**3. Data Persistence Priority**
```
Priority 1 (PSRAM - Fast, Volatile):
- Recent 50 telemetry messages
- Size: ~250KB (50 messages × 5KB)
- Used during RETRY_MODE

Priority 2 (NVS Flash - Slow, Non-volatile):
- Last 100 telemetry messages  
- Size: ~100KB max (compressed)
- Used during OFFLINE_MODE
- Persists across reboots

Priority 3 (RTC Memory - Very small, persists during sleep):
- Last successful timestamp
- Offline mode flag
- Retry counter
- Size: ~512 bytes
```

---

### **PHASE 2: DATA BUFFERING** (Priority: 🟠 HIGH)

#### Tujuan:
Tidak ada data yang hilang, semua data eventually terkirim

#### Design:

**Buffer Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│ PSRAM CIRCULAR BUFFER (Real-time)                      │
│ - Capacity: 50 messages                                 │
│ - Newest data overwrites oldest if full                 │
│ - Fast read/write                                       │
│ - Lost on power cycle                                   │
└─────────────────────────────────────────────────────────┘
           │ Write every 30s
           │ Read when connected
           ▼
┌─────────────────────────────────────────────────────────┐
│ NVS FLASH STORAGE (Persistent)                         │
│ - Capacity: 100 messages (compressed)                   │
│ - Persists across power cycles                         │
│ - Slow write (flash wear consideration)                │
│ - Write only when entering OFFLINE_MODE                 │
└─────────────────────────────────────────────────────────┘
```

**Buffer Manager:**
```cpp
class DataBuffer {
public:
    // Add telemetry to buffer
    bool add(JsonDocument& doc);
    
    // Get oldest unsent telemetry
    bool getOldest(JsonDocument& doc);
    
    // Remove oldest after successful send
    void removeOldest();
    
    // Get buffer statistics
    BufferStats getStats();
    
    // Flush PSRAM to NVS (when going offline)
    void flushToNVS();
    
    // Load from NVS (after reboot)
    void loadFromNVS();
    
private:
    CircularBuffer psramBuffer;  // Fast, volatile
    NVSStorage nvsStorage;        // Slow, persistent
};
```

**Send Strategy:**
```cpp
When FULLY_CONNECTED:
1. Send real-time telemetry first (priority)
2. If successful, check if buffer has data
3. Send ONE buffered message per cycle
4. Remove from buffer after confirm sent
5. Continue until buffer empty

Rate limiting:
- Real-time: 1 message per 30s
- Buffered: 1 message per 5s (faster catch-up)
- Max burst: 5 messages, then pause 30s
```

---

### **PHASE 3: MEMORY MANAGEMENT** (Priority: 🟡 MEDIUM)

#### Tujuan:
Prevent memory leaks & crashes during long operation

#### Implementation:

**1. Heap Monitoring**
```cpp
#define HEAP_WARNING_THRESHOLD 150000   // 150KB
#define HEAP_CRITICAL_THRESHOLD 100000  // 100KB

void checkMemory() {
    uint32_t freeHeap = ESP.getFreeHeap();
    
    if (freeHeap < HEAP_CRITICAL_THRESHOLD) {
        Serial.println("⚠️ CRITICAL: Low memory!");
        // Emergency cleanup
        clearOldBuffers();
        clearJsonDocuments();
        
        if (freeHeap < 80000) {
            Serial.println("🚨 RESTARTING: Out of memory!");
            ESP.restart();
        }
    } else if (freeHeap < HEAP_WARNING_THRESHOLD) {
        Serial.println("⚠️ WARNING: Low memory");
        // Proactive cleanup
        limitBufferSize();
    }
}
```

**2. Automatic Cleanup**
```cpp
Features:
- Clear sent data from buffer immediately
- Limit PSRAM buffer to 50 messages max
- Compress old data before storing to NVS
- Delete data older than 24 hours
- Periodic heap check every 5 minutes
```

**3. Buffer Overflow Strategy**
```cpp
When buffer full:
Option A: Overwrite oldest data (default)
Option B: Stop accepting new data
Option C: Emergency send burst

Recommended: Option A (Circular buffer)
- Always keep newest data
- Oldest data gets overwritten
- No data loss for recent events
```

---

### **PHASE 4: SMARTER RECOVERY** (Priority: 🟡 MEDIUM)

#### Tujuan:
Faster recovery, less power waste, better resilience

#### Implementation:

**1. Exponential Backoff**
```cpp
Retry intervals:
- Attempt 1-3: 30s   (Quick retry for transient issues)
- Attempt 4-6: 60s   (Give network time to stabilize)
- Attempt 7-10: 120s (Slow down retry frequency)
- Attempt 10+: 300s  (Offline mode, very slow retry)

Benefits:
- Less power consumption
- Less network spam
- Higher success rate
- Better for operator network
```

**2. Network Quality Check**
```cpp
Before retry:
1. Check SIM card present (AT+CPIN?)
2. Check signal quality (AT+CSQ)
3. If CSQ < 5, wait longer before retry
4. If no SIM, skip LTE retries

Skip unnecessary retry attempts when:
- No SIM card detected
- Signal too weak (CSQ < 5)
- Modem not responding
```

**3. Progressive Restart Strategy**
```cpp
Failure levels:
- Level 1 (3 fails): Modem software reset
- Level 2 (10 fails): Modem hard reset (power cycle)
- Level 3 (20 fails): ESP32 restart
- Level 4 (30 fails): Enter deep sleep 1min, then restart

Deep sleep benefit:
- Full hardware reset
- Lower power consumption
- Give network/modem time to stabilize
```

---

## 📊 STORAGE CALCULATION

### **Without SD Card:**

**PSRAM (8MB available):**
```
Circular Buffer:
- 50 messages × 5KB = 250KB
- Overhead: ~50KB
- Total: ~300KB

Remaining for other use: 7.7MB ✅
```

**NVS Flash (512KB partition):**
```
Persistent Storage:
- 100 messages × 1KB (compressed) = 100KB
- Metadata: ~20KB
- WiFi/Bluetooth reserved: ~100KB
- Available: ~292KB

Actual usage: ~120KB ✅
```

**RTC Memory (8KB):**
```
Critical Data Only:
- Offline flag: 1 byte
- Retry counter: 4 bytes
- Last success time: 4 bytes
- Last publish time: 4 bytes
- Total: <100 bytes ✅
```

---

## ⚙️ CONFIGURATION CHANGES

### **New Config Parameters:**

```cpp
// config.h additions:

// ============================================================================
// OFFLINE MODE CONFIGURATION
// ============================================================================

#define ENABLE_OFFLINE_MODE         true    // Enable offline sensor reading
#define MAX_RETRY_BEFORE_OFFLINE    10      // 10 retries before offline mode
#define OFFLINE_RETRY_INTERVAL      300000  // 5 min retry in offline mode
#define ESP_RESTART_THRESHOLD       30      // Restart after 30 failures

// ============================================================================
// DATA BUFFER CONFIGURATION
// ============================================================================

#define ENABLE_DATA_BUFFERING       true    // Enable data buffering
#define PSRAM_BUFFER_SIZE           50      // Max 50 messages in PSRAM
#define NVS_BUFFER_SIZE             100     // Max 100 messages in NVS
#define BUFFER_SEND_INTERVAL        5000    // Send buffered data every 5s
#define MAX_BUFFER_AGE_HOURS        24      // Delete data older than 24h

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

#define HEAP_CHECK_INTERVAL         300000  // Check heap every 5 min
#define HEAP_WARNING_THRESHOLD      150000  // 150KB warning
#define HEAP_CRITICAL_THRESHOLD     100000  // 100KB critical
#define AUTO_CLEANUP_ENABLED        true    // Enable auto cleanup

// ============================================================================
// RETRY STRATEGY
// ============================================================================

#define RETRY_BACKOFF_ENABLED       true    // Enable exponential backoff
#define RETRY_INTERVAL_LEVEL_1      30000   // 30s for attempts 1-3
#define RETRY_INTERVAL_LEVEL_2      60000   // 60s for attempts 4-6
#define RETRY_INTERVAL_LEVEL_3      120000  // 120s for attempts 7-10
#define RETRY_INTERVAL_OFFLINE      300000  // 5min in offline mode
```

---

## 🎯 IMPLEMENTATION PRIORITY

### **MUST HAVE (Week 1):**
1. ✅ Decouple sensor reading from connection
2. ✅ Implement OFFLINE_MODE state
3. ✅ Add retry limit (max 10 attempts)
4. ✅ PSRAM circular buffer (50 messages)
5. ✅ Basic send buffered data

### **SHOULD HAVE (Week 2):**
6. ✅ NVS persistent storage
7. ✅ ESP restart after 30 failures
8. ✅ Exponential backoff retry
9. ✅ Memory monitoring & cleanup
10. ✅ Buffer compression

### **NICE TO HAVE (Week 3):**
11. ⚪ Network quality check
12. ⚪ Deep sleep on critical failure
13. ⚪ LED status indicator
14. ⚪ Watchdog timer
15. ⚪ MQTT QoS 1 confirmation

---

## 📈 SUCCESS METRICS

### **After Implementation:**

**Reliability:**
- ✅ 0% data loss during network issues
- ✅ Device continues operating without LTE
- ✅ Auto-recovery within 5 minutes
- ✅ No manual intervention needed

**Performance:**
- ✅ Sensor reading continues at 30s interval
- ✅ Buffered data sent within 1 hour of reconnection
- ✅ Memory stable over 7 days
- ✅ No crashes during 30-day test

**Power Efficiency:**
- ✅ 50% less retry attempts (exponential backoff)
- ✅ Lower current draw in offline mode
- ✅ Smart modem management

---

## 🚀 NEXT STEPS

1. **Review & Approve** this plan
2. **Prioritize features** (must/should/nice to have)
3. **Start implementation** Phase 1
4. **Test each phase** before moving to next
5. **Deploy & monitor** in pilot environment

---

**Question for Discussion:**

1. ❓ Berapa lama data buffering yang kamu mau? (Default: 24 jam)
2. ❓ Berapa retry attempts maksimal sebelum offline? (Default: 10)
3. ❓ Berapa lama interval retry di offline mode? (Default: 5 menit)
4. ❓ Apakah perlu LED indicator untuk status? (Recommended: Yes)
5. ❓ Apakah perlu compress data sebelum simpan ke NVS? (Recommended: Yes)

---

**Ready to implement?** 🚀
