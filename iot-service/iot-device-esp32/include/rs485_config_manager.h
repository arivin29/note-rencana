#ifndef RS485_CONFIG_MANAGER_H
#define RS485_CONFIG_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

// ============================
// RS485 Register Configuration
// ============================
struct RS485Register {
    uint16_t reg;           // Register address
    String type;            // "float32", "uint32", "uint16", "int16", "hex16"
    String label;           // Human-readable label
    String unit;            // Unit of measurement
    uint8_t words;          // Number of Modbus words (1 or 2)
    bool swap;              // Byte swap for multi-word values
    String category;        // "sensor_data", "system_status", "configuration", etc.
};

// ============================
// RS485 Device Configuration
// ============================
struct RS485DeviceConfig {
    uint8_t modbus_address;     // 1-10
    String device_type;         // "TUF-2000M", "Generic", etc.
    uint32_t baud_rate;         // 9600, 19200, etc.
    String description;
    uint16_t version;
    std::vector<RS485Register> registers;
    
    // Runtime status
    bool is_online;             // Device responding?
    unsigned long last_seen;    // Last successful read (millis)
};

// ============================
// RS485 Config Manager
// ============================
class RS485ConfigManager {
public:
    RS485ConfigManager();
    
    // Config Management (RAM only)
    bool parseConfig(const String& jsonPayload);
    void clearConfig();
    bool hasConfig() const { return !devices.empty(); }
    
    // Device Management
    const std::vector<RS485DeviceConfig>& getDevices() const { return devices; }
    RS485DeviceConfig* getDevice(uint8_t address);
    
    // Device Scanner
    void scanDevices(uint8_t startAddr = 1, uint8_t endAddr = 10);
    uint8_t getOnlineCount() const;
    void printDeviceStatus() const;
    
    // Telemetry Helpers
    JsonDocument buildDynamicTelemetry();
    
private:
    std::vector<RS485DeviceConfig> devices;
    
    // Helpers
    bool parseDeviceObject(JsonObject deviceObj, RS485DeviceConfig& device);
    bool parseRegister(JsonObject regObj, RS485Register& reg);
    bool testDevice(uint8_t address);
};

// Global instance
extern RS485ConfigManager rs485ConfigMgr;

#endif // RS485_CONFIG_MANAGER_H
