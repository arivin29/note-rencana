# 🎯 FINAL STRATEGY - SD Card Based Buffering

## 📋 REQUIREMENTS SUMMARY

### **Hardware:**
- ✅ SD Card (Micro SD TF Slot)
- ✅ ESP32S3 with 8MB PSRAM
- ✅ SIM7600CE LTE Module

### **Key Requirements:**
1. ✅ Use SD Card for data buffering
2. ✅ Max 80% of SD card space
3. ✅ Sensor reading continues ALWAYS (even offline)
4. ✅ Retry logic: Max 10 attempts before offline
5. ✅ Offline mode: Retry modem restart every 10 minutes
6. ✅ Auto ESP restart after 3 offline cycles
7. ✅ Sync all SD data when connected
8. ✅ Delete data after successful send
9. ✅ All parameters configurable (no hardcoding)

---

## 🔄 STATE MACHINE DESIGN

```
┌─────────────────────────────────────────────────────────────┐
│ FULLY_CONNECTED                                             │
│                                                             │
│ Actions:                                                    │
│ • Read sensors every 30s                                    │
│ • Send telemetry immediately to MQTT                        │
│ • Check SD card for pending data                            │
│ • If pending data exists: Sync to MQTT (1 msg/5s)          │
│ • Delete from SD after successful send                      │
│ • Update connection success timestamp                       │
│                                                             │
│ Transition: LTE/MQTT connection lost                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ RETRY_MODE (Attempt 1-10)                                   │
│                                                             │
│ Actions:                                                    │
│ • Continue reading sensors every 30s                        │
│ • Write telemetry to SD card (timestamp + data)             │
│ • Retry LTE connection every 30s                            │
│ • Counter: attemptCount (1-10)                              │
│ • LED: Fast blink (optional)                                │
│                                                             │
│ Success: Connection restored → FULLY_CONNECTED              │
│ Failure: attemptCount reaches 10 → OFFLINE_MODE            │
└────────────────────┬────────────────────────────────────────┘
                     │ After 10 failures
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ OFFLINE_MODE (Cycle 1-3)                                    │
│                                                             │
│ Actions:                                                    │
│ • Continue reading sensors every 30s                        │
│ • Write telemetry to SD card                                │
│ • Wait 10 minutes                                           │
│ • Attempt modem hard restart                                │
│ • After restart: Try connection (like RETRY_MODE)           │
│ • Counter: offlineCycleCount (1-3)                          │
│ • LED: Slow blink (optional)                                │
│                                                             │
│ Success: Connection restored → FULLY_CONNECTED              │
│ Failure: Try again after 10 min                             │
│ Max cycles: After 3 offline cycles → ESP_RESTART           │
└────────────────────┬────────────────────────────────────────┘
                     │ After 3 offline cycles
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ESP_RESTART                                                 │
│                                                             │
│ Actions:                                                    │
│ • Log restart reason to SD card                             │
│ • Save current state to SD card                             │
│ • Perform ESP32 restart                                     │
│ • After boot: Load state, continue operation                │
│                                                             │
│ Next: Back to RETRY_MODE → Try connection again            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 DETAILED STATE BEHAVIORS

### **STATE 1: FULLY_CONNECTED**

```cpp
Conditions:
- LTE connected ✅
- MQTT connected ✅
- Can send data ✅

Actions (every loop):
1. Check if time to read sensors (30s interval)
   → If yes: Read all sensors
   
2. Check if SD has pending data
   → If yes: Send oldest message from SD (rate: 1 msg/5s)
   → If send success: Delete from SD
   → If send fail: Keep in SD, retry later
   
3. If no pending SD data: Send current sensor data
   → If send success: Don't save to SD
   → If send fail: Save to SD, increment fail counter
   
4. Monitor connection health
   → If LTE drops: Transition to RETRY_MODE
   → If MQTT drops: Transition to RETRY_MODE

Telemetry includes:
- All sensor data
- node.connection.state = "FULLY_CONNECTED"
- node.sd_card.pending_messages = X
- node.sd_card.usage_percent = Y
```

---

### **STATE 2: RETRY_MODE**

```cpp
Entry Conditions:
- LTE lost OR MQTT lost
- attemptCount = 0

State Variables:
- attemptCount: 0-10
- lastRetryTime: timestamp
- retryInterval: 30000ms (configurable)

Actions (every loop):
1. ALWAYS read sensors every 30s
   → Save ALL telemetry to SD card
   → Format: /data/YYYYMMDD/HHMMSS_deviceid.json
   
2. Check if time to retry (every 30s)
   → Attempt LTE reconnection
   → If success: Transition to FULLY_CONNECTED
   → If fail: Increment attemptCount
   
3. If attemptCount reaches 10:
   → Transition to OFFLINE_MODE
   → Reset attemptCount = 0
   → Increment offlineCycleCount

Telemetry (saved to SD):
- All sensor data
- node.connection.state = "RETRY_MODE"
- node.connection.attempt = X/10
- node.connection.next_retry_in = Y seconds

Exit Conditions:
- Success: LTE+MQTT connected → FULLY_CONNECTED
- Failure: attemptCount >= 10 → OFFLINE_MODE
```

---

### **STATE 3: OFFLINE_MODE**

```cpp
Entry Conditions:
- Failed 10 retry attempts
- offlineCycleCount < 3

State Variables:
- offlineCycleCount: 1-3
- lastModemRestartTime: timestamp
- offlineInterval: 600000ms (10 min, configurable)
- modemRestartAttempt: 0-3

Actions (every loop):
1. ALWAYS read sensors every 30s
   → Save ALL telemetry to SD card
   → Same format as RETRY_MODE
   
2. Check if 10 minutes elapsed since last modem restart
   → If yes:
      a. Perform modem hard restart (power cycle)
      b. Wait for modem boot (~20s)
      c. Try LTE connection (like RETRY_MODE, but 10 attempts)
      d. If success: Transition to FULLY_CONNECTED
      e. If fail: Wait another 10 minutes
      f. Increment modemRestartAttempt
   
3. Track offline cycle:
   → Each cycle = 10 min wait + 10 retry attempts
   → After each failed cycle: Increment offlineCycleCount
   → If offlineCycleCount reaches 3: Transition to ESP_RESTART

Telemetry (saved to SD):
- All sensor data
- node.connection.state = "OFFLINE_MODE"
- node.connection.offline_cycle = X/3
- node.connection.next_modem_restart_in = Y minutes
- node.connection.modem_restart_attempts = Z

Exit Conditions:
- Success: Connection restored → FULLY_CONNECTED
- Failure: offlineCycleCount >= 3 → ESP_RESTART
```

---

### **STATE 4: ESP_RESTART**

```cpp
Entry Conditions:
- Failed 3 offline cycles
- Total time offline: ~40-50 minutes

Actions (one-time):
1. Write restart log to SD card
   → File: /logs/restart_TIMESTAMP.txt
   → Content: 
      - Restart reason: "MAX_OFFLINE_CYCLES_REACHED"
      - Total offline time
      - Last known state
      - SD card statistics
      
2. Save persistent counters to SD
   → File: /system/counters.json
   → Content:
      - totalRestarts
      - totalOfflineCycles
      - lastRestartTimestamp
      
3. Perform ESP32 restart
   → ESP.restart()

After Boot:
1. Load counters from SD
2. Check for pending data
3. Start fresh connection attempt
4. Go to RETRY_MODE
```

---

## 💾 SD CARD STRUCTURE

```
/sdcard/
├── data/                          # Telemetry data
│   ├── 20251207/                  # Date folders
│   │   ├── 100530_DEMO1.json     # Timestamp_DeviceID
│   │   ├── 100600_DEMO1.json
│   │   └── ...
│   ├── 20251208/
│   └── ...
│
├── logs/                          # System logs
│   ├── restart_20251207_103045.txt
│   ├── error_20251207_150230.txt
│   └── ...
│
├── system/                        # System files
│   ├── counters.json             # Persistent counters
│   ├── config.json               # Runtime config
│   └── status.json               # Last known state
│
└── archive/                       # Sent data (optional)
    └── 20251207/
        └── sent_data.json        # Backup of sent data
```

### **File Naming Convention:**
```
Telemetry: HHMMSS_DEVICEID.json
Logs: TYPE_YYYYMMDD_HHMMSS.txt
System: name.json
```

---

## 🎛️ CONFIGURATION FILE

### **config.json (on SD Card):**

```json
{
  "version": "1.0",
  "device": {
    "id": "DEMO1-00D42390A994",
    "firmware": "esp32s3-multisensor-v2.1"
  },
  
  "telemetry": {
    "interval_ms": 30000,
    "enable_realtime": true,
    "enable_buffering": true
  },
  
  "connection": {
    "retry_mode": {
      "max_attempts": 10,
      "retry_interval_ms": 30000,
      "enable": true
    },
    
    "offline_mode": {
      "max_cycles": 3,
      "modem_restart_interval_ms": 600000,
      "retry_attempts_per_cycle": 10,
      "enable": true
    },
    
    "esp_restart": {
      "enable": true,
      "after_offline_cycles": 3
    }
  },
  
  "sd_card": {
    "max_usage_percent": 80,
    "auto_cleanup": true,
    "delete_after_send": true,
    "archive_sent_data": false,
    "data_retention_days": 7
  },
  
  "sync": {
    "enable": true,
    "rate_limit_ms": 5000,
    "max_burst": 10,
    "priority": "oldest_first"
  },
  
  "logging": {
    "enable": true,
    "log_level": "INFO",
    "max_log_files": 100
  }
}
```

---

## 📈 SD CARD MANAGEMENT

### **Space Management:**

```cpp
Actions:
1. Check SD card usage every 1 minute
2. If usage > 80%:
   → Delete oldest data files (by date folder)
   → Delete old log files (keep last 100)
   → Continue until usage < 70%
   
3. Calculate capacity:
   SD Size: 4GB (example)
   Max usage: 80% = 3.2GB
   Message size: 2KB
   Capacity: 3.2GB / 2KB = 1,600,000 messages!
   
4. At 30s interval:
   1,600,000 messages = 48,000,000 seconds = 555 days! 
   
Conclusion: SD card can hold MONTHS of data! ✅
```

### **Data Cleanup Strategy:**

```cpp
Priority (delete in this order):
1. Successfully sent & archived data (oldest first)
2. Data older than retention period (7 days default)
3. Corrupted/incomplete files
4. Old log files (keep last 100)

Never delete:
- Unsent telemetry data
- Recent data (< 24 hours)
- System files (counters, config)
```

---

## 🔄 DATA SYNC FLOW

### **When Connection Restored:**

```cpp
Sync Process:
1. Scan /data/ folder for all unsent files
2. Sort by timestamp (oldest first)
3. For each file:
   a. Read JSON from SD
   b. Send to MQTT
   c. Wait for publish confirmation
   d. If success: Delete file
   e. If fail: Keep file, try next time
   f. Rate limit: 1 message per 5 seconds
   
4. Continue until:
   - All files sent ✅
   - OR connection lost ❌
   - OR max burst reached (10 messages)
   
5. If max burst: Pause 30s, continue syncing
```

### **Sync Statistics in Telemetry:**

```json
"node": {
  "sd_card": {
    "total_files": 1250,
    "pending_files": 320,
    "syncing": true,
    "sync_rate": "1 msg/5s",
    "estimated_sync_time": "27 minutes",
    "usage_mb": 650,
    "usage_percent": 15.8,
    "status": "healthy"
  }
}
```

---

## ⚙️ CONFIGURABLE PARAMETERS

### **All parameters in config.json:**

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `telemetry.interval_ms` | 30000 | 10000-300000 | Sensor read interval |
| `retry_mode.max_attempts` | 10 | 5-20 | Max retry before offline |
| `retry_mode.retry_interval_ms` | 30000 | 10000-120000 | Time between retries |
| `offline_mode.max_cycles` | 3 | 1-10 | Max offline cycles before restart |
| `offline_mode.modem_restart_interval_ms` | 600000 | 300000-1800000 | Time between modem restarts |
| `offline_mode.retry_attempts_per_cycle` | 10 | 5-20 | Retries per offline cycle |
| `sd_card.max_usage_percent` | 80 | 50-95 | Max SD usage threshold |
| `sd_card.data_retention_days` | 7 | 1-30 | Auto-delete after days |
| `sync.rate_limit_ms` | 5000 | 1000-30000 | Time between sync messages |
| `sync.max_burst` | 10 | 5-100 | Max messages before pause |

### **Runtime Configuration:**

```cpp
// Config can be updated via:
1. SD card file edit (config.json)
2. MQTT command (update config remotely)
3. Serial command (debugging)

// Device reloads config:
- On boot
- On MQTT command
- Every 5 minutes (hot reload)
```

---

## 🎯 TIMING BREAKDOWN

### **Scenario: Total Connection Loss**

```
Timeline:

00:00 - Connection lost
00:00-05:00 - RETRY_MODE (10 attempts × 30s)
   Actions: Read sensors, save to SD, retry connection
   Duration: 5 minutes
   Status: Trying to recover

05:00 - Enter OFFLINE_MODE (Cycle 1)
05:00-15:00 - Wait 10 min, restart modem, retry 10x
   Actions: Continue sensors, modem restart, retry
   Duration: 10 minutes
   Status: Offline cycle 1/3

15:00 - Still failed, OFFLINE_MODE (Cycle 2)
15:00-25:00 - Wait 10 min, restart modem, retry 10x
   Duration: 10 minutes
   Status: Offline cycle 2/3

25:00 - Still failed, OFFLINE_MODE (Cycle 3)
25:00-35:00 - Wait 10 min, restart modem, retry 10x
   Duration: 10 minutes
   Status: Offline cycle 3/3

35:00 - Max cycles reached
35:01 - ESP RESTART
35:01-36:00 - Reboot, start fresh attempts
   Actions: ESP restarts, tries again
   
Total offline before ESP restart: ~35-40 minutes
```

---

## 📊 STATISTICS & MONITORING

### **Track in telemetry:**

```json
"node": {
  "connection": {
    "state": "OFFLINE_MODE",
    "retry_count": 8,
    "offline_cycle": 2,
    "total_reconnects": 145,
    "total_restarts": 3,
    "uptime_s": 85400,
    "last_success": "2025-12-07 10:30:15",
    "offline_duration_s": 1820
  },
  
  "sd_card": {
    "mounted": true,
    "total_mb": 3980,
    "used_mb": 650,
    "free_mb": 3330,
    "usage_percent": 16.3,
    "pending_files": 320,
    "oldest_data": "2025-12-07 09:15:00"
  },
  
  "modem": {
    "restart_count": 12,
    "last_restart": "2025-12-07 10:55:00",
    "model": "SIM7600CE",
    "firmware": "SIM7600M11_NA_V1.1"
  }
}
```

---

## ✅ IMPLEMENTATION TASKS

### **PHASE 1: SD Card Management (Week 1)**
- [ ] Task 1.1: SD card initialization & mount check
- [ ] Task 1.2: Create folder structure (/data, /logs, /system)
- [ ] Task 1.3: Implement write telemetry to SD
- [ ] Task 1.4: Implement read telemetry from SD
- [ ] Task 1.5: Implement delete file after send
- [ ] Task 1.6: SD usage monitoring (80% check)
- [ ] Task 1.7: Auto-cleanup old data

### **PHASE 2: Configuration System (Week 1)**
- [ ] Task 2.1: Create config.json structure
- [ ] Task 2.2: Implement config loader (read from SD)
- [ ] Task 2.3: Implement config saver
- [ ] Task 2.4: Config validation & defaults
- [ ] Task 2.5: Runtime config reload
- [ ] Task 2.6: MQTT config update command

### **PHASE 3: State Machine (Week 2)**
- [ ] Task 3.1: Define ConnectionState enum
- [ ] Task 3.2: Implement FULLY_CONNECTED state
- [ ] Task 3.3: Implement RETRY_MODE state
- [ ] Task 3.4: Implement OFFLINE_MODE state
- [ ] Task 3.5: Implement ESP_RESTART logic
- [ ] Task 3.6: State transition logic
- [ ] Task 3.7: State persistence to SD

### **PHASE 4: Sensor Reading Decoupled (Week 2)**
- [ ] Task 4.1: Move sensor reading outside connection check
- [ ] Task 4.2: Always read sensors at interval
- [ ] Task 4.3: Buffer to SD when offline
- [ ] Task 4.4: Send immediately when online

### **PHASE 5: Data Sync Logic (Week 3)**
- [ ] Task 5.1: Scan SD for pending files
- [ ] Task 5.2: Sort by timestamp (oldest first)
- [ ] Task 5.3: Send with rate limiting (1 msg/5s)
- [ ] Task 5.4: Delete after successful send
- [ ] Task 5.5: Handle send failures (retry later)
- [ ] Task 5.6: Burst control (max 10, then pause)

### **PHASE 6: Retry & Offline Logic (Week 3)**
- [ ] Task 6.1: Implement retry counter (max 10)
- [ ] Task 6.2: Implement offline cycle counter (max 3)
- [ ] Task 6.3: Modem restart in offline mode
- [ ] Task 6.4: 10-minute timer between restarts
- [ ] Task 6.5: ESP restart after 3 cycles

### **PHASE 7: Statistics & Monitoring (Week 4)**
- [ ] Task 7.1: Add SD stats to telemetry
- [ ] Task 7.2: Add connection stats to telemetry
- [ ] Task 7.3: Add state info to telemetry
- [ ] Task 7.4: Persistent counters (totalRestarts, etc)
- [ ] Task 7.5: Log important events to SD

### **PHASE 8: Testing (Week 4)**
- [ ] Task 8.1: Test normal operation
- [ ] Task 8.2: Test retry mode (remove SIM)
- [ ] Task 8.3: Test offline mode (long disconnect)
- [ ] Task 8.4: Test ESP restart logic
- [ ] Task 8.5: Test data sync after reconnect
- [ ] Task 8.6: Test SD card full scenario
- [ ] Task 8.7: Test config changes
- [ ] Task 8.8: Test power cycle recovery

---

## 🚀 SUCCESS CRITERIA

### **Must Pass:**
1. ✅ Sensor reading NEVER stops (even when offline)
2. ✅ All data saved to SD during offline
3. ✅ All data synced when connection restored
4. ✅ Data deleted after successful send
5. ✅ SD usage never exceeds 80%
6. ✅ State machine follows design
7. ✅ Config is fully customizable
8. ✅ No data loss for outages < 7 days
9. ✅ Device recovers automatically
10. ✅ ESP restarts after 3 offline cycles

---

## ❓ CONFIRMATION NEEDED

**Strategy Review:**

1. ✅ Retry 10x before offline mode - **OK?**
2. ✅ Wait 10 min between modem restarts - **OK?**
3. ✅ ESP restart after 3 offline cycles (~35-40 min total) - **OK?**
4. ✅ SD card max 80% usage - **OK?**
5. ✅ Sync rate 1 msg/5s - **OK?**
6. ✅ All parameters configurable via config.json - **OK?**

**Jika APPROVED**, saya akan:
1. Buat file structure
2. Implement step-by-step sesuai task list
3. Test setiap phase
4. Document progress

**SIAP LANJUT KE CODING?** 🚀
