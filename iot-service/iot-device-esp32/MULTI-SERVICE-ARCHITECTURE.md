# 🏗️ MULTI-SERVICE ARCHITECTURE

## 📐 System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         ESP32-S3 MAIN LOOP                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Service 1   │  │  Service 2   │  │  Service 3   │            │
│  │   SENSOR     │  │   NETWORK    │  │   DATA SYNC  │            │
│  │   READING    │  │  MANAGEMENT  │  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│         │                  │                  │                    │
│         ▼                  ▼                  ▼                    │
│  [Every 30s]        [Every 1s]        [Every 10s]                 │
└────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ SERVICE 1: SENSOR READING (Independent, Always Running)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Timer: Every 30 seconds (regardless of network status)             │
│                                                                     │
│  ┌────────────┐                                                    │
│  │ Read ALL   │  • 4-20mA sensors                                  │
│  │ Sensors    │  • ADC inputs                                      │
│  │            │  • I2C devices                                     │
│  │            │  • Digital I/O                                     │
│  │            │  • RS485 Modbus                                    │
│  └─────┬──────┘                                                    │
│        │                                                            │
│        ▼                                                            │
│  ┌────────────┐                                                    │
│  │ Generate   │  Build JSON telemetry                              │
│  │ Telemetry  │  with timestamp                                    │
│  └─────┬──────┘                                                    │
│        │                                                            │
│        ▼                                                            │
│  ┌────────────┐                                                    │
│  │ Add to     │  dataBuffer.add(json)                              │
│  │ RAM Buffer │  (50 items max)                                    │
│  └─────┬──────┘                                                    │
│        │                                                            │
│        ├─── SUCCESS ──────────────────────────┐                    │
│        │                                       │                    │
│        └─── BUFFER FULL ───┐                  │                    │
│                             ▼                  ▼                    │
│                    ┌──────────────┐   ┌──────────────┐            │
│                    │ Save to SD   │   │ Wait for     │            │
│                    │ (if mounted) │   │ network to   │            │
│                    └──────────────┘   │ send         │            │
│                                        └──────────────┘            │
│                                                                     │
│  ✅ SENSORS NEVER STOP - Always collecting data!                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SERVICE 2: NETWORK MANAGEMENT (Independent State Machine)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Timer: Every 1 second (connection monitoring)                      │
│                                                                     │
│  ┌────────────┐                                                    │
│  │ Connection │  State Machine Loop                                │
│  │ Manager    │  • FULLY_CONNECTED                                 │
│  │ Loop()     │  • RETRY_MODE                                      │
│  │            │  • OFFLINE_MODE                                    │
│  │            │  • ESP_RESTART                                     │
│  └─────┬──────┘                                                    │
│        │                                                            │
│        ▼                                                            │
│  ┌─────────────────────────────────────────────┐                  │
│  │         CONNECTION STATE MACHINE             │                  │
│  │                                              │                  │
│  │  ┌──────────────────┐                        │                  │
│  │  │ FULLY_CONNECTED  │◄──────┐                │                  │
│  │  │  ✅ LTE: UP      │       │                │                  │
│  │  │  ✅ MQTT: UP     │       │                │                  │
│  │  └────────┬─────────┘       │                │                  │
│  │           │ Connection      │                │                  │
│  │           │ Lost            │                │                  │
│  │           ▼                 │                │                  │
│  │  ┌──────────────────┐      │ Reconnect      │                  │
│  │  │   RETRY_MODE     │      │ Success        │                  │
│  │  │  ⚠️  Trying...   │──────┘                │                  │
│  │  │  (10 attempts)   │                        │                  │
│  │  └────────┬─────────┘                        │                  │
│  │           │ Max attempts                      │                  │
│  │           ▼                                   │                  │
│  │  ┌──────────────────┐                        │                  │
│  │  │  OFFLINE_MODE    │                        │                  │
│  │  │  ❌ Long offline │                        │                  │
│  │  │  (3 cycles)      │                        │                  │
│  │  └────────┬─────────┘                        │                  │
│  │           │ Max cycles                        │                  │
│  │           ▼                                   │                  │
│  │  ┌──────────────────┐                        │                  │
│  │  │   ESP_RESTART    │                        │                  │
│  │  │  🔄 Reboot       │                        │                  │
│  │  └──────────────────┘                        │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                     │
│  ✅ NETWORK INDEPENDENT - Doesn't block sensors!                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SERVICE 3: DATA SYNC (Bridge between Sensor & Network)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Timer: Every 10 seconds (when connected)                           │
│                                                                     │
│  ┌────────────┐                                                    │
│  │ Check      │  if (isConnected()) {                              │
│  │ Connection │      sync();                                       │
│  │ Status     │  }                                                 │
│  └─────┬──────┘                                                    │
│        │                                                            │
│        ├─── OFFLINE ──────> Skip (wait)                            │
│        │                                                            │
│        └─── CONNECTED ────┐                                        │
│                            ▼                                        │
│                   ┌──────────────┐                                 │
│                   │ Priority 1:  │                                 │
│                   │ RAM Buffer   │                                 │
│                   └───────┬──────┘                                 │
│                           │                                         │
│                           ▼                                         │
│                   ┌──────────────┐                                 │
│                   │ Get oldest   │  dataBuffer.getOldest()         │
│                   │ from buffer  │                                 │
│                   └───────┬──────┘                                 │
│                           │                                         │
│                           ▼                                         │
│                   ┌──────────────┐                                 │
│                   │ Send to MQTT │  mqtt.publish()                 │
│                   └───────┬──────┘                                 │
│                           │                                         │
│                  ┌────────┴────────┐                               │
│                  │                 │                               │
│           SUCCESS ▼                ▼ FAILED                        │
│        ┌──────────────┐   ┌──────────────┐                        │
│        │ Remove from  │   │ Keep in      │                        │
│        │ buffer       │   │ buffer       │                        │
│        └──────────────┘   │ Try next     │                        │
│                           │ cycle        │                        │
│                           └──────────────┘                        │
│                                                                     │
│        ┌──────────────────────────────────────┐                   │
│        │ If RAM buffer empty:                 │                   │
│        │                                      │                   │
│        │ ┌──────────────┐                     │                   │
│        │ │ Priority 2:  │                     │                   │
│        │ │ SD Card      │                     │                   │
│        │ └───────┬──────┘                     │                   │
│        │         │                             │                   │
│        │         ▼                             │                   │
│        │ ┌──────────────┐                     │                   │
│        │ │ Scan SD for  │                     │                   │
│        │ │ pending data │                     │                   │
│        │ └───────┬──────┘                     │                   │
│        │         │                             │                   │
│        │         ▼                             │                   │
│        │ ┌──────────────┐                     │                   │
│        │ │ Send oldest  │  Rate limit:        │                   │
│        │ │ file first   │  1 msg / 10 sec     │                   │
│        │ └───────┬──────┘                     │                   │
│        │         │                             │                   │
│        │         ▼                             │                   │
│        │ ┌──────────────┐                     │                   │
│        │ │ Delete after │                     │                   │
│        │ │ success      │                     │                   │
│        │ └──────────────┘                     │                   │
│        └──────────────────────────────────────┘                   │
│                                                                     │
│  ✅ SMART SYNC - RAM first (fast), then SD (backup)                │
└─────────────────────────────────────────────────────────────────────┘
```

## 💾 Storage Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    STORAGE PRIORITY                           │
└──────────────────────────────────────────────────────────────┘

1️⃣  RAM BUFFER (50 items)
    ├─ Fastest access
    ├─ Limited capacity
    ├─ Volatile (lost on restart)
    └─ Primary queue for recent data

2️⃣  SD CARD (GB capacity)
    ├─ Persistent storage
    ├─ Large capacity (~1.6M messages)
    ├─ Fallback when RAM full
    └─ Backup for power loss

3️⃣  MQTT BROKER (Cloud)
    ├─ Final destination
    ├─ Historical storage
    ├─ Real-time dashboard
    └─ Data analysis
```

## 🔄 Detailed Flow Example

### **Normal Operation (Connected)**

```
t=0s:   Read sensors → Add to RAM buffer [1/50]
t=10s:  SYNC: Send buffer[0] to MQTT → Success → Remove from buffer [0/50]
t=30s:  Read sensors → Add to RAM buffer [1/50]
t=40s:  SYNC: Send buffer[0] to MQTT → Success → Remove from buffer [0/50]
t=60s:  Read sensors → Add to RAM buffer [1/50]
...continues...
```

### **Offline Operation**

```
t=0s:   Network disconnected → Enter RETRY_MODE
t=0s:   Read sensors → Add to RAM buffer [1/50]
t=30s:  Read sensors → Add to RAM buffer [2/50]
t=60s:  Read sensors → Add to RAM buffer [3/50]
...
t=300s: RETRY_MODE failed (10 attempts) → Enter OFFLINE_MODE
t=300s: Read sensors → Add to RAM buffer [11/50]
...
t=1500s: RAM buffer full [50/50]
t=1530s: Read sensors → Buffer full → Save to SD [file 1]
t=1560s: Read sensors → Buffer full → Save to SD [file 2]
...continues saving to SD...
```

### **Reconnection & Sync**

```
t=2000s: Network restored → Enter FULLY_CONNECTED
t=2000s: Read sensors → Add to RAM buffer [50/50] + SD has 20 files
t=2010s: SYNC: Send buffer[0] (oldest in RAM) → Success → [49/50]
t=2020s: SYNC: Send buffer[0] → Success → [48/50]
...
t=2500s: RAM buffer empty [0/50]
t=2510s: SYNC: Scan SD → Send file 1 → Success → Delete
t=2520s: SYNC: Send file 2 → Success → Delete
...continues until all SD files sent...
```

## ⚙️ Implementation in main.cpp

```cpp
void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastNetworkCheck = 0;
    static unsigned long lastSync = 0;
    
    unsigned long now = millis();
    
    // ============================================================
    // SERVICE 1: SENSOR READING (ALWAYS RUNNING)
    // ============================================================
    if (now - lastSensorRead >= TELEMETRY_INTERVAL_MS) {
        // Read all sensors (NEVER skip, regardless of network)
        JsonDocument telemetry = readAllSensors();
        
        // Try to add to RAM buffer
        String json;
        serializeJson(telemetry, json);
        
        if (!dataBuffer.add(json)) {
            // Buffer full - save to SD if available
            if (sdAvailable) {
                saveToSD(telemetry);
                Serial.println("[SENSOR] RAM full, saved to SD");
            } else {
                Serial.println("[SENSOR] WARNING: Data lost (RAM full, no SD)");
            }
        } else {
            Serial.printf("[SENSOR] Data buffered (%d/%d)\n", 
                          dataBuffer.size(), dataBuffer.capacity());
        }
        
        lastSensorRead = now;
    }
    
    // ============================================================
    // SERVICE 2: NETWORK MANAGEMENT
    // ============================================================
    if (now - lastNetworkCheck >= 1000) {
        connectionManager.loop();  // State machine
        lastNetworkCheck = now;
    }
    
    // ============================================================
    // SERVICE 3: DATA SYNC (ONLY WHEN CONNECTED)
    // ============================================================
    if (connectionManager.isFullyConnected() && 
        now - lastSync >= SYNC_RATE_LIMIT_MS) {
        
        // Priority 1: Send from RAM buffer
        if (dataBuffer.hasData()) {
            TelemetryBuffer item;
            if (dataBuffer.getOldest(item)) {
                if (mqtt.publish(MQTT_TOPIC, item.json)) {
                    dataBuffer.removeOldest();
                    dataBuffer.markAsSent();
                    Serial.println("[SYNC] RAM data sent & removed");
                } else {
                    Serial.println("[SYNC] Send failed, keeping in buffer");
                }
            }
        }
        // Priority 2: Send from SD card (if RAM empty)
        else if (sdAvailable && hasPendingDataOnSD()) {
            syncOldestFileFromSD();
        }
        
        lastSync = now;
    }
}
```

## ✅ Benefits of This Architecture

### **1. Reliability**
- ✅ Sensors never stop collecting data
- ✅ No data loss during network outages
- ✅ Automatic recovery after reconnection

### **2. Separation of Concerns**
- ✅ Sensor reading independent of network
- ✅ Network management doesn't block sensors
- ✅ Data sync is a separate service

### **3. Performance**
- ✅ RAM buffer for fast access (recent data)
- ✅ SD card for large capacity (historical data)
- ✅ Rate limiting prevents network flooding

### **4. Graceful Degradation**
- ✅ Works without network (offline mode)
- ✅ Works without SD card (RAM only)
- ✅ Works with both (full featured)

### **5. Scalability**
- ✅ Easy to add more sensors
- ✅ Easy to change network logic
- ✅ Easy to adjust sync strategy

## 🚀 Next Steps

1. ✅ **DONE**: Created `data_buffer.h` and `data_buffer.cpp`
2. **TODO**: Update `main.cpp` to use new architecture
3. **TODO**: Update `telemetry.cpp` to write to buffer
4. **TODO**: Create `sd_manager.h` for SD operations
5. **TODO**: Update `connection_manager.cpp` for new states
6. **TODO**: Create `data_sync.cpp` for sync logic

**Ready to implement? 🔥**
