# 💾 STORAGE STRATEGY - Final Design

## 📊 DATA SIZE ANALYSIS

### **Single Message Size:**
```json
Current telemetry: ~2000 bytes (2KB)

Breakdown:
- Sensors data: ~1500 bytes
- Node info: ~300 bytes  
- Metadata: ~200 bytes
Total: ~2000 bytes
```

---

## 🎯 STORAGE CAPACITY CALCULATION

### **ESP32S3 Storage Available:**

**1. PSRAM (8MB):**
```
Available for buffer: 8MB
Reserved for system: 1MB
Available: 7MB

Messages capacity:
7MB / 2KB = 3,500 messages
```

**2. NVS Flash (512KB partition):**
```
Total partition: 512KB
System reserved: ~150KB
Available: ~360KB

Messages capacity (uncompressed):
360KB / 2KB = 180 messages

Messages capacity (compressed 50%):
360KB / 1KB = 360 messages
```

---

## 💡 REKOMENDASI STRATEGI

### **1️⃣ BUFFER DURATION: Dynamic (20% threshold)**

**REKOMENDASI: ✅ AUTO-DELETE based on storage, NOT time limit**

```cpp
Strategy:
- Monitor available storage continuously
- Keep filling buffer until 80% full
- When >80% full, delete oldest data
- No hard 24h limit - flexible based on downtime

Benefits:
✅ Maximize data retention during long outages
✅ Flexible - adapts to situation
✅ No arbitrary time limit
✅ Automatically manages itself

Example:
- Normal case: Buffer stays small (<10%)
- Long outage: Buffer grows to 80%
- Very long outage: Oldest data auto-deleted
```

**Calculation:**
```
PSRAM (7MB available):
- Max usage: 80% = 5.6MB
- Capacity: 5.6MB / 2KB = 2,800 messages
- At 30s interval: 2,800 × 30s = 84,000s = 23 hours ✅

NVS Flash (360KB available):
- Max usage: 80% = 288KB  
- Capacity: 288KB / 1KB (compressed) = 288 messages
- At 30s interval: 288 × 30s = 8,640s = 2.4 hours

Total capacity: ~25 hours of data! 🎉
```

---

### **2️⃣ DATA FORMAT: JSON String (NOT compressed)**

**REKOMENDASI: ✅ Store as JSON String (simple & effective)**

**Why NOT array/binary:**
```
❌ Array format:
- Harder to parse
- Complex indexing
- Difficult to skip corrupted data
- More code complexity

❌ Binary compression:
- Requires compression library (zlib/gzip)
- Uses more CPU & RAM during compress/decompress
- Slower write/read
- Risk of corruption = all data lost
- Complex error handling
```

**Why JSON String:**
```
✅ JSON String format:
- Simple to implement
- Easy to debug (human readable)
- Natural format (no conversion needed)
- Corruption isolated to single message
- Fast to parse (ArduinoJson optimized)
- Already in this format!

Storage efficiency:
- JSON String: ~2KB per message
- Compressed: ~1KB per message (50% saving)
- Trade-off: Simplicity vs 50% space

Recommendation: START with JSON String
- If space becomes issue, ADD compression later
- Compression is optimization, not requirement
```

**Implementation:**
```cpp
// PSRAM Circular Buffer
struct BufferEntry {
    char jsonData[2048];    // JSON string
    uint32_t timestamp;     // Unix timestamp
    bool sent;              // Delivery status
};

BufferEntry psramBuffer[2800];  // 2800 messages in PSRAM
int bufferHead = 0;
int bufferTail = 0;
int bufferCount = 0;

// NVS Flash Storage  
// Store as key-value pairs
// Key: "msg_0001", "msg_0002", etc.
// Value: JSON string (max 1984 bytes per NVS entry)
```

---

### **3️⃣ RETRY STRATEGY: Optimized**

#### **BEFORE OFFLINE MODE:**

**REKOMENDASI: ✅ 5 attempts (~2.5 min) sebelum offline**

```cpp
Why 5 instead of 10:

Quick failures (5 attempts):
- Attempt 1: Immediate (0s)
- Attempt 2: 30s later
- Attempt 3: 30s later
- Attempt 4: 30s later
- Attempt 5: 30s later
Total: ~2 minutes

Benefits:
✅ Faster transition to offline mode
✅ Less modem thrashing
✅ Lower power consumption
✅ Earlier data buffering starts

Reasoning:
- If LTE fails 5x in 2 min → Unlikely to succeed soon
- Better to go offline & retry slowly
- Save power & reduce stress on modem
```

#### **IN OFFLINE MODE:**

**REKOMENDASI: ✅ Exponential backoff retry**

```cpp
Retry schedule:
- Minutes 0-10: Retry every 5 minutes (2 attempts)
- Minutes 10-30: Retry every 10 minutes (2 attempts)  
- Minutes 30+: Retry every 15 minutes (ongoing)

Benefits:
✅ Quick recovery if short outage
✅ Less aggressive for long outages
✅ Power efficient
✅ Network friendly

Example timeline:
00:00 - Enter offline mode (after 5 failed attempts)
05:00 - Retry #1
10:00 - Retry #2
20:00 - Retry #3
35:00 - Retry #4
50:00 - Retry #5
... continue every 15min
```

---

### **4️⃣ LED INDICATOR: SKIP ❌**

**REKOMENDASI: ✅ NO LED, use alternative monitoring**

```
Since panel tidak terlihat, gunakan:

Option 1: Built-in LED (ESP32)
- Use onboard LED if available
- Just for debugging during development
- Can be disabled in production

Option 2: MQTT Status Messages
- Send special status message every 5 min
- Include offline_mode flag in telemetry
- Server can monitor & alert

Option 3: Serial Logging
- Detailed logs via serial port
- Can be connected for debugging
- No hardware changes needed

Recommendation: Option 2 (MQTT Status)
✅ Already connected (when online)
✅ Remote monitoring
✅ No hardware changes
✅ Server-side alerts
```

---

### **5️⃣ DATA COMPRESSION: OPTIONAL**

**REKOMENDASI: ✅ START without compression, ADD if needed**

#### **Phase 1: NO Compression (Simple)**
```cpp
Pros:
✅ Simpler code
✅ Faster development
✅ Easier debugging
✅ Less CPU usage
✅ Less RAM usage
✅ More reliable

Storage capacity without compression:
- PSRAM: 2,800 messages = 23 hours
- NVS: 180 messages = 1.5 hours
- Total: ~24 hours

Conclusion: 24 hours buffer is ENOUGH!
```

#### **Phase 2: Add Compression (Optimization)**
```cpp
Only if needed later:

When to add:
- If 24h buffer insufficient
- If experiencing frequent long outages
- If need more buffer capacity

Compression options:
1. Simple: Remove whitespace (~10% saving)
2. Medium: Remove redundant keys (~20% saving)  
3. Advanced: zlib compression (~50% saving)

Recommendation: Start simple, optimize later
```

---

## 🎯 FINAL DESIGN DECISION

### **STORAGE ARCHITECTURE:**

```
┌─────────────────────────────────────────────────────────────┐
│ PSRAM CIRCULAR BUFFER (Primary)                            │
│                                                             │
│ Capacity: 2,800 messages (~23 hours @ 30s interval)        │
│ Format: JSON String (2KB per message)                      │
│ Usage limit: 80% = 2,240 messages                          │
│ Auto-delete: Oldest when >80%                              │
│ Speed: Very fast read/write                                │
│ Persistence: Lost on power cycle                           │
│                                                             │
│ Use case: Short-term buffering during network issues       │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Flush when entering offline mode
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ NVS FLASH STORAGE (Backup)                                 │
│                                                             │
│ Capacity: 180 messages (~1.5 hours @ 30s interval)         │
│ Format: JSON String (2KB per message)                      │
│ Usage limit: 80% = 144 messages                            │
│ Auto-delete: Oldest when >80%                              │
│ Speed: Slow write, medium read                             │
│ Persistence: Survives power cycle                          │
│                                                             │
│ Use case: Power-cycle protection, long-term offline        │
└─────────────────────────────────────────────────────────────┘
```

### **RETRY CONFIGURATION:**

```cpp
// config.h

// ============================================================================
// OFFLINE MODE CONFIGURATION  
// ============================================================================

#define MAX_RETRY_BEFORE_OFFLINE    5       // 5 attempts = ~2.5 minutes
#define RETRY_INTERVAL_NORMAL       30000   // 30s during retry phase

// Exponential backoff in offline mode
#define OFFLINE_RETRY_INTERVAL_1    300000  // 5 min (first 10 min)
#define OFFLINE_RETRY_INTERVAL_2    600000  // 10 min (10-30 min)
#define OFFLINE_RETRY_INTERVAL_3    900000  // 15 min (30+ min)

#define ESP_RESTART_THRESHOLD       20      // Restart after 20 total failures

// ============================================================================
// BUFFER CONFIGURATION
// ============================================================================

#define PSRAM_BUFFER_CAPACITY       2800    // 2800 messages (~23 hours)
#define NVS_BUFFER_CAPACITY         180     // 180 messages (~1.5 hours)
#define BUFFER_USAGE_THRESHOLD      80      // Use max 80% of capacity
#define MESSAGE_MAX_SIZE            2048    // 2KB per message

// Auto-delete when buffer usage > 80%
#define AUTO_DELETE_OLDEST          true
#define BUFFER_CHECK_INTERVAL       60000   // Check every 1 minute

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

#define HEAP_CHECK_INTERVAL         300000  // Check every 5 minutes
#define HEAP_WARNING_THRESHOLD      2000000 // 2MB (for 8MB PSRAM)
#define HEAP_CRITICAL_THRESHOLD     1000000 // 1MB
#define AUTO_CLEANUP_ENABLED        true

// ============================================================================
// MONITORING (No LED, use MQTT)
// ============================================================================

#define STATUS_REPORT_INTERVAL      300000  // Report status every 5 min
#define INCLUDE_OFFLINE_FLAG        true    // Add offline_mode to telemetry
#define ENABLE_SERIAL_LOGGING       true    // Detailed serial logs
```

---

## 📈 CAPACITY EXAMPLES

### **Scenario 1: Normal Operation**
```
Telemetry interval: 30s
Buffering: None (connected)
Storage used: 0%
Status: ✅ Optimal
```

### **Scenario 2: Short Outage (1 hour)**
```
Messages buffered: 120
Storage used: 4% (PSRAM)
Recovery time: 10 minutes (@ 1 msg/5s)
Status: ✅ No problem
```

### **Scenario 3: Medium Outage (6 hours)**
```
Messages buffered: 720
Storage used: 26% (PSRAM)
Recovery time: 1 hour
Status: ✅ Comfortable
```

### **Scenario 4: Long Outage (23 hours)**
```
Messages buffered: 2,760 (max)
Storage used: 80% (PSRAM)
Start auto-deleting: Oldest messages
Status: ⚠️ At limit, but functional
```

### **Scenario 5: Very Long Outage (48+ hours)**
```
Messages in PSRAM: 2,240 (80% limit)
Messages in NVS: 144 (80% limit)
Oldest deleted: Yes (continuous)
Data retained: Last 24-25 hours
Status: ⚠️ Data loss for oldest, but recent data safe
```

---

## ✅ IMPLEMENTATION CHECKLIST

### **Phase 1: Core Functionality**
- [ ] Create PSRAM circular buffer structure
- [ ] Implement buffer add/get/remove functions
- [ ] Add storage usage monitoring (80% threshold)
- [ ] Auto-delete oldest when buffer full
- [ ] Decouple sensor reading from connection status

### **Phase 2: Offline Mode**
- [ ] Add RETRY_MODE state (5 attempts)
- [ ] Add OFFLINE_MODE state
- [ ] Implement exponential backoff
- [ ] Buffer data during offline
- [ ] Add offline_mode flag to telemetry

### **Phase 3: NVS Persistence**
- [ ] Implement NVS write functions
- [ ] Implement NVS read functions
- [ ] Flush PSRAM to NVS when entering offline
- [ ] Load NVS to PSRAM after reboot
- [ ] NVS usage monitoring

### **Phase 4: Send Buffered Data**
- [ ] Detect when connection restored
- [ ] Send buffered messages (1 per 5s)
- [ ] Remove from buffer after confirm sent
- [ ] Handle send failures
- [ ] Rate limiting (avoid burst)

### **Phase 5: Memory Management**
- [ ] Periodic heap check (every 5 min)
- [ ] Warning at 2MB free heap
- [ ] Critical at 1MB free heap
- [ ] Emergency cleanup functions
- [ ] ESP restart if critical

### **Phase 6: ESP Restart Logic**
- [ ] Count total LTE failures
- [ ] ESP restart after 20 failures
- [ ] Persist counter to NVS
- [ ] Load counter after reboot
- [ ] Reset counter on success

---

## 🎯 EXPECTED RESULTS

### **Reliability:**
- ✅ 0% data loss for outages < 24 hours
- ✅ Device continues operating offline
- ✅ Auto-recovery when connection restored
- ✅ Survives power cycles
- ✅ No manual intervention needed

### **Capacity:**
- ✅ 2,800 messages in PSRAM (~23h @ 30s)
- ✅ 180 messages in NVS (~1.5h backup)
- ✅ Total ~25 hours of data retention
- ✅ Auto-management, no overflow

### **Performance:**
- ✅ Fast buffering (PSRAM)
- ✅ Efficient retry strategy
- ✅ Low power in offline mode
- ✅ Smart recovery
- ✅ Memory stable

---

## ❓ FINAL CONFIRMATION

Apakah design ini sudah OK? 

**Summary:**
- ✅ Buffer ~25 hours (dynamic, 80% threshold)
- ✅ JSON String format (simple, no compression)
- ✅ 5 retry attempts before offline (~2.5 min)
- ✅ Exponential backoff in offline (5→10→15 min)
- ✅ No LED (use MQTT status instead)
- ✅ ESP restart after 20 total failures

Kalau OK, saya mulai **implement sekarang**! 🚀
