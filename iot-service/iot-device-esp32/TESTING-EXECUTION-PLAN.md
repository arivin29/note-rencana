# Testing Execution Plan

## 🎯 Realistic Testing Timeline

Karena testing 7 hari tidak praktis untuk immediate deployment, ini adalah **practical testing plan** dengan prioritas.

---

## 📋 PHASE 1: IMMEDIATE VALIDATION (TODAY - 2 Hours)

### ✅ Quick Health Check

**1. Manual Observation (30 menit)**
```bash
# Monitor serial output
pio device monitor --baud 115200

# Check for:
# - Device boots successfully ✓
# - LTE connects ✓
# - MQTT connects ✓
# - Telemetry publishes ✓
# - No crashes for 30 min ✓
```

**Expected Output:**
```
[LTE] ✅ Connected: IP 10.x.x.x, CSQ 20
[MQTT] ✅ Connected to broker
[Telemetry] ✅ Basic sensors published
[Telemetry] ✅ RS485 data published
```

**2. Check Current Status (10 menit)**
```bash
# Subscribe to telemetry
mosquitto_sub -h YOUR_BROKER -t "iot/DEMO1-00D42390A994/telemetry" -C 1 | jq

# Check kriteria:
# - free_heap > 300KB ✓
# - csq > 10 ✓
# - state = "FULLY_CONNECTED" ✓
# - lte_reconnects < 5 ✓
# - mqtt_reconnects < 5 ✓
```

**3. Basic Functionality Test (30 menit)**
```bash
# Test relay control
mosquitto_pub -h YOUR_BROKER \
  -t "iot/DEMO1-00D42390A994/command" \
  -m '{"command":"relay","action":"on","relay":1}'

# Wait 5 seconds, then OFF
mosquitto_pub -h YOUR_BROKER \
  -t "iot/DEMO1-00D42390A994/command" \
  -m '{"command":"relay","action":"off","relay":1}'

# Verify: Check relay actually switched
```

**4. Data Accuracy Spot Check (30 menit)**
```bash
# Monitor RS485 data
mosquitto_sub -h YOUR_BROKER \
  -t "iot/DEMO1-00D42390A994/rs485" -C 1 | jq '.sensors'

# Manual verification:
# - Compare voltage/current with reference meter
# - Check if values are reasonable
# - Verify units are correct
# - No NaN or invalid values
```

**DECISION POINT:**
- ✅ All checks pass → Continue to Phase 2
- ❌ Any critical issue → Fix first, restart Phase 1

---

## 📋 PHASE 2: SHORT STABILITY TEST (2-4 Hours)

### ✅ Mini Stability Test

**1. Run Monitoring Script (4 hours minimum)**
```bash
# Modified command for shorter test
./test_production.sh DEMO1-00D42390A994 4
```

**What to Monitor:**
- ✅ No crashes during 4 hours
- ✅ Free heap stays > 300KB
- ✅ Uptime increases continuously
- ✅ Reconnects < 3 during period
- ✅ Telemetry publishes every 30s

**2. Manual Checks Every Hour:**
```bash
# Check device status
mosquitto_sub -h YOUR_BROKER -t "iot/+/telemetry" -C 1 | jq '.node'

# Log the values:
# Hour 1: free_heap = _______ KB
# Hour 2: free_heap = _______ KB
# Hour 3: free_heap = _______ KB
# Hour 4: free_heap = _______ KB
```

**Memory Leak Detection:**
If free_heap drops > 20KB between checks → **Possible memory leak!**

**3. Stress Test (Optional - 30 min)**
```bash
# Rapidly send commands to test stability
for i in {1..100}; do
  mosquitto_pub -h YOUR_BROKER \
    -t "iot/DEMO1-00D42390A994/command" \
    -m '{"command":"relay","action":"toggle","relay":1}'
  sleep 1
done

# Check if device still stable after
```

**DECISION POINT:**
- ✅ 4 hours stable, no memory drop → **Good enough for pilot**
- ⚠️ Small issues but recovers → **Acceptable for controlled pilot**
- ❌ Crashes or memory leak → **Fix required**

---

## 📋 PHASE 3: PILOT DEPLOYMENT (Week 1)

### ✅ Deploy to 1-3 Devices in Real Environment

**Setup:**
1. **Device 1**: Main test device (your current one)
2. **Device 2**: Second location (if available)
3. **Device 3**: Third location (if available)

**Daily Monitoring Checklist:**

**Day 1-7: Daily Check (10 min/day)**
```bash
# Morning check
mosquitto_sub -h YOUR_BROKER -t "iot/+/telemetry" -C 3

# Record in spreadsheet:
# - Device ID
# - Uptime (should increase daily)
# - Free heap (should be stable)
# - CSQ (signal quality)
# - Reconnects (should be low)
# - Any errors/issues
```

**Weekly Summary Template:**
```
DEVICE: DEMO1-00D42390A994
Week 1 Summary:
- Total uptime: ___ hours / 168 hours (___%)
- Restarts: ___ times
- Free heap start: ___ KB
- Free heap end: ___ KB (change: ___ KB)
- LTE reconnects: ___ times
- MQTT reconnects: ___ times
- Data accuracy: OK / Issues: ___
- Critical issues: ___
```

---

## 📋 PHASE 4: EXTENDED TESTING (Week 2-3) - OPTIONAL

### ✅ Longer Term Validation

Only if you need high confidence before large rollout:

**1. Continue Pilot Monitoring**
- Keep 1-3 devices running
- Check 2x per week instead of daily
- Look for patterns over time

**2. Add More Devices Gradually**
- Week 2: Add 5 more devices
- Week 3: Add 10 more devices
- Monitor for scaling issues

**3. Full 7-Day Stability Test**
```bash
# Run full test on 1 stable device
./test_production.sh DEMO1-00D42390A994 168

# This is intensive - only if needed
```

---

## 🚀 PRACTICAL TESTING APPROACH

### **Recommended Path for Most Projects:**

```
TODAY (2h):
└─ Phase 1: Quick validation
   └─ ✅ Pass → Continue

THIS WEEK (1 day):
└─ Phase 2: 4-hour stability
   └─ ✅ Pass → Pilot deployment

WEEK 1:
└─ Phase 3: 1-3 devices pilot
   └─ Monitor daily, fix issues
   └─ ✅ No critical issues → Expand

WEEK 2-3:
└─ Gradual rollout: 5-10-20-50 devices
   └─ Monitor for patterns
   └─ ✅ Stable → Full production

ONGOING:
└─ Continue monitoring
└─ Plan updates/improvements
```

---

## 💡 SPECIFIC TEST PROCEDURES

### 🔋 **Power Cycle Test** (20x)

**Manual Procedure:**
```bash
# Test 1: Soft restart via reset button
# - Press reset button 5 times
# - Each time, verify device boots and connects
# - Time to connect should be < 60s

# Test 2: Hard power cycle
# - Unplug power, wait 5s, plug back
# - Repeat 10 times
# - Check: No data corruption, SD card OK

# Test 3: Brownout simulation (if possible)
# - Reduce voltage slowly to ~3.0V
# - Device should handle gracefully
# - Or shutdown without corruption
```

**Automated (using smart plug with MQTT - if available):**
```python
# power_cycle_test.py
for i in range(20):
    print(f"Cycle {i+1}/20")
    turn_off_smart_plug()
    sleep(5)
    turn_on_smart_plug()
    sleep(60)  # Wait for boot
    verify_device_online()
```

### 🔍 **Memory Leak Detection**

**Method 1: Trending (Recommended)**
```bash
# Collect data every 5 minutes for 4 hours
for i in {1..48}; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  HEAP=$(mosquitto_sub -h YOUR_BROKER \
    -t "iot/DEMO1-00D42390A994/telemetry" -C 1 | \
    jq -r '.node.free_heap')
  
  echo "$TIMESTAMP,$HEAP" >> heap_monitor.csv
  sleep 300
done

# Plot in Excel or:
# python3 -c "import pandas as pd; import matplotlib.pyplot as plt; \
#   df=pd.read_csv('heap_monitor.csv', names=['time','heap']); \
#   df.plot(x='time', y='heap'); plt.savefig('heap_trend.png')"
```

**Expected Result:**
- Heap should be flat (±10KB variation)
- No downward trend
- If drops >50KB over 4h → **MEMORY LEAK**

### 📡 **Real-World Signal Test**

**Procedure:**
```bash
# Test different locations in your facility
# 1. Good signal area (CSQ > 20)
# 2. Medium signal area (CSQ 10-20)
# 3. Poor signal area (CSQ < 10)

# At each location, run for 1 hour and check:
# - Does device stay connected?
# - Reconnect count?
# - Telemetry delivery success rate?

# Document:
Location 1 (Good):   CSQ: 25, Reconnects: 0, Success: 100%
Location 2 (Medium): CSQ: 15, Reconnects: 2, Success: 98%
Location 3 (Poor):   CSQ: 8,  Reconnects: 10, Success: 85%
```

### 📊 **Data Accuracy Validation**

**Procedure:**
```bash
# Compare RS485 readings with reference meter

# 1. Record reference meter values (manual)
Reference Voltage L1: 220.5 V
Reference Current L1: 5.23 A
Reference Power: 1152 W

# 2. Get device readings
mosquitto_sub -h YOUR_BROKER \
  -t "iot/DEMO1-00D42390A994/rs485" -C 1 | \
  jq '.sensors.rs485_addr_1.data'

# 3. Calculate error percentage
# Error = |Device - Reference| / Reference × 100%

# 4. Document:
Parameter    | Reference | Device | Error | Status
-------------|-----------|--------|-------|--------
Voltage L1   | 220.5 V   | 221.0V | 0.2%  | ✅ OK
Current L1   | 5.23 A    | 5.28 A | 1.0%  | ✅ OK
Power        | 1152 W    | 1165 W | 1.1%  | ✅ OK

# Acceptance: Error < 2% for energy meters
```

### 🔄 **Multiple Device Testing**

**If you have 2+ devices:**
```bash
# Test 1: Simultaneous operation
# - Run all devices at same time
# - Check MQTT broker load
# - Verify no message collision

# Test 2: Different configs
# - Device 1: RS485 address 1,2
# - Device 2: RS485 address 3,4
# - Verify no crosstalk

# Test 3: Network load
# - All devices publish at same time
# - Check if broker handles load
# - Monitor network bandwidth
```

---

## 📝 TESTING CHECKLIST

### **Before Pilot Deployment:**

**Critical (MUST PASS):**
- [ ] Device boots reliably (100% success in 10 tries)
- [ ] Connects to LTE and MQTT (100% success)
- [ ] No crashes in 4-hour test
- [ ] No memory leak detected
- [ ] Relay control works
- [ ] RS485 data accurate (±2%)

**Important (SHOULD PASS):**
- [ ] Free heap > 250KB throughout
- [ ] CSQ > 10 in deployment location
- [ ] Reconnect time < 5 minutes
- [ ] Power cycle test passed (20x)
- [ ] Commands respond < 5 seconds

**Nice to Have:**
- [ ] 7-day stability test completed
- [ ] Multiple devices tested
- [ ] Poor signal test passed
- [ ] Stress test passed

---

## 🎯 QUICK START - DO THIS NOW

**Step 1: Immediate Check (5 minutes)**
```bash
# Open 2 terminals

# Terminal 1: Monitor device
cd ~/Documents/DEVETEK/pra-project/iot-service/iot-device-esp32
pio device monitor --baud 115200

# Terminal 2: Monitor MQTT (update YOUR_BROKER)
mosquitto_sub -h YOUR_BROKER -t "iot/#" -v

# Watch for:
# - Device publishes telemetry ✓
# - No error messages ✓
# - Free heap > 300KB ✓
```

**Step 2: Record Baseline (now)**
```bash
# Capture current status
mosquitto_sub -h YOUR_BROKER \
  -t "iot/DEMO1-00D42390A994/telemetry" -C 1 | \
  jq '{device_id, timestamp, free_heap: .node.free_heap, uptime: .node.uptime_s, csq: .node.lte.csq}' \
  > baseline_$(date +%Y%m%d_%H%M%S).json

# This is your starting point
```

**Step 3: Run 4-Hour Test (start now)**
```bash
# Update broker in script first
nano test_production.sh
# Change: MQTT_BROKER="YOUR_BROKER_HERE"

# Run 4-hour test
./test_production.sh DEMO1-00D42390A994 4

# Let it run in background, check back in 4 hours
```

---

## 📞 DECISION TIME

**After 4-hour test, decide:**

### ✅ **Results Good** (Pass all critical checks)
→ **Deploy to pilot** (1-3 devices) immediately  
→ Monitor for 1 week  
→ If stable, expand to 10-20 devices

### ⚠️ **Minor Issues** (Most checks pass)
→ **Limited pilot** (1 device only)  
→ Monitor closely  
→ Fix issues found  
→ Retest before expanding

### ❌ **Critical Issues** (Crashes, memory leak, data errors)
→ **DO NOT DEPLOY**  
→ Fix issues first  
→ Restart testing from Phase 1

---

**Current Recommendation:**

Firmware terlihat solid berdasarkan code review. Saya predict kamu akan **pass Phase 1 & 2** dengan mudah. 

**Suggest:**
1. ✅ Do Phase 1 NOW (2 hours) - validate basic functionality
2. ✅ Run Phase 2 TODAY (4 hours) - detect any obvious issues
3. ✅ Deploy pilot NEXT WEEK (1-3 devices) - real-world validation
4. ✅ Expand gradually based on pilot results

**No need for full 7-day test** kecuali kamu deploy ke critical infrastructure atau >100 devices sekaligus.

Mau saya bantu setup dan run Phase 1 sekarang? 🚀
