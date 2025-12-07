#!/usr/bin/env python3
"""
ESP32 IoT Device - Advanced Test Scenarios
Automated testing untuk validasi functionality sebelum production
"""

import paho.mqtt.client as mqtt
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional

class DeviceTester:
    def __init__(self, device_id: str, broker: str = "broker.example.com", port: int = 1883):
        self.device_id = device_id
        self.broker = broker
        self.port = port
        self.client = mqtt.Client()
        self.last_telemetry = None
        self.test_results = {}
        
        # Setup callbacks
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ Connected to MQTT broker {self.broker}:{self.port}")
            # Subscribe to telemetry topics
            client.subscribe(f"iot/{self.device_id}/telemetry")
            client.subscribe(f"iot/{self.device_id}/rs485")
            client.subscribe(f"iot/{self.device_id}/boot")
        else:
            print(f"❌ Connection failed with code {rc}")
    
    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            self.last_telemetry = payload
            print(f"📥 Received message on {msg.topic}")
        except Exception as e:
            print(f"⚠️  Error parsing message: {e}")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            time.sleep(2)  # Wait for connection
            return True
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
    
    def wait_for_telemetry(self, timeout: int = 60) -> Optional[Dict]:
        """Wait for telemetry message"""
        print(f"⏳ Waiting for telemetry (timeout: {timeout}s)...")
        self.last_telemetry = None
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.last_telemetry is not None:
                return self.last_telemetry
            time.sleep(1)
        
        print("❌ Timeout waiting for telemetry")
        return None
    
    # ========================================================================
    # TEST SCENARIOS
    # ========================================================================
    
    def test_relay_control(self) -> bool:
        """Test: Relay Control via MQTT Command"""
        print("\n" + "="*70)
        print("TEST 1: Relay Control")
        print("="*70)
        
        topic = f"iot/{self.device_id}/command"
        
        try:
            # Test ON command
            print("📤 Sending relay ON command...")
            cmd = {
                "command": "relay",
                "action": "on",
                "relay": 1
            }
            self.client.publish(topic, json.dumps(cmd))
            time.sleep(3)
            
            # Test OFF command
            print("📤 Sending relay OFF command...")
            cmd["action"] = "off"
            self.client.publish(topic, json.dumps(cmd))
            time.sleep(3)
            
            # Test toggle
            print("📤 Sending relay TOGGLE command...")
            cmd["action"] = "toggle"
            self.client.publish(topic, json.dumps(cmd))
            time.sleep(3)
            
            print("✅ Relay control commands sent successfully")
            print("⚠️  Manual verification required: Check if relay responded")
            
            result = input("Did relay respond correctly? (y/n): ").lower() == 'y'
            self.test_results['relay_control'] = result
            return result
            
        except Exception as e:
            print(f"❌ Relay control test failed: {e}")
            self.test_results['relay_control'] = False
            return False
    
    def test_rs485_config_update(self) -> bool:
        """Test: RS485 Config Update via MQTT"""
        print("\n" + "="*70)
        print("TEST 2: RS485 Config Update")
        print("="*70)
        
        topic = f"iot/{self.device_id}/config/rs485"
        
        config = {
            "devices": [
                {
                    "modbus_address": 1,
                    "device_type": "HIRP-RM3D3Y",
                    "registers": [
                        {"reg": 1, "type": "uint16", "label": "Voltage L1", "unit": "V"},
                        {"reg": 7, "type": "uint16", "label": "Current L1", "unit": "A"},
                        {"reg": 19, "type": "uint16", "label": "Power Factor L1", "unit": "%"},
                        {"reg": 55, "type": "uint16", "label": "Frequency", "unit": "Hz"},
                        {"reg": 257, "type": "uint32", "label": "Active Energy Total", "unit": "kWh"},
                    ]
                },
                {
                    "modbus_address": 2,
                    "device_type": "TUF-2000-FlowMeter",
                    "registers": [
                        {"reg": 1, "type": "float32", "label": "Flow Rate", "unit": "m3/h"},
                        {"reg": 9, "type": "float32", "label": "Velocity", "unit": "m/s"},
                    ]
                }
            ]
        }
        
        try:
            print("📤 Sending RS485 config update...")
            self.client.publish(topic, json.dumps(config))
            print("✅ Config update sent")
            
            # Wait for device to apply config
            print("⏳ Waiting 10s for device to apply config...")
            time.sleep(10)
            
            # Wait for next telemetry to verify
            telemetry = self.wait_for_telemetry(timeout=60)
            if telemetry and "sensors" in telemetry:
                has_rs485 = any("rs485_addr" in key for key in telemetry["sensors"].keys())
                if has_rs485:
                    print("✅ RS485 config applied successfully")
                    self.test_results['rs485_config'] = True
                    return True
                else:
                    print("⚠️  No RS485 data in telemetry")
                    self.test_results['rs485_config'] = False
                    return False
            else:
                print("❌ No telemetry received")
                self.test_results['rs485_config'] = False
                return False
                
        except Exception as e:
            print(f"❌ Config update test failed: {e}")
            self.test_results['rs485_config'] = False
            return False
    
    def test_telemetry_format(self) -> bool:
        """Test: Telemetry Format Validation"""
        print("\n" + "="*70)
        print("TEST 3: Telemetry Format Validation")
        print("="*70)
        
        telemetry = self.wait_for_telemetry(timeout=60)
        
        if not telemetry:
            print("❌ No telemetry received")
            self.test_results['telemetry_format'] = False
            return False
        
        print("\n📋 Validating telemetry structure...")
        
        checks = {
            "device_id": "device_id" in telemetry,
            "timestamp": "timestamp" in telemetry,
            "firmware": "firmware" in telemetry,
            "sensors": "sensors" in telemetry,
            "node": "node" in telemetry,
        }
        
        if checks["node"]:
            node_checks = {
                "lte": "lte" in telemetry["node"],
                "uptime": "uptime_s" in telemetry["node"],
                "heap": "free_heap" in telemetry["node"],
                "connection": "connection" in telemetry["node"],
            }
            checks.update(node_checks)
        
        # Print results
        all_passed = True
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check}")
            if not result:
                all_passed = False
        
        if all_passed:
            print("\n✅ All telemetry format checks passed")
        else:
            print("\n❌ Some telemetry format checks failed")
        
        self.test_results['telemetry_format'] = all_passed
        return all_passed
    
    def test_data_accuracy(self) -> bool:
        """Test: Data Accuracy Check"""
        print("\n" + "="*70)
        print("TEST 4: Data Accuracy & Reasonable Values")
        print("="*70)
        
        telemetry = self.wait_for_telemetry(timeout=60)
        
        if not telemetry:
            print("❌ No telemetry received")
            self.test_results['data_accuracy'] = False
            return False
        
        print("\n📊 Checking data ranges...")
        
        issues = []
        
        # Check node data
        if "node" in telemetry:
            node = telemetry["node"]
            
            # Check free heap
            if "free_heap" in node:
                heap = node["free_heap"]
                if heap < 100000:
                    issues.append(f"Low free heap: {heap} bytes")
                elif heap > 500000:
                    issues.append(f"Suspiciously high heap: {heap} bytes")
                print(f"  Free Heap: {heap} bytes {'✅' if heap > 200000 else '⚠️'}")
            
            # Check CSQ
            if "lte" in node and "csq" in node["lte"]:
                csq = node["lte"]["csq"]
                if csq < 5:
                    issues.append(f"Very poor signal: CSQ {csq}")
                elif csq < 10:
                    issues.append(f"Poor signal: CSQ {csq}")
                print(f"  Signal Quality (CSQ): {csq} {'✅' if csq >= 10 else '⚠️'}")
            
            # Check uptime
            if "uptime_s" in node:
                uptime = node["uptime_s"]
                print(f"  Uptime: {uptime}s ({uptime//3600}h {(uptime%3600)//60}m) ✅")
        
        # Check sensor data
        if "sensors" in telemetry:
            sensors = telemetry["sensors"]
            
            # Check analog values
            for key, sensor in sensors.items():
                if "analog" in key and "raw" in sensor:
                    raw = sensor["raw"]
                    if raw < 0 or raw > 4095:
                        issues.append(f"{key}: Out of range value {raw}")
            
            # Check ADC16 values
            for key, sensor in sensors.items():
                if "adc16" in key and "volt" in sensor:
                    volt = sensor["volt"]
                    if volt < -0.5 or volt > 5.5:
                        issues.append(f"{key}: Suspicious voltage {volt}V")
        
        if issues:
            print("\n⚠️  Issues found:")
            for issue in issues:
                print(f"  - {issue}")
            result = input("\nAre these issues acceptable? (y/n): ").lower() == 'y'
        else:
            print("\n✅ All data values are within expected ranges")
            result = True
        
        self.test_results['data_accuracy'] = result
        return result
    
    def test_connection_state(self) -> bool:
        """Test: Connection State Monitoring"""
        print("\n" + "="*70)
        print("TEST 5: Connection State Monitoring")
        print("="*70)
        
        telemetry = self.wait_for_telemetry(timeout=60)
        
        if not telemetry or "node" not in telemetry or "connection" not in telemetry["node"]:
            print("❌ No connection state data")
            self.test_results['connection_state'] = False
            return False
        
        conn = telemetry["node"]["connection"]
        
        print("\n📊 Connection Statistics:")
        print(f"  State: {conn.get('state', 'UNKNOWN')}")
        print(f"  LTE Reconnects: {conn.get('lte_reconnects', 0)}")
        print(f"  MQTT Reconnects: {conn.get('mqtt_reconnects', 0)}")
        print(f"  Publish Failures: {conn.get('publish_fail', 0)}")
        
        # Check if state is healthy
        state = conn.get('state', '')
        is_healthy = state == 'FULLY_CONNECTED'
        
        reconnects = conn.get('lte_reconnects', 0) + conn.get('mqtt_reconnects', 0)
        failures = conn.get('publish_fail', 0)
        
        if is_healthy and reconnects < 5 and failures < 5:
            print("\n✅ Connection state is healthy")
            result = True
        else:
            print("\n⚠️  Connection state has issues")
            result = input("Is this acceptable for current test phase? (y/n): ").lower() == 'y'
        
        self.test_results['connection_state'] = result
        return result
    
    # ========================================================================
    # TEST RUNNER
    # ========================================================================
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*70)
        print(f"ESP32 IoT Device - Production Readiness Tests")
        print(f"Device ID: {self.device_id}")
        print(f"Broker: {self.broker}:{self.port}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        if not self.connect():
            print("\n❌ Failed to connect to broker")
            return
        
        try:
            # Run tests
            tests = [
                ("Telemetry Format", self.test_telemetry_format),
                ("Data Accuracy", self.test_data_accuracy),
                ("Connection State", self.test_connection_state),
                ("Relay Control", self.test_relay_control),
                ("RS485 Config Update", self.test_rs485_config_update),
            ]
            
            for test_name, test_func in tests:
                try:
                    test_func()
                except KeyboardInterrupt:
                    print("\n⚠️  Tests interrupted by user")
                    break
                except Exception as e:
                    print(f"\n❌ Test '{test_name}' crashed: {e}")
                    self.test_results[test_name.lower().replace(" ", "_")] = False
            
            # Print summary
            self.print_summary()
            
        finally:
            self.disconnect()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        
        if not self.test_results:
            print("No tests completed")
            return
        
        passed = sum(1 for r in self.test_results.values() if r)
        total = len(self.test_results)
        
        for test, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {status}  {test.replace('_', ' ').title()}")
        
        print(f"\nResults: {passed}/{total} tests passed ({100*passed//total}%)")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED - Device is ready for next phase!")
        elif passed >= total * 0.8:
            print("\n⚠️  MOST TESTS PASSED - Review failures before deployment")
        else:
            print("\n❌ MULTIPLE FAILURES - Device needs fixes before deployment")
        
        print("="*70)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_scenarios.py <device_id> [broker] [port]")
        print("Example: python3 test_scenarios.py DEMO1-00D42390A994")
        sys.exit(1)
    
    device_id = sys.argv[1]
    broker = sys.argv[2] if len(sys.argv) > 2 else "broker.example.com"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 1883
    
    tester = DeviceTester(device_id, broker, port)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
