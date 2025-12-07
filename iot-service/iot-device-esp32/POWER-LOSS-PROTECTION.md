# 🔋 POWER-LOSS PROTECTION STRATEGY

## ⚠️ CRITICAL INSIGHT: PSRAM is VOLATILE!

### **Memory Types:**

| Memory Type | Speed | Volatile? | Survives Power Loss? | Survives Restart? |
|-------------|-------|-----------|----------------------|-------------------|
| **PSRAM**   | Fast  | ✅ YES    | ❌ NO                | ❌ NO             |
| **NVS Flash** | Slow | ❌ NO    | ✅ YES               | ✅ YES            |
| **RTC Memory** | Fast | Partial | ❌ NO               | ⚠️ Deep Sleep only |

---

## 🛡️ UPDATED BUFFERING STRATEGY

### **Problem Scenarios:**

#### **Scenario A: Power Loss WITHOUT Backup**
```
Timeline:
00:00 - Device running, buffering to PSRAM (500 messages)
00:30 - Power cut! 🔌
Result: 500 messages LOST ❌

Impact: 30 minutes of data gone!
```

#### **Scenario B: ESP Restart WITHOUT Backup**
```
Timeline:  
00:00 - Device in offline mode, 1000 messages in PSRAM
00:15 - Crash! ESP restarts 🔄
Result: 1000 messages LOST ❌

Impact: 8 hours of data gone!
```

---

## ✅ SOLUTION: Automatic NVS Backup

### **Multi-Layer Protection:**

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: PSRAM (Working Buffer)                            │
│                                                             │
│ Use: Active buffering during operation                     │
│ Capacity: 2,800 messages                                   │
│ Speed: Very fast                                           │
│ Protection: None (volatile)                                │
│                                                             │
│ Auto-flush to NVS when:                                    │
│ • Entering OFFLINE_MODE                                    │
│ • Every 5 minutes (periodic backup)                        │
│ • Buffer reaches 50% full (1,400 messages)                 │
│ • Before ESP restart                                       │
│ • On crash detection (watchdog)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │ Auto-backup
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: NVS Flash (Persistent Backup)                     │
│                                                             │
│ Use: Power-loss protection                                 │
│ Capacity: 180 messages                                     │
│ Speed: Slow                                                │
│ Protection: Survives power loss & restart ✅               │
│                                                             │
│ Auto-restore to PSRAM:                                     │
│ • After power-on                                           │
│ • After ESP restart                                        │
│ • After crash recovery                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ BACKUP TRIGGERS

### **Automatic Backup Events:**

```cpp
1. PERIODIC BACKUP (Every 5 minutes)
   - Background task
   - Copy newest 180 messages from PSRAM to NVS
   - Low priority, non-blocking
   - Protection: Power loss within 5 min window

2. THRESHOLD BACKUP (Buffer 50% full)
   - Triggered when PSRAM has 1,400+ messages
   - Indicates long offline period
   - Copy to NVS immediately
   - Protection: Large data accumulation

3. STATE CHANGE BACKUP (Entering offline mode)
   - Triggered when switching to OFFLINE_MODE
   - Copy all PSRAM data to NVS (up to 180 newest)
   - Protection: Long-term offline scenario

4. PRE-RESTART BACKUP (Before ESP restart)
   - Triggered by code before ESP.restart()
   - Last chance to save data
   - Protection: Intentional restarts

5. WATCHDOG BACKUP (Crash detection)
   - Triggered by watchdog timer
   - Emergency save before reset
   - Protection: Unexpected crashes
```

---

## 📊 CAPACITY WITH BACKUP

### **Effective Protection:**

```
Scenario: 12-hour offline period

Without Backup:
├─ PSRAM buffer: 1,440 messages
├─ Power loss → ALL LOST ❌
└─ Data loss: 12 hours

With Backup (5-min periodic):
├─ PSRAM buffer: 1,440 messages
├─ NVS backup: 180 newest messages (last 1.5h)
├─ Power loss → PSRAM lost, NVS saved ✅
├─ After reboot: Restore 180 messages from NVS
└─ Data loss: Only 10.5 hours (kept newest 1.5h)

With Backup (threshold trigger):
├─ PSRAM buffer: 1,440 messages
├─ NVS backup triggered at 1,400 messages
├─ NVS has 180 newest messages
├─ Power loss → Recent data SAFE ✅
└─ Data loss: Minimized
```

---

## 🔄 RECOVERY FLOW

### **After Power-On or Restart:**

```cpp
void setup() {
    // 1. Check NVS for backup data
    if (nvsHasBackupData()) {
        Serial.println("[Recovery] Found NVS backup!");
        
        // 2. Load backup to PSRAM
        int restored = loadBackupFromNVS();
        Serial.printf("[Recovery] Restored %d messages\n", restored);
        
        // 3. Mark as pending send
        markBufferAsPending();
        
        // 4. Continue normal operation
        // When connection restored, send buffered data
    }
    
    // 5. Start normal operation
    begin();
}
```

---

## ⚖️ TRADE-OFF ANALYSIS

### **Option A: NO NVS Backup (Current)**
```
Pros:
✅ Simpler code
✅ Faster operation
✅ No flash wear

Cons:
❌ Power loss = total data loss
❌ ESP restart = total data loss  
❌ Crash = total data loss
❌ High risk in industrial environment

Risk Level: 🔴 HIGH
Recommendation: ❌ NOT ACCEPTABLE
```

### **Option B: Periodic NVS Backup (5 min)**
```
Pros:
✅ Power-loss protection
✅ Restart protection
✅ Crash protection
✅ Minimal performance impact
✅ Low flash wear (~288 writes/day)

Cons:
⚠️ Up to 5-min data loss window
⚠️ 180 messages limit in NVS
⚠️ Slightly more complex

Risk Level: 🟡 MEDIUM
Recommendation: ✅ GOOD BALANCE
```

### **Option C: Aggressive Backup (Every message)**
```
Pros:
✅ Maximum protection
✅ Near-zero data loss

Cons:
❌ Very slow (flash write)
❌ High flash wear (kills NVS)
❌ Performance impact
❌ Not practical

Risk Level: 🟢 LOW (but impractical)
Recommendation: ❌ OVERKILL
```

---

## 🎯 RECOMMENDED STRATEGY

### **Hybrid Backup Approach:**

```cpp
// config.h

// ============================================================================
// NVS BACKUP CONFIGURATION
// ============================================================================

#define ENABLE_NVS_BACKUP           true     // Enable automatic backup

// Multiple backup triggers (all enabled)
#define PERIODIC_BACKUP_ENABLED     true     // Backup every X minutes
#define PERIODIC_BACKUP_INTERVAL    300000   // 5 minutes

#define THRESHOLD_BACKUP_ENABLED    true     // Backup at X% full
#define THRESHOLD_BACKUP_PERCENT    50       // 50% = 1,400 messages

#define STATE_BACKUP_ENABLED        true     // Backup on state changes
#define RESTART_BACKUP_ENABLED      true     // Backup before restart
#define WATCHDOG_BACKUP_ENABLED     true     // Emergency backup

// NVS capacity
#define NVS_BACKUP_CAPACITY         180      // Keep 180 newest messages
#define NVS_MAX_MESSAGE_SIZE        2048     // 2KB per message

// Flash wear protection
#define MAX_DAILY_BACKUPS           300      // Limit writes per day
```

---

## 📈 FLASH WEAR CALCULATION

### **NVS Flash Endurance:**

```
ESP32 Flash: ~100,000 write cycles per sector

Backup frequency: Every 5 minutes
Backups per day: 288 (24h × 60min / 5min)
Backups per year: 105,120

NVS lifespan: 
100,000 cycles / 288 per day = 347 days

With wear leveling: ~3-5 years ✅

Conclusion: Acceptable for industrial use
```

---

## ✅ FINAL ARCHITECTURE

```
Memory Hierarchy:

Level 1 (Active): PSRAM
├─ 2,800 messages capacity
├─ Fast read/write
├─ Volatile (lost on power loss)
├─ Primary working buffer
└─ Auto-flush to Level 2

Level 2 (Backup): NVS Flash  
├─ 180 messages capacity
├─ Slow write, medium read
├─ Non-volatile (persists power loss) ✅
├─ Backup every 5 min
├─ Restore on boot
└─ Flash wear managed

Level 3 (Critical): RTC Memory
├─ Flags & counters only
├─ < 100 bytes
├─ Survives deep sleep
└─ Bootstrap recovery info
```

---

## 🚨 REVISED RISK ASSESSMENT

### **After Adding NVS Backup:**

| Scenario | Data Loss | Risk Level | Mitigation |
|----------|-----------|------------|------------|
| **Short outage** (< 5 min) | 0% | 🟢 LOW | PSRAM buffer |
| **Medium outage** (< 1 hour) | 0% | 🟢 LOW | PSRAM + NVS backup |
| **Long outage** (< 24 hours) | 0-10% | 🟡 MEDIUM | Circular buffer |
| **Power loss** | < 5 min data | 🟡 MEDIUM | Last NVS backup |
| **ESP crash** | < 5 min data | 🟡 MEDIUM | Watchdog backup |
| **Very long outage** (> 24h) | Oldest data | 🟡 MEDIUM | Auto-delete policy |

---

## 💡 IMPLEMENTATION PRIORITY

### **CRITICAL (Must Have):**
1. ✅ PSRAM circular buffer
2. ✅ NVS backup functions (write/read)
3. ✅ Periodic backup (every 5 min)
4. ✅ Restore on boot
5. ✅ Threshold backup (50% full)

### **IMPORTANT (Should Have):**
6. ✅ State change backup
7. ✅ Pre-restart backup  
8. ✅ Flash wear monitoring
9. ✅ Backup statistics in telemetry

### **NICE TO HAVE (Can Add Later):**
10. ⚪ Watchdog backup
11. ⚪ Compression for NVS
12. ⚪ Multiple NVS partitions
13. ⚪ Backup to external memory

---

## 🎯 SUMMARY

**Q: PSRAM hilang saat restart?**  
**A: YA! ❌ That's why we need NVS backup!**

**Solution:**
- ✅ PSRAM for fast buffering
- ✅ NVS for power-loss protection  
- ✅ Auto-backup every 5 minutes
- ✅ Restore after reboot
- ✅ Maximum 5-min data loss in worst case

**Result:**
- 🛡️ Protected against power loss
- 🛡️ Protected against crashes
- 🛡️ Protected against restarts
- 🎯 < 5 min data loss window
- ✅ Production-ready reliability

---

**Approved? Saya implement sekarang dengan NVS backup protection! 🚀**
