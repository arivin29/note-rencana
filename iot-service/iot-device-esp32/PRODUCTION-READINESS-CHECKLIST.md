# Production Readiness Checklist - ESP32 IoT Device Firmware

## 📋 Overview
Checklist untuk memastikan firmware **esp32s3-multisensor-v2.1** siap untuk production deployment.

---

## ✅ 1. FUNCTIONAL TESTING

### 1.1 LTE Connectivity
- [ ] **Power-on Connection**: Device bisa connect ke LTE setelah power on
- [ ] **Auto Reconnect**: Device bisa reconnect otomatis jika LTE terputus
- [ ] **Signal Quality**: CSQ minimal 10-15 dalam kondisi normal
- [ ] **Operator Lock**: Bisa connect ke operator yang ditentukan (Telkomsel)
- [ ] **IP Assignment**: Mendapat IP dari operator dengan benar
- [ ] **APN Configuration**: APN setting sesuai (default atau custom)

**Test Duration**: Minimal 24 jam continuous

### 1.2 MQTT Communication
- [ ] **Initial Connect**: Bisa connect ke MQTT broker setelah LTE ready
- [ ] **Auto Reconnect**: Reconnect otomatis jika MQTT disconnect
- [ ] **Publish Success**: Telemetry data berhasil dikirim
- [ ] **QoS Handling**: Message delivery dengan QoS 0/1 berfungsi
- [ ] **Topic Structure**: Topic naming sesuai convention
- [ ] **Large Payload**: Bisa handle payload > 2KB (RS485 data)
- [ ] **Subscribe**: Bisa receive command dari server

**Test Duration**: Minimal 48 jam dengan >1000 publishes

### 1.3 RS485 Modbus Communication
- [ ] **Device Discovery**: Bisa detect device yang online
- [ ] **Config Loading**: Bisa load config dari MQTT
- [ ] **Multi-Device**: Bisa handle multiple modbus devices (tested 2-3 devices)
- [ ] **Register Reading**: Semua register type dibaca dengan benar (uint16, uint32, float32)
- [ ] **Timeout Handling**: Tidak stuck jika device offline
- [ ] **Data Accuracy**: Data yang dibaca sesuai dengan actual measurement
- [ ] **Error Recovery**: Recovery dari communication error

**Test Cases**:
- Online device → Offline → Online again
- Add new device via config update
- Remove device via config update
- Wrong slave ID handling

### 1.4 Generic I/O (Sensors & Actuators)
- [ ] **Analog ESP32**: GPIO1, GPIO2 reading accurate
- [ ] **ADC16 (ADS1115)**: 4 channel reading accurate
- [ ] **I2C Sensors**: INA219, ADS1115, MPU6050 detection & reading
- [ ] **Digital Input**: Pump status/digital input reading
- [ ] **Relay Control**: MQTT command → Relay ON/OFF working
- [ ] **Sensor Hot-plug**: Handle sensor disconnect/reconnect

### 1.5 Time Management
- [ ] **NTP Sync**: Bisa sync time dari NTP server
- [ ] **Timezone**: Timestamp dalam timezone yang benar (WIB/WITA/WIT)
- [ ] **RTC Backup**: Time persist setelah power cycle (jika ada RTC)
- [ ] **Timestamp Format**: ISO 8601 format correct

### 1.6 SD Card & Logging
- [ ] **SD Mount**: SD card mount dengan benar
- [ ] **Log Writing**: Log file ditulis dengan benar
- [ ] **Rotation**: Log rotation jika file terlalu besar
- [ ] **SD Full**: Handle gracefully jika SD penuh
- [ ] **SD Removed**: No crash jika SD card dicabut saat running

---

## 🔄 2. RELIABILITY TESTING

### 2.1 Stability Test
- [ ] **Uptime Test**: Minimal 7 hari continuous operation tanpa restart
- [ ] **Memory Leak**: Free heap stabil, tidak terus menurun
- [ ] **No Crash**: Tidak ada crash/restart unexpected
- [ ] **Watchdog**: Watchdog tidak trigger dalam kondisi normal

**Monitoring**:
```
Initial Free Heap: ~350KB
After 24h: Should be > 300KB
After 7d: Should be > 250KB
```

### 2.2 Network Resilience
- [ ] **LTE Disconnect/Reconnect**: Tested 50x cycles
- [ ] **MQTT Disconnect/Reconnect**: Tested 100x cycles
- [ ] **Poor Signal**: Tested dengan CSQ < 10
- [ ] **Network Congestion**: Tested saat jam sibuk
- [ ] **Operator Switching**: Handle jika operator switch

### 2.3 Power Management
- [ ] **Power Cycle**: Tested 20x power on/off cycles
- [ ] **Brown-out**: Handle voltage drop
- [ ] **Power Consumption**: Measured & within spec
- [ ] **Sleep Mode**: Deep sleep working (jika digunakan)

### 2.4 Error Handling
- [ ] **RS485 Timeout**: No hang/stuck
- [ ] **MQTT Publish Fail**: Retry mechanism works
- [ ] **Config Invalid**: Handle malformed JSON config
- [ ] **Memory Full**: Graceful degradation
- [ ] **Sensor Error**: Continue operation with other sensors

---

## 📊 3. PERFORMANCE METRICS

### 3.1 Timing Requirements
- [ ] **Telemetry Interval**: Sesuai requirement (default 30s)
- [ ] **RS485 Read Time**: < 5s untuk 1 device
- [ ] **MQTT Publish Time**: < 2s per message
- [ ] **Boot Time**: < 60s from power-on to first telemetry
- [ ] **Reconnect Time**: < 30s untuk LTE/MQTT reconnect

### 3.2 Data Accuracy
- [ ] **RS485 Data**: ±1% accuracy vs reference meter
- [ ] **Analog Reading**: ±2% accuracy
- [ ] **Timestamp**: ±1s accuracy vs NTP
- [ ] **No Data Loss**: >99% telemetry delivery success rate

### 3.3 Resource Usage
```
Memory Usage:
- Flash: < 50% (currently ~13%)
- RAM: < 50% (currently ~6.5%)
- Free Heap: > 200KB during operation

Network Usage:
- Per Telemetry: ~1-3KB
- Per Hour: ~360-1080KB (@ 30s interval)
- Per Day: ~8.4-25.2MB
```

---

## 🔒 4. SECURITY & CONFIGURATION

### 4.1 Security
- [ ] **MQTT Authentication**: Username/password configured
- [ ] **TLS/SSL**: Enabled untuk MQTT (if required)
- [ ] **Device ID**: Unique per device (MAC-based)
- [ ] **No Hardcoded Secrets**: Passwords di config, bukan hardcode
- [ ] **Firmware Update**: OTA mechanism secure

### 4.2 Configuration Management
- [ ] **Config via MQTT**: Remote config update works
- [ ] **Config Persistence**: Config saved to storage
- [ ] **Config Validation**: Invalid config rejected
- [ ] **Default Config**: Sensible defaults jika no config
- [ ] **Config Versioning**: Track config version

---

## 📝 5. CODE QUALITY

### 5.1 Code Review
- [ ] **No Compiler Warnings**: Fix all deprecation warnings (ArduinoJson)
- [ ] **Error Handling**: All error cases handled
- [ ] **Logging**: Proper log levels (DEBUG/INFO/ERROR)
- [ ] **Comments**: Critical sections documented
- [ ] **Magic Numbers**: Constants defined dengan meaningful names

### 5.2 Version Management
- [ ] **Firmware Version**: Version number in code & telemetry
- [ ] **Change Log**: Documented changes
- [ ] **Git Tags**: Version tagged in git
- [ ] **Build Info**: Build date/commit hash in firmware

---

## 🚀 6. DEPLOYMENT READINESS

### 6.1 Documentation
- [ ] **User Manual**: Installation & configuration guide
- [ ] **API Documentation**: MQTT topics & payload format
- [ ] **Troubleshooting Guide**: Common issues & solutions
- [ ] **Pin Mapping**: Hardware connection diagram
- [ ] **Config Examples**: Sample configs untuk different scenarios

### 6.2 Production Configuration
- [ ] **Telemetry Interval**: Set to production value
- [ ] **Log Level**: Set to INFO (not DEBUG)
- [ ] **Watchdog**: Enabled dengan appropriate timeout
- [ ] **APN**: Production APN configured
- [ ] **MQTT Broker**: Production broker URL
- [ ] **NTP Server**: Production NTP server

### 6.3 Rollout Plan
- [ ] **Pilot Test**: Deploy to 3-5 devices first
- [ ] **Monitoring**: Server-side monitoring ready
- [ ] **Rollback Plan**: Previous firmware version available
- [ ] **Support Plan**: Team ready untuk handle issues
- [ ] **Update Mechanism**: OTA update tested

---

## 🎯 PRODUCTION CRITERIA (MUST PASS)

### Critical Requirements ⚠️
1. ✅ **Uptime > 99%**: Less than 1% downtime over 7 days
2. ✅ **No Memory Leak**: Free heap stable over 7 days
3. ✅ **Auto Recovery**: Recover from all connection failures within 5 minutes
4. ✅ **Data Accuracy**: RS485 data ±1% vs reference
5. ✅ **No Unexpected Restart**: Zero crashes over 7 days continuous operation

### Performance Requirements 📊
1. ✅ **Boot Time** < 60s
2. ✅ **Telemetry Delivery** > 99% success rate
3. ✅ **MQTT Reconnect** < 30s
4. ✅ **RS485 Read Time** < 5s per device

### Reliability Requirements 🔄
1. ✅ **Power Cycle**: 20 consecutive cycles without issue
2. ✅ **Network Resilience**: 50 LTE reconnect cycles successful
3. ✅ **Error Recovery**: All tested error scenarios recovered

---

## 📱 TESTING TOOLS & SCRIPTS

### Automated Test Script
```bash
#!/bin/bash
# File: test_production_readiness.sh

echo "=== ESP32 Production Readiness Test ==="
echo "Device ID: $DEVICE_ID"
echo "Duration: 7 days"

# Monitor uptime
while true; do
    UPTIME=$(mosquitto_sub -h broker.example.com -t "iot/+/telemetry" -C 1 | jq -r '.node.uptime_s')
    FREE_HEAP=$(mosquitto_sub -h broker.example.com -t "iot/+/telemetry" -C 1 | jq -r '.node.free_heap')
    
    echo "[$(date)] Uptime: ${UPTIME}s, Free Heap: ${FREE_HEAP} bytes"
    
    # Check memory leak
    if [ $FREE_HEAP -lt 200000 ]; then
        echo "⚠️ WARNING: Low memory detected!"
    fi
    
    sleep 300  # Check every 5 minutes
done
```

### Test Scenarios Script
```python
# File: test_scenarios.py
import paho.mqtt.client as mqtt
import json
import time

def test_relay_control(device_id):
    """Test relay control via MQTT"""
    client = mqtt.Client()
    client.connect("broker.example.com", 1883)
    
    topic = f"iot/{device_id}/command"
    
    # Turn ON
    cmd = {"command": "relay", "action": "on", "relay": 1}
    client.publish(topic, json.dumps(cmd))
    time.sleep(2)
    
    # Turn OFF
    cmd = {"command": "relay", "action": "off", "relay": 1}
    client.publish(topic, json.dumps(cmd))
    
    print("✅ Relay control test sent")

def test_config_update(device_id):
    """Test RS485 config update"""
    client = mqtt.Client()
    client.connect("broker.example.com", 1883)
    
    topic = f"iot/{device_id}/config/rs485"
    
    config = {
        "devices": [
            {
                "modbus_address": 1,
                "device_type": "HIRP-RM3D3Y",
                "registers": [...]
            }
        ]
    }
    
    client.publish(topic, json.dumps(config))
    print("✅ Config update test sent")
```

---

## 🎓 FINAL CHECKLIST SUMMARY

### Before Production Deployment:
- [ ] All functional tests passed
- [ ] 7-day stability test completed
- [ ] No memory leaks detected
- [ ] All critical requirements met
- [ ] Documentation complete
- [ ] Pilot deployment successful (3-5 devices, 1 week)
- [ ] Production config set
- [ ] Monitoring dashboard ready
- [ ] Support team trained
- [ ] Rollback plan ready

### Production Approval Sign-off:
- [ ] Technical Lead: _________________ Date: _______
- [ ] QA Engineer: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______

---

## 📞 SUPPORT & ESCALATION

### Issue Severity Levels:
1. **P0 - Critical**: Device completely down, data loss
2. **P1 - High**: Partial functionality loss, frequent reconnects
3. **P2 - Medium**: Performance degradation, minor issues
4. **P3 - Low**: Cosmetic issues, feature requests

### Monitoring Alerts:
- ⚠️ Device offline > 5 minutes
- ⚠️ Free heap < 150KB
- ⚠️ MQTT reconnect > 5x in 1 hour
- ⚠️ Telemetry delivery < 95%
- ⚠️ RS485 device offline

---

## 🔄 POST-DEPLOYMENT

### First Week Monitoring:
- [ ] Daily check: Device uptime, memory, reconnect count
- [ ] Check for: Unexpected restarts, memory leaks
- [ ] Verify: Data accuracy vs reference meters
- [ ] Monitor: Network usage within limits

### Monthly Review:
- [ ] Uptime statistics
- [ ] Error rate analysis
- [ ] Performance metrics
- [ ] Firmware update planning

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-07  
**Next Review**: After pilot deployment
