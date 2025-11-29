#ifndef GENERIC_IO_H
#define GENERIC_IO_H

#include <Arduino.h>
#include <ArduinoJson.h>

// ============================================================================
// GENERIC I/O MANAGER - DYNAMIC I/O LIKE MAIN PROJECT
// ============================================================================
// Truly generic - scan all buses, detect all devices, send RAW data
// Server-side handles parsing based on Node Profile

// ============================================================================
// RS485 DYNAMIC SCANNER
// ============================================================================

class RS485Scanner {
public:
    RS485Scanner();

    // Initialize
    bool begin();

    // Scan for active slave IDs
    uint8_t scanSlaves(uint8_t startId = 1, uint8_t endId = 10);

    // Quick scan for single device
    uint8_t quickScanForDevice(uint8_t startId = 1, uint8_t endId = 10);

    // Get detected slave IDs
    uint8_t* getActiveSlaves() { return activeSlaves; }
    uint8_t getActiveCount() { return activeCount; }

    // Read ALL slaves and add to JSON (RAW format)
    bool readAllSlaves(JsonArray& output);

    // Read specific slave with register range
    bool readSlaveRegisters(uint8_t slaveId, uint16_t startAddr, uint8_t count, JsonObject& output);

    // Configuration
    void setRegisterRange(uint16_t start, uint16_t end) {
        regStartAddr = start;
        regEndAddr = end;
    }
    void setFunctionCode(uint8_t fc) { functionCode = fc; }

private:
    uint8_t activeSlaves[247];     // Max 247 slaves
    uint8_t activeCount;

    uint16_t regStartAddr;         // Start register
    uint16_t regEndAddr;           // End register
    uint8_t functionCode;          // 3=Holding, 4=Input

    // Helper: ping slave to check if alive
    bool pingSlaveId(uint8_t slaveId);

    // Helper: read raw register(s)
    bool readRawRegisters(uint8_t slaveId, uint16_t addr, uint8_t count, uint16_t* buffer);
};

// ============================================================================
// ANALOG INPUT READER (4-20mA Generic)
// ============================================================================

struct AnalogChannelData {
    String channel;                // "A2" or "A3"
    uint8_t pin;
    uint16_t rawADC;
    float voltage;
    float currentMA;
};

class AnalogInputReader {
public:
    AnalogInputReader();

    // Initialize
    bool begin();

    // Read all analog channels
    void readAllChannels(JsonArray& output);

    // Read specific channel
    AnalogChannelData readChannel(uint8_t pin, const char* name);

private:
    uint8_t channels[2];           // GPIO1 (A2), GPIO2 (A3)
    String channelNames[2];

    // Convert ADC to voltage (ESP32: 12-bit ADC, 0-3.3V)
    float adcToVoltage(uint16_t adc);

    // Convert voltage to current (with 100Ω shunt)
    float voltageToCurrent(float voltage);
};

// ============================================================================
// DIGITAL INPUT READER
// ============================================================================

struct DigitalInputData {
    String name;                   // "PUMP_STATUS", etc.
    uint8_t pin;
    bool state;                    // HIGH or LOW
};

class DigitalInputReader {
public:
    DigitalInputReader();

    // Initialize
    bool begin();

    // Read all digital inputs
    void readAllInputs(JsonArray& output);

    // Read specific input
    DigitalInputData readInput(uint8_t pin, const char* name);

private:
    uint8_t inputs[4];             // GPIO14, etc.
    String inputNames[4];
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

    // Get individual readers
    RS485Scanner& getRS485() { return rs485; }
    AnalogInputReader& getAnalog() { return analog; }
    DigitalInputReader& getDigital() { return digital; }

private:
    RS485Scanner rs485;
    AnalogInputReader analog;
    DigitalInputReader digital;

    bool initialized;
    bool devicesScanned;
};

#endif // GENERIC_IO_H
