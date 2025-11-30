#ifndef GENERIC_IO_H
#define GENERIC_IO_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>
#include <Wire.h>

// ============================================================================
// GENERIC I/O MANAGER
// ============================================================================
// Firmware yang TRULY GENERIC - kirim RAW data semua I/O
// Server-side yang akan mapping dan parsing sesuai Node Profile

// ============================================================================
// RS485 SCANNER & RAW READER
// ============================================================================

struct RS485RegisterData {
    uint8_t slaveId;
    uint16_t address;
    uint16_t rawValue[2];      // Max 2 registers untuk float/uint32
    uint8_t registerCount;     // 1 atau 2
    bool success;
};

class RS485Scanner {
public:
    RS485Scanner();

    // Initialize
    bool begin();

    // Scan for active slave IDs (1-247 or custom range)
    uint8_t scanSlaves(uint8_t startId = 1, uint8_t endId = 10);

    // Get detected slave IDs
    uint8_t* getActiveSlaves() { return activeSlaves; }
    uint8_t getActiveCount() { return activeCount; }

    // Read raw registers from all active slaves
    bool readAllSlaves(JsonArray& output);

    // Read specific slave, specific registers
    bool readSlaveRegisters(uint8_t slaveId, uint16_t startAddr, uint8_t count, JsonObject& output);

    // Configuration
    void setRegisterRange(uint16_t start, uint16_t end);
    void setFunctionCode(uint8_t fc) { functionCode = fc; }

private:
    ModbusMaster* modbus;
    uint8_t activeSlaves[247];
    uint8_t activeCount;

    uint16_t regStartAddr;
    uint16_t regEndAddr;
    uint8_t functionCode;      // 3=Holding, 4=Input

    // Helper: check if slave responds
    bool pingSlaveId(uint8_t slaveId);
};

// ============================================================================
// ANALOG INPUT READER (4-20mA via ESP32 GPIO1/GPIO2)
// ============================================================================

struct AnalogChannelData {
    String channel;            // "A2" atau "A3"
    uint8_t pin;               // GPIO pin
    uint16_t rawADC;           // Raw 12-bit from ESP32 ADC
    float voltage;
    float currentMA;
};

class AnalogInputReader {
public:
    AnalogInputReader();

    // Initialize
    bool begin();

    // Read all analog channels (GPIO1/GPIO2)
    void readAllChannels(JsonArray& output);

private:
    uint8_t channels[2];       // GPIO1, GPIO2
    String channelNames[2];    // "A2", "A3"
};

// ============================================================================
// ADC 16-BIT READER (ADS1115)
// ============================================================================

struct ADC16ChannelData {
    String channel;            // "A0", "A1", "A2", "A3"
    uint8_t channelNum;        // 0, 1, 2, 3
    int16_t rawADC;            // Raw 16-bit ADC (-32768 to 32767)
    float voltage;             // Voltage in V
    bool connected;            // Is sensor connected?
};

class ADC16Reader {
public:
    ADC16Reader();

    // Initialize ADS1115
    bool begin();

    // Check if ADS1115 is available
    bool isAvailable() { return available; }

    // Read all ADC channels (A0, A1, A2, A3)
    void readAllChannels(JsonArray& output);

    // Read specific channel (0-3)
    ADC16ChannelData readChannel(uint8_t channel);

    // Set gain (default: GAIN_TWOTHIRDS = ±6.144V)
    void setGain(uint8_t gain);

private:
    bool available;
    uint8_t i2cAddress;
    uint8_t currentGain;

    // Convert raw ADC to voltage
    float rawToVoltage(int16_t raw);

    // Check if channel has sensor connected
    bool isSensorConnected(int16_t raw, float voltage);
};

// ============================================================================
// I2C DEVICE SCANNER & RAW READER
// ============================================================================

struct I2CDeviceData {
    uint8_t address;
    String deviceType;         // "INA219", "ADS1115", "Unknown", etc.
    JsonObject data;
};

class I2CScanner {
public:
    I2CScanner();

    // Initialize
    bool begin();

    // Scan I2C bus for devices
    uint8_t scanDevices();

    // Get detected I2C addresses
    uint8_t* getActiveAddresses() { return activeAddresses; }
    uint8_t getActiveCount() { return activeCount; }

    // Read all I2C devices and add to JSON
    void readAllDevices(JsonArray& output);

    // Read specific device
    bool readDevice(uint8_t address, JsonObject& output);

    // Detect device type by address (PUBLIC for diagnostics)
    String detectDeviceType(uint8_t address);

private:
    uint8_t activeAddresses[128];
    uint8_t activeCount;

    // Read INA219 (0x40-0x4F)
    bool readINA219(uint8_t address, JsonObject& output);
};

// ============================================================================
// GENERIC I/O MANAGER (Main Class)
// ============================================================================

class GenericIOManager {
public:
    GenericIOManager();

    // Initialize all I/O
    bool begin();

    // Scan all buses for devices
    void scanAllBuses();

    // Read ALL I/O and generate RAW telemetry JSON
    void generateRawTelemetry(JsonDocument& doc);

    // Print detected devices summary
    void printDeviceSummary();

    // Read digital inputs (e.g., pump status)
    void readDigitalInputs(JsonObject& output);

    // Get individual managers (for advanced usage)
    RS485Scanner& getRS485() { return rs485; }
    AnalogInputReader& getAnalog() { return analog; }
    ADC16Reader& getADC16() { return adc16; }
    I2CScanner& getI2C() { return i2c; }

private:
    RS485Scanner rs485;
    AnalogInputReader analog;
    ADC16Reader adc16;
    I2CScanner i2c;

    bool initialized;
};

#endif // GENERIC_IO_H
