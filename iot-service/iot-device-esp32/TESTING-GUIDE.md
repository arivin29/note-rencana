# Production Testing Guide

## 🎯 Overview

Dokumen ini menjelaskan cara menggunakan tools untuk testing production readiness dari ESP32 IoT Device firmware.

---

## 📁 Files

1. **`PRODUCTION-READINESS-CHECKLIST.md`** - Comprehensive checklist untuk production readiness
2. **`test_production.sh`** - Bash script untuk monitoring stability jangka panjang (7 hari)
3. **`test_scenarios.py`** - Python script untuk automated functional testing

---

## 🚀 Quick Start

### Prerequisites

**Untuk Bash Script (`test_production.sh`):**
```bash
# macOS
brew install mosquitto jq

# Ubuntu/Debian
sudo apt-get install mosquitto-clients jq
```

**Untuk Python Script (`test_scenarios.py`):**
```bash
# Install paho-mqtt library
pip3 install paho-mqtt

# Or using requirements
echo "paho-mqtt>=1.6.0" > requirements.txt
pip3 install -r requirements.txt
```

---

## 🧪 Testing Workflow

### Phase 1: Initial Functional Testing (1-2 jam)

Test semua functionality dengan automated tests:

```bash
# Edit script dan sesuaikan MQTT broker
nano test_scenarios.py

# Run automated tests
python3 test_scenarios.py DEMO1-00D42390A994 your-broker.com 1883
```

**Tests yang dijalankan:**
1. ✅ Telemetry Format Validation
2. ✅ Data Accuracy Check
3. ✅ Connection State Monitoring
4. ✅ Relay Control via MQTT
5. ✅ RS485 Config Update

**Expected Results:**
- Semua tests PASS
- Telemetry format sesuai spesifikasi
- Data values dalam range yang wajar
- Relay responding to commands
- Config update applied successfully

---

### Phase 2: Short Stability Test (24 jam)

Monitor device untuk detect early issues:

```bash
# Edit script dan set broker
nano test_production.sh

# Run 24-hour test
./test_production.sh DEMO1-00D42390A994 24
```

**Monitor:**
- ✅ Uptime continuous (no restart)
- ✅ Free heap stable (no leak)
- ✅ Connection stable
- ✅ No unexpected disconnects

**Expected Metrics:**
```
Success Rate: >99%
Memory Warnings: 0-2
Disconnects: 0-1
Free Heap: >250KB throughout
```

---

### Phase 3: Extended Stability Test (7 hari)

Full production readiness test:

```bash
# Run 7-day test (168 hours)
./test_production.sh DEMO1-00D42390A994 168
```

**Critical Metrics:**
```
Uptime: >99%
Memory Leak: None (free heap >200KB after 7 days)
Auto Recovery: All disconnects recovered within 5 min
Publish Success: >99%
```

**What to Monitor:**
1. **Memory**: Check if free_heap decreasing over time
2. **Reconnects**: LTE/MQTT reconnect count should be low
3. **Disconnects**: Should auto-recover within 5 minutes
4. **Data Accuracy**: Spot check RS485 data vs reference meter

---

## 📊 Test Output Examples

### Bash Script Output
```
============================================================================
ESP32 Production Readiness Test
============================================================================
Device ID: DEMO1-00D42390A994
Duration: 168 hours (7 days)
Check Interval: 300s
MQTT Broker: broker.example.com:1883
Log File: production_test_DEMO1-00D42390A994_20251207_100000.log
============================================================================

Starting monitoring... Press Ctrl+C to stop

[2025-12-07 10:05:00] ✅ Uptime: 0d 2h | Heap: 342KB OK | CSQ: 22 GOOD | State: FULLY_CONNECTED
Progress: 0% | Remaining: 168h 0m

[2025-12-07 10:10:00] ✅ Uptime: 0d 2h | Heap: 340KB OK | CSQ: 21 GOOD | State: FULLY_CONNECTED
Progress: 0% | Remaining: 167h 55m
```

### Python Script Output
```
======================================================================
ESP32 IoT Device - Production Readiness Tests
Device ID: DEMO1-00D42390A994
Broker: broker.example.com:1883
Started: 2025-12-07 10:00:00
======================================================================

======================================================================
TEST 1: Relay Control
======================================================================
📤 Sending relay ON command...
📤 Sending relay OFF command...
📤 Sending relay TOGGLE command...
✅ Relay control commands sent successfully

======================================================================
TEST SUMMARY
======================================================================
  ✅ PASS  Telemetry Format
  ✅ PASS  Data Accuracy
  ✅ PASS  Connection State
  ✅ PASS  Relay Control
  ✅ PASS  Rs485 Config Update

Results: 5/5 tests passed (100%)

🎉 ALL TESTS PASSED - Device is ready for next phase!
======================================================================
```

---

## 🔍 Interpreting Results

### ✅ Production Ready Criteria

Device is ready for production jika memenuhi:

1. **Functional Tests**: 5/5 tests passed
2. **24h Stability**: >99% uptime, no memory leak
3. **7-day Stability**: >99% uptime, stable free heap
4. **Auto Recovery**: All disconnects recovered
5. **Data Accuracy**: RS485 data ±1% vs reference

### ⚠️ Warning Signs

Device perlu investigation jika:

1. **Memory Leak**: Free heap turun >50KB per hari
2. **Frequent Reconnects**: >10 reconnects per hari
3. **Low Signal**: CSQ consistently <10
4. **Publish Failures**: >1% publish failure rate
5. **Slow Recovery**: Disconnect recovery >5 minutes

### ❌ Not Ready

Device NOT ready untuk production jika:

1. **Crashes**: Unexpected restart dalam 7 hari
2. **Memory Critical**: Free heap <150KB
3. **Poor Uptime**: <95% uptime
4. **Data Errors**: RS485 data tidak akurat
5. **Command Failure**: Relay tidak respond to MQTT

---

## 🛠️ Troubleshooting

### Issue: "Device offline or no data received"

**Possible Causes:**
- Device not powered
- LTE connection failed
- MQTT not connected
- Wrong device ID

**Solution:**
```bash
# Check device serial output
pio device monitor --baud 115200

# Check if device publishing
mosquitto_sub -h your-broker.com -t "iot/+/telemetry" -v
```

### Issue: "Memory warnings"

**Possible Causes:**
- Memory leak in code
- Too many retained messages
- Large payload accumulation

**Solution:**
- Check free_heap trend over time
- Review code for memory leaks
- Reduce telemetry frequency for testing

### Issue: "Frequent disconnects"

**Possible Causes:**
- Poor signal quality (CSQ <10)
- Network congestion
- MQTT broker overloaded
- APN issues

**Solution:**
- Check signal quality (CSQ)
- Try different APN
- Monitor broker load
- Check LTE operator status

---

## 📈 Production Deployment Plan

### Step 1: Pilot Deployment (Week 1)
- Deploy to 3-5 devices
- Run 7-day stability test
- Monitor daily for issues
- Collect feedback

### Step 2: Limited Rollout (Week 2-3)
- If pilot successful, deploy to 20-30 devices
- Monitor for patterns
- Verify scaling issues
- Fine-tune configurations

### Step 3: Full Rollout (Week 4+)
- Deploy to all devices
- Continue monitoring
- Plan OTA updates
- Establish support process

---

## 📝 Checklist Before Production

Use the comprehensive checklist:

```bash
# Open checklist
open PRODUCTION-READINESS-CHECKLIST.md

# Or view in terminal
cat PRODUCTION-READINESS-CHECKLIST.md | less
```

**Critical Items:**
- [ ] All functional tests passed
- [ ] 7-day stability test completed
- [ ] No memory leaks detected
- [ ] Documentation complete
- [ ] Pilot deployment successful
- [ ] Monitoring dashboard ready
- [ ] Support team trained
- [ ] Rollback plan prepared

---

## 📞 Support

### For Issues:
1. Check device serial output: `pio device monitor`
2. Check MQTT messages: `mosquitto_sub -h broker -t "iot/#" -v`
3. Review log file: `tail -f production_test_*.log`
4. Check free heap trend
5. Verify signal quality

### Escalation:
- **P0 (Critical)**: Device down, data loss → Immediate action
- **P1 (High)**: Partial function loss → Fix within 4 hours
- **P2 (Medium)**: Performance issue → Fix within 24 hours
- **P3 (Low)**: Minor issue → Fix in next update

---

## 🎓 Best Practices

1. **Always test in real environment** - Not just lab conditions
2. **Test edge cases** - Poor signal, power cycle, etc.
3. **Monitor long-term** - 7 days minimum for stability
4. **Validate data accuracy** - Compare with reference meters
5. **Document everything** - Issues, fixes, configurations
6. **Plan for rollback** - Keep previous firmware ready
7. **Gradual deployment** - Pilot → Limited → Full
8. **Continuous monitoring** - Even after production

---

## 📚 Additional Resources

- `PRODUCTION-READINESS-CHECKLIST.md` - Full checklist
- `platformio.ini` - Build configuration
- `include/config.h` - Firmware configuration
- Serial monitor: `pio device monitor --baud 115200`

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-07  
**Maintainer**: DevOps Team
