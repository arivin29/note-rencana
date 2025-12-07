# 🏗️ SIMPLIFIED ARCHITECTURE - SD Card Only

## ✅ USER REQUIREMENTS CONFIRMED:

1. **No RAM Buffer** - Save directly to SD card
2. **Non-blocking** - Sensors must read even during network operations
3. **SIM7600 wait time** - Sensor should work even if modem still starting

---

## 📐 FINAL SIMPLIFIED ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP32-S3 MAIN LOOP                        │
│                     (Non-blocking)                           │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SERVICE 1   │  │  SERVICE 2   │  │  SERVICE 3   │
│   SENSOR     │  │   NETWORK    │  │  DATA SYNC   │
│  (30s timer) │  │  (1s timer)  │  │ (10s timer)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │                 │                 │
       ▼                 ▼                 ▼
 Always reads      State Machine    Sends when
 sensors &         (non-blocking)    connected
 saves to SD
```

---

## 🔄 DETAILED FLOW

### **SERVICE 1: Sensor Reading (Independent)**

```
┌────────────────────────────────────────────────────┐
│ TIMER: Every 30 seconds (ALWAYS runs)             │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐                                 │
│  │ Read Sensors │  ALL sensors:                   │
│  │              │  • 4-20mA                        │
│  │              │  • ADC                           │
│  │              │  • I2C                           │
│  │              │  • Digital I/O                   │
│  │              │  • RS485 Modbus                  │
│  └──────┬───────┘                                 │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Build JSON   │  Create telemetry                │
│  │ Telemetry    │  with timestamp                  │
│  └──────┬───────┘                                 │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Save to SD   │  /data/YYYYMMDD/                 │
│  │ Card         │  HHMMSS_telemetry.json           │
│  └──────┬───────┘                                 │
│         │                                          │
│    ┌────┴─────┐                                   │
│    │          │                                   │
│ SUCCESS ▼      ▼ FAILED                           │
│  Done    Log error                                │
│          (SD not mounted                          │
│           or write error)                         │
│                                                    │
│  ✅ NEVER BLOCKS - Quick operation (~20ms)        │
│  ✅ INDEPENDENT - No network dependency           │
└────────────────────────────────────────────────────┘
```

### **SERVICE 2: Network Management (Non-blocking State Machine)**

```
┌────────────────────────────────────────────────────┐
│ TIMER: Every 1 second (State machine tick)        │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐                                 │
│  │ Check State  │  Current connection state        │
│  └──────┬───────┘                                 │
│         │                                          │
│         ▼                                          │
│  ┌─────────────────────────────────┐             │
│  │   State Machine (non-blocking)  │             │
│  │                                  │             │
│  │  • STARTUP           (init)      │             │
│  │  • RETRY_MODE        (quick)     │             │
│  │  • OFFLINE_MODE      (long)      │             │
│  │  • FULLY_CONNECTED   (normal)    │             │
│  │  • ESP_RESTART       (critical)  │             │
│  └──────┬──────────────────────────┘             │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Non-blocking │  • Check status only             │
│  │ Operations   │  • No long delays                │
│  │              │  • Update state vars             │
│  │              │  • Quick return                  │
│  └──────────────┘                                 │
│                                                    │
│  ⚠️  Key: NO blocking AT commands here!           │
│  ⚠️  Just check status & update state              │
└────────────────────────────────────────────────────┘
```

### **SERVICE 3: Data Sync (Only when connected)**

```
┌────────────────────────────────────────────────────┐
│ TIMER: Every 10 seconds (Only if connected)       │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐                                 │
│  │ Check        │  if (!connected) {               │
│  │ Connection   │      return; // Skip             │
│  │              │  }                               │
│  └──────┬───────┘                                 │
│         │ Connected                                │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Scan SD      │  /data/YYYYMMDD/*.json           │
│  │ for pending  │  Sort by timestamp               │
│  │ files        │  (oldest first)                  │
│  └──────┬───────┘                                 │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Get oldest   │  Read oldest file                │
│  │ file         │                                  │
│  └──────┬───────┘                                 │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐                                 │
│  │ Send to MQTT │  Publish with QoS 1              │
│  └──────┬───────┘                                 │
│         │                                          │
│    ┌────┴─────┐                                   │
│    │          │                                   │
│ SUCCESS ▼      ▼ FAILED                           │
│  Delete    Keep file                              │
│  file      Try next time                          │
│                                                    │
│  ⏱️  Rate limit: 1 msg / 10 seconds               │
│  📦 Burst control: Max 10 msgs                    │
└────────────────────────────────────────────────────┘
```

---

## 💾 SIMPLIFIED STORAGE

### **ONE STORAGE LOCATION: SD Card Only**

```
/sdcard/
├── data/                    📁 Telemetry data (FIFO queue)
│   ├── 20251207/
│   │   ├── 100000_telemetry.json   ← Oldest (sent first)
│   │   ├── 100030_telemetry.json
│   │   ├── 100100_telemetry.json
│   │   └── ...
│   ├── 20251208/
│   └── ...
│
├── logs/                    📁 System logs
│   ├── boot_20251207.log
│   ├── error_20251207.log
│   └── ...
│
└── system/                  📁 System state
    ├── counters.json       (persistent stats)
    └── state.json          (last known state)
```

### **No RAM Buffer = Simpler!**

```cpp
// BEFORE (Complex - with RAM buffer):
readSensors() 
  → Try add to RAM buffer (50 items)
    → If RAM full, save to SD
    → Sync from RAM first
    → Then sync from SD

// AFTER (Simple - SD only):
readSensors() 
  → Save directly to SD
    → Sync from SD when connected
    
// Result: 50% less code, 100% persistent!
```

---

## ⚙️ NON-BLOCKING IMPLEMENTATION

### **Critical: Avoid Blocking Operations**

```cpp
// ❌ BAD: Blocking operations
void loop() {
    lteManager.connectWithTimeout(60000);  // Blocks 60 seconds!
    mqtt.connect();                        // Blocks until connected!
    readSensors();                         // Never executes during blocking!
}

// ✅ GOOD: Non-blocking with state machine
void loop() {
    static unsigned long lastSensor = 0;
    static unsigned long lastNetwork = 0;
    static unsigned long lastSync = 0;
    
    unsigned long now = millis();
    
    // Service 1: ALWAYS runs, never blocked
    if (now - lastSensor >= 30000) {
        readSensorsNonBlocking();  // Quick operation
        saveToSDNonBlocking();     // Write file (20ms)
        lastSensor = now;
    }
    
    // Service 2: State machine tick (non-blocking)
    if (now - lastNetwork >= 1000) {
        connectionManager.tickNonBlocking();  // Just check status
        lastNetwork = now;
    }
    
    // Service 3: Sync when available
    if (now - lastSync >= 10000) {
        if (isConnected()) {
            syncOneFileNonBlocking();  // Send 1 file only
        }
        lastSync = now;
    }
}
```

### **Connection Manager: Non-blocking State Machine**

```cpp
class ConnectionManager {
private:
    enum State {
        STARTUP,
        RETRY_MODE,
        OFFLINE_MODE,
        FULLY_CONNECTED,
        ESP_RESTART
    };
    
    State currentState;
    unsigned long stateStartTime;
    int retryCount;
    int offlineCycle;
    
public:
    // Non-blocking tick - returns immediately
    void tickNonBlocking() {
        unsigned long now = millis();
        unsigned long stateElapsed = now - stateStartTime;
        
        switch(currentState) {
            case STARTUP:
                // Quick initialization check
                if (modemReady()) {
                    changeState(RETRY_MODE);
                }
                break;
                
            case RETRY_MODE:
                // Check connection (non-blocking)
                if (isConnected()) {
                    changeState(FULLY_CONNECTED);
                } else if (stateElapsed >= RETRY_MODE_INTERVAL_MS) {
                    retryCount++;
                    if (retryCount >= RETRY_MODE_MAX_ATTEMPTS) {
                        changeState(OFFLINE_MODE);
                    } else {
                        // Trigger retry (non-blocking)
                        triggerRetry();
                    }
                    stateStartTime = now; // Reset timer
                }
                break;
                
            case OFFLINE_MODE:
                // Long wait, then modem restart
                if (stateElapsed >= OFFLINE_MODE_WAIT_MS) {
                    restartModemNonBlocking();
                    offlineCycle++;
                    if (offlineCycle >= OFFLINE_MODE_MAX_CYCLES) {
                        changeState(ESP_RESTART);
                    } else {
                        changeState(RETRY_MODE);
                    }
                }
                break;
                
            case FULLY_CONNECTED:
                // Monitor connection health
                if (!isConnected()) {
                    changeState(RETRY_MODE);
                }
                break;
                
            case ESP_RESTART:
                saveStateToSD();
                ESP.restart();
                break;
        }
    }
    
    // All methods are non-blocking!
    bool modemReady() {
        // Just check status, no AT commands with timeout
        return lteManager.isReady(); // Returns immediately
    }
    
    void triggerRetry() {
        // Non-blocking: just set flag
        lteManager.startConnect(); // Async operation
    }
};
```

---

## 📊 EXAMPLE TIMELINE

### **Normal Operation (Connected)**

```
Time    Service 1           Service 2          Service 3
-----   -----------------   ----------------   ------------------
0s      Read sensors ✅     Check: CONNECTED   -
        Save to SD ✅
1s      -                   Check: CONNECTED   -
10s     -                   Check: CONNECTED   Scan SD: 1 file
                                               Send file 1 ✅
                                               Delete ✅
20s     -                   Check: CONNECTED   Scan SD: Empty
30s     Read sensors ✅     Check: CONNECTED   Scan SD: 1 file
        Save to SD ✅                          Send file 1 ✅
40s     -                   Check: CONNECTED   Scan SD: Empty
...
```

### **Offline Operation**

```
Time    Service 1           Service 2              Service 3
-----   -----------------   --------------------   ------------------
0s      Read sensors ✅     Connection lost!       -
        Save to SD ✅       → RETRY_MODE (0/10)
30s     Read sensors ✅     Retry attempt 1 ❌     Skip (offline)
        Save to SD ✅       → Retry count: 1/10
60s     Read sensors ✅     Retry attempt 2 ❌     Skip (offline)
        Save to SD ✅       → Retry count: 2/10
...
300s    Read sensors ✅     Retry attempt 10 ❌    Skip (offline)
        Save to SD ✅       → OFFLINE_MODE (1/3)
        (11 files now)      Wait 10 minutes...
330s    Read sensors ✅     Waiting...             Skip (offline)
        Save to SD ✅
        (12 files now)
...
900s    Read sensors ✅     10 min elapsed         Skip (offline)
        Save to SD ✅       → Restart modem
        (30 files now)      → Try reconnect
...
```

### **Reconnection & Sync**

```
Time    Service 1           Service 2              Service 3
-----   -----------------   --------------------   ------------------
920s    Read sensors ✅     Connected! ✅          -
        Save to SD ✅       → FULLY_CONNECTED
        (31 files total)
930s    -                   Monitor connection     Scan SD: 31 files
                                                   Send oldest ✅
                                                   Delete ✅
                                                   (30 files left)
940s    -                   Monitor connection     Send oldest ✅
                                                   Delete ✅
                                                   (29 files left)
950s    Read sensors ✅     Monitor connection     Send oldest ✅
        Save to SD ✅                              (29 files left)
        (30 files total)
960s    -                   Monitor connection     Send oldest ✅
                                                   (28 files left)
...continues until all files sent...
```

---

## ✅ BENEFITS OF SIMPLIFIED ARCHITECTURE

1. **No RAM Buffer Complexity**
   - ✅ Simpler code
   - ✅ Less memory management
   - ✅ Fewer edge cases

2. **100% Persistent Storage**
   - ✅ Survives power loss
   - ✅ Survives ESP restart
   - ✅ No data loss

3. **Non-blocking Design**
   - ✅ Sensors ALWAYS read (every 30s)
   - ✅ Network never blocks sensors
   - ✅ Independent services

4. **Sufficient Performance**
   - ✅ SD write: ~20ms (OK for 30s interval)
   - ✅ Modern SD cards: 10,000+ write cycles
   - ✅ Years of operation

5. **Easy to Understand**
   - ✅ Linear flow: Sensor → SD → MQTT
   - ✅ One storage location
   - ✅ Easy debugging

---

## 🎯 FINAL DECISION

### **✅ APPROVED ARCHITECTURE:**

```
Service 1 (30s):  Read Sensors → Save to SD
                                    ↓
                           (When connected)
                                    ↓
Service 3 (10s):  Scan SD → Send to MQTT → Delete
                                    ↑
                            (Managed by)
                                    ↑
Service 2 (1s):   Connection State Machine
```

### **📦 Storage: SD Card ONLY**
- No RAM buffer
- All data persistent
- Simpler implementation

### **⚡ Non-blocking: 3 Independent Timers**
- 30s: Sensor reading (ALWAYS)
- 1s: Network state machine (ALWAYS)
- 10s: Data sync (WHEN CONNECTED)

---

## 🚀 READY TO IMPLEMENT?

Next steps:
1. ✅ Update config.h (DONE)
2. Create `sd_manager.h/cpp` - SD card operations
3. Update `main.cpp` - Implement 3 services
4. Update `connection_manager.cpp` - Non-blocking state machine
5. Test non-blocking behavior

**Mau lanjut yang mana bro?** 💪
