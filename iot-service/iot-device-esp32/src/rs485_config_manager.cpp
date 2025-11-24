#include "rs485_config_manager.h"
#include <HardwareSerial.h>

// External RS485 functions from main.cpp
extern bool readRS485Register(uint8_t slaveId, uint16_t regAddr, uint16_t count, uint16_t* output);
extern float readRS485Float32(uint8_t slaveId, uint16_t regAddr);
extern uint32_t readRS485Uint32(uint8_t slaveId, uint16_t regAddr);

// Global instance
RS485ConfigManager rs485ConfigMgr;

RS485ConfigManager::RS485ConfigManager() {
    devices.clear();
}

// ============================
// Config Management
// ============================

bool RS485ConfigManager::parseConfig(const String& jsonPayload) {
    Serial.println("[RS485Config] Parsing config JSON...");
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, jsonPayload);
    
    if (error) {
        Serial.print("[RS485Config] ❌ Parse error: ");
        Serial.println(error.c_str());
        return false;
    }
    
    // Clear existing config
    devices.clear();
    
    // Check if root is array (multiple devices) or object (single device)
    if (doc.is<JsonArray>()) {
        // Multiple devices - array format
        JsonArray devicesArray = doc.as<JsonArray>();
        Serial.printf("[RS485Config] Array format: %d devices\n", devicesArray.size());
        
        for (JsonObject deviceObj : devicesArray) {
            RS485DeviceConfig device;
            if (parseDeviceObject(deviceObj, device)) {
                devices.push_back(device);
                Serial.printf("[RS485Config] ✅ Device %d: %s, %d registers\n", 
                             device.modbus_address, 
                             device.device_type.c_str(),
                             device.registers.size());
            }
        }
        
    } else if (doc.is<JsonObject>()) {
        // Single device - object format
        Serial.println("[RS485Config] Object format: single device");
        
        RS485DeviceConfig device;
        if (parseDeviceObject(doc.as<JsonObject>(), device)) {
            devices.push_back(device);
            Serial.printf("[RS485Config] ✅ Device %d: %s, %d registers\n", 
                         device.modbus_address, 
                         device.device_type.c_str(),
                         device.registers.size());
        }
    } else {
        Serial.println("[RS485Config] ❌ Invalid format (not array or object)");
        return false;
    }
    
    if (devices.empty()) {
        Serial.println("[RS485Config] ⚠️ No valid devices parsed");
        return false;
    }
    
    Serial.printf("[RS485Config] ✅ Total config loaded: %d device(s)\n", devices.size());
    return true;
}

bool RS485ConfigManager::parseDeviceObject(JsonObject deviceObj, RS485DeviceConfig& device) {
    device.modbus_address = deviceObj["modbus_address"] | 1;
    device.device_type = deviceObj["device_type"] | "Unknown";
    device.baud_rate = deviceObj["baud_rate"] | 9600;
    device.description = deviceObj["description"] | "";
    device.version = deviceObj["version"] | 1;
    device.is_online = false;
    device.last_seen = 0;
    
    // Parse registers array
    JsonArray regsArray = deviceObj["registers"];
    if (!regsArray) {
        Serial.printf("[RS485Config] ⚠️ Device %d: No registers array\n", device.modbus_address);
        return false;
    }
    
    for (JsonObject regObj : regsArray) {
        RS485Register reg;
        if (parseRegister(regObj, reg)) {
            device.registers.push_back(reg);
        }
    }
    
    return !device.registers.empty();
}

bool RS485ConfigManager::parseRegister(JsonObject regObj, RS485Register& reg) {
    if (!regObj.containsKey("reg")) return false;
    
    reg.reg = regObj["reg"];
    reg.type = regObj["type"] | "uint16";
    reg.label = regObj["label"] | "Unknown";
    reg.unit = regObj["unit"] | "";
    reg.words = regObj["words"] | 1;
    reg.swap = regObj["swap"] | false;
    reg.category = regObj["category"] | "uncategorized";
    
    return true;
}

void RS485ConfigManager::clearConfig() {
    devices.clear();
    Serial.println("[RS485Config] Config cleared");
}

RS485DeviceConfig* RS485ConfigManager::getDevice(uint8_t address) {
    for (auto& device : devices) {
        if (device.modbus_address == address) {
            return &device;
        }
    }
    return nullptr;
}

// ============================
// Device Scanner
// ============================

void RS485ConfigManager::scanDevices(uint8_t startAddr, uint8_t endAddr) {
    Serial.println("\n========== RS485 DEVICE SCAN ==========");
    Serial.printf("[RS485Scan] Scanning addresses %d-%d...\n", startAddr, endAddr);
    
    uint8_t foundCount = 0;
    
    for (uint8_t addr = startAddr; addr <= endAddr; addr++) {
        bool online = testDevice(addr);
        
        if (online) {
            foundCount++;
            Serial.printf("  [✓] Address %d: ONLINE\n", addr);
            
            // Update device status if in config
            RS485DeviceConfig* device = getDevice(addr);
            if (device) {
                device->is_online = true;
                device->last_seen = millis();
            }
        } else {
            Serial.printf("  [✗] Address %d: offline\n", addr);
        }
        
        delay(50); // Small delay between scans
    }
    
    Serial.printf("[RS485Scan] ✅ Scan complete: %d/%d devices online\n", 
                  foundCount, (endAddr - startAddr + 1));
    Serial.println("=======================================\n");
}

bool RS485ConfigManager::testDevice(uint8_t address) {
    // Simple ping test - read first register
    uint16_t testReg = 0;
    return readRS485Register(address, 0, 1, &testReg);
}

uint8_t RS485ConfigManager::getOnlineCount() const {
    uint8_t count = 0;
    for (const auto& device : devices) {
        if (device.is_online) count++;
    }
    return count;
}

void RS485ConfigManager::printDeviceStatus() const {
    Serial.println("\n========== RS485 DEVICE STATUS ==========");
    
    if (devices.empty()) {
        Serial.println("  ⚠️ No config loaded");
        Serial.println("  Tip: Publish 'request' to get_config/{device_id}");
    } else {
        for (const auto& device : devices) {
            Serial.printf("  Address %d: %s\n", 
                         device.modbus_address,
                         device.is_online ? "✅ ONLINE" : "❌ OFFLINE");
            Serial.printf("    Type: %s\n", device.device_type.c_str());
            Serial.printf("    Registers: %d\n", device.registers.size());
            if (device.is_online) {
                Serial.printf("    Last seen: %lu ms ago\n", 
                             millis() - device.last_seen);
            }
        }
    }
    
    Serial.println("=========================================\n");
}

// ============================
// Dynamic Telemetry Builder
// ============================

JsonDocument RS485ConfigManager::buildDynamicTelemetry() {
    JsonDocument doc;
    JsonObject sensors = doc["sensors"].to<JsonObject>();
    
    if (devices.empty()) {
        // No config - just report scan results
        JsonObject rs485Status = sensors["rs485_status"].to<JsonObject>();
        rs485Status["status"] = "no_config";
        rs485Status["message"] = "Waiting for configuration";
        return doc;
    }
    
    // Read configured devices
    for (auto& device : devices) {
        String deviceKey = "rs485_addr_" + String(device.modbus_address);
        JsonObject deviceObj = sensors[deviceKey].to<JsonObject>();
        
        deviceObj["type"] = "rs485_modbus";
        deviceObj["slave_id"] = device.modbus_address;
        deviceObj["device_type"] = device.device_type;
        
        if (!device.is_online) {
            deviceObj["status"] = "offline";
            continue;
        }
        
        // Read all registers
        JsonObject dataObj = deviceObj["data"].to<JsonObject>();
        
        for (const auto& reg : device.registers) {
            String key = reg.label;
            key.replace(" ", "_");
            key.toLowerCase();
            
            if (reg.type == "float32") {
                float value = readRS485Float32(device.modbus_address, reg.reg);
                dataObj[key] = serialized(String(value, 2));
                
            } else if (reg.type == "uint32") {
                uint32_t value = readRS485Uint32(device.modbus_address, reg.reg);
                dataObj[key] = value;
                
            } else if (reg.type == "uint16") {
                uint16_t value = 0;
                if (readRS485Register(device.modbus_address, reg.reg, 1, &value)) {
                    dataObj[key] = value;
                }
                
            } else if (reg.type == "hex16") {
                uint16_t value = 0;
                if (readRS485Register(device.modbus_address, reg.reg, 1, &value)) {
                    char hexStr[8];
                    sprintf(hexStr, "0x%04X", value);
                    dataObj[key] = hexStr;
                }
            }
            
            delay(10); // Small delay between register reads
        }
        
        deviceObj["status"] = "ok";
        device.last_seen = millis();
    }
    
    return doc;
}
