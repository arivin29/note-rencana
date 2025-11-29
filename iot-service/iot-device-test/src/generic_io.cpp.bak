#include "generic_io.h"
#include "config.h"
#include <HardwareSerial.h>

// External RS485 Serial (defined in main.cpp)
extern HardwareSerial RS485Serial;

// ============================================================================
// RS485 SCANNER IMPLEMENTATION
// ============================================================================

RS485Scanner::RS485Scanner()
    : activeCount(0), regStartAddr(1), regEndAddr(100), functionCode(3) {
}

bool RS485Scanner::begin() {
    Serial.println(F("[RS485] Initializing dynamic scanner..."));
    Serial.println(F("[RS485] Using RS485Serial from main.cpp"));
    return true;
}

bool RS485Scanner::readRawRegisters(uint8_t slaveId, uint16_t addr, uint8_t count, uint16_t* buffer) {
    // Build Modbus RTU request
    uint8_t request[8];
    request[0] = slaveId;
    request[1] = functionCode;  // 0x03 = Read Holding Registers
    request[2] = (addr >> 8) & 0xFF;
    request[3] = addr & 0xFF;
    request[4] = (count >> 8) & 0xFF;
    request[5] = count & 0xFF;

    // Calculate CRC16
    uint16_t crc = 0xFFFF;
    for (int i = 0; i < 6; i++) {
        crc ^= request[i];
        for (int j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    request[6] = crc & 0xFF;
    request[7] = (crc >> 8) & 0xFF;

    // Clear buffer
    while (RS485Serial.available()) RS485Serial.read();

    // Send request
    RS485Serial.write(request, 8);
    RS485Serial.flush();

    // Wait for response
    delay(100);

    int expectedLen = 5 + (count * 2);
    if (RS485Serial.available() < expectedLen) {
        return false;
    }

    // Read response
    uint8_t response[256];
    int len = RS485Serial.readBytes(response, expectedLen);

    // Validate response
    if (len < expectedLen || response[0] != slaveId || response[1] != functionCode) {
        return false;
    }

    // Extract data
    for (int i = 0; i < count; i++) {
        buffer[i] = (response[3 + i * 2] << 8) | response[4 + i * 2];
    }

    return true;
}

bool RS485Scanner::pingSlaveId(uint8_t slaveId) {
    // Try to read 1 register from address 1
    uint16_t buffer[1];
    
    for (int attempt = 0; attempt < 2; attempt++) {
        if (readRawRegisters(slaveId, 1, 1, buffer)) {
            return true;
        }
        delay(50);
    }
    
    return false;
}

uint8_t RS485Scanner::scanSlaves(uint8_t startId, uint8_t endId) {
    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  RS485 BUS SCAN                       ║"));
    Serial.println(F("╚════════════════════════════════════════╝"));
    Serial.printf("[RS485] Scanning Slave IDs %u to %u...\n", startId, endId);

    activeCount = 0;

    for (uint8_t slaveId = startId; slaveId <= endId; slaveId++) {
        Serial.printf("[RS485] Checking ID %3u... ", slaveId);
        
        if (pingSlaveId(slaveId)) {
            activeSlaves[activeCount++] = slaveId;
            Serial.println("✅ FOUND");
        } else {
            Serial.println("⏭");
        }

        delay(10);
    }

    Serial.println(F("----------------------------------------"));
    Serial.printf("[RS485] Found %u active slave(s)\n", activeCount);
    
    if (activeCount > 0) {
        Serial.print(F("[RS485] Active IDs: "));
        for (uint8_t i = 0; i < activeCount; i++) {
            Serial.print(activeSlaves[i]);
            if (i < activeCount - 1) Serial.print(", ");
        }
        Serial.println();
    }
    
    Serial.println(F("========================================\n"));

    return activeCount;
}

uint8_t RS485Scanner::quickScanForDevice(uint8_t startId, uint8_t endId) {
    Serial.println(F("[RS485] Quick scan..."));
    
    for (uint8_t slaveId = startId; slaveId <= endId; slaveId++) {
        if (pingSlaveId(slaveId)) {
            Serial.printf("[RS485] ✅ Found device at ID %u\n", slaveId);
            activeSlaves[0] = slaveId;
            activeCount = 1;
            return slaveId;
        }
    }
    
    Serial.println(F("[RS485] ❌ No device found"));
    activeCount = 0;
    return 0;
}

bool RS485Scanner::readSlaveRegisters(uint8_t slaveId, uint16_t startAddr, uint8_t count, JsonObject& output) {
    uint16_t buffer[125];  // Max 125 registers per request
    
    if (count > 125) count = 125;
    
    if (!readRawRegisters(slaveId, startAddr, count, buffer)) {
        return false;
    }

    // Add raw data to JSON
    JsonArray registers = output["registers"].to<JsonArray>();
    
    for (uint8_t i = 0; i < count; i++) {
        JsonObject reg = registers.add<JsonObject>();
        reg["addr"] = startAddr + i;
        reg["raw"] = buffer[i];
        reg["hex"] = String(buffer[i], HEX);
    }

    return true;
}

bool RS485Scanner::readAllSlaves(JsonArray& output) {
    if (activeCount == 0) {
        Serial.println(F("[RS485] No active slaves to read"));
        return false;
    }

    int successCount = 0;

    for (uint8_t i = 0; i < activeCount; i++) {
        uint8_t slaveId = activeSlaves[i];
        
        JsonObject slave = output.add<JsonObject>();
        slave["slave_id"] = slaveId;
        slave["protocol"] = "modbus_rtu";
        slave["function_code"] = functionCode;

        // Read register range
        uint16_t regCount = (regEndAddr - regStartAddr + 1);
        if (regCount > 125) regCount = 125;  // Modbus limit

        JsonArray registers = slave["registers"].to<JsonArray>();
        uint16_t buffer[125];

        bool success = readRawRegisters(slaveId, regStartAddr, regCount, buffer);
        slave["read_success"] = success;

        if (success) {
            for (uint16_t j = 0; j < regCount; j++) {
                JsonObject reg = registers.add<JsonObject>();
                reg["addr"] = regStartAddr + j;
                reg["raw"] = buffer[j];
                
                // Try to interpret as float32 (2 consecutive registers)
                if (j < regCount - 1) {
                    uint32_t combined = ((uint32_t)buffer[j] << 16) | buffer[j + 1];
                    float floatValue;
                    memcpy(&floatValue, &combined, sizeof(float));
                    
                    // Only add if value seems reasonable (not NaN/Inf)
                    if (!isnan(floatValue) && !isinf(floatValue) && abs(floatValue) < 1e6) {
                        reg["float"] = floatValue;
                    }
                }
            }
            successCount++;
        }
    }

    Serial.printf("[RS485] Read %d/%d slaves successfully\n", successCount, activeCount);
    return (successCount > 0);
}

// ============================================================================
// ANALOG INPUT READER IMPLEMENTATION
// ============================================================================

AnalogInputReader::AnalogInputReader() {
    channels[0] = 1;  // GPIO1 = A2
    channels[1] = 2;  // GPIO2 = A3
    channelNames[0] = "A2";
    channelNames[1] = "A3";
}

bool AnalogInputReader::begin() {
    Serial.println(F("[Analog] Initializing analog input reader..."));
    
    for (int i = 0; i < 2; i++) {
        pinMode(channels[i], INPUT);
    }
    
    Serial.println(F("[Analog] ✅ Analog reader initialized"));
    return true;
}

float AnalogInputReader::adcToVoltage(uint16_t adc) {
    // ESP32 12-bit ADC: 0-4095 = 0-3.3V
    return (adc / 4095.0) * 3.3;
}

float AnalogInputReader::voltageToCurrent(float voltage) {
    // I = V / R (100Ω shunt resistor)
    // 4-20mA range
    float current = (voltage / 100.0) * 1000.0;  // Convert to mA
    return current;
}

AnalogChannelData AnalogInputReader::readChannel(uint8_t pin, const char* name) {
    AnalogChannelData data;
    data.pin = pin;
    data.channel = String(name);
    data.rawADC = analogRead(pin);
    data.voltage = adcToVoltage(data.rawADC);
    data.currentMA = voltageToCurrent(data.voltage);
    
    return data;
}

void AnalogInputReader::readAllChannels(JsonArray& output) {
    for (int i = 0; i < 2; i++) {
        AnalogChannelData data = readChannel(channels[i], channelNames[i].c_str());
        
        JsonObject ch = output.add<JsonObject>();
        ch["channel"] = data.channel;
        ch["pin"] = data.pin;
        ch["raw_adc"] = data.rawADC;
        ch["voltage"] = data.voltage;
        ch["current_ma"] = data.currentMA;
    }
}

// ============================================================================
// DIGITAL INPUT READER IMPLEMENTATION
// ============================================================================

DigitalInputReader::DigitalInputReader() {
    inputs[0] = 14;  // GPIO14 = PUMP_STATUS
    inputNames[0] = "PUMP_STATUS";
}

bool DigitalInputReader::begin() {
    Serial.println(F("[Digital] Initializing digital input reader..."));
    
    for (int i = 0; i < 1; i++) {  // Only 1 digital input for now
        pinMode(inputs[i], INPUT);
    }
    
    Serial.println(F("[Digital] ✅ Digital reader initialized"));
    return true;
}

DigitalInputData DigitalInputReader::readInput(uint8_t pin, const char* name) {
    DigitalInputData data;
    data.pin = pin;
    data.name = String(name);
    data.state = digitalRead(pin);
    
    return data;
}

void DigitalInputReader::readAllInputs(JsonArray& output) {
    for (int i = 0; i < 1; i++) {
        DigitalInputData data = readInput(inputs[i], inputNames[i].c_str());
        
        JsonObject inp = output.add<JsonObject>();
        inp["name"] = data.name;
        inp["pin"] = data.pin;
        inp["state"] = data.state;
        inp["value"] = data.state ? "HIGH" : "LOW";
    }
}

// ============================================================================
// GENERIC I/O MANAGER IMPLEMENTATION
// ============================================================================

GenericIOManager::GenericIOManager()
    : initialized(false), devicesScanned(false) {
}

bool GenericIOManager::begin() {
    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  GENERIC I/O MANAGER                  ║"));
    Serial.println(F("╚════════════════════════════════════════╝"));

    // Initialize RS485 Scanner
    if (!rs485.begin()) {
        Serial.println(F("[GenericIO] ❌ RS485 Scanner init failed"));
        return false;
    }

    // Initialize Analog Reader
    if (!analog.begin()) {
        Serial.println(F("[GenericIO] ❌ Analog Reader init failed"));
        return false;
    }

    // Initialize Digital Reader
    if (!digital.begin()) {
        Serial.println(F("[GenericIO] ❌ Digital Reader init failed"));
        return false;
    }

    initialized = true;
    Serial.println(F("[GenericIO] ✅ Generic I/O Manager initialized"));
    Serial.println(F("========================================\n"));

    return true;
}

void GenericIOManager::scanAllBuses() {
    if (!initialized) {
        Serial.println(F("[GenericIO] ⚠️ Not initialized"));
        return;
    }

    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  SCANNING ALL I/O BUSES               ║"));
    Serial.println(F("╚════════════════════════════════════════╝\n"));

    // Scan RS485 bus (Slave IDs 1-10)
    rs485.setRegisterRange(1, 100);  // Read registers 1-100
    rs485.scanSlaves(1, 10);

    devicesScanned = true;

    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  SCAN COMPLETE                        ║"));
    Serial.println(F("╚════════════════════════════════════════╝\n"));
}

void GenericIOManager::generateRawTelemetry(JsonDocument& doc) {
    if (!initialized) {
        Serial.println(F("[GenericIO] ⚠️ Not initialized, skipping telemetry generation"));
        return;
    }

    // Device metadata
    doc["device_type"] = "ESP32-GenericIO";
    doc["firmware_version"] = "2.0.0-dynamic";
    doc["timestamp"] = millis();

    // RS485 data (all detected slaves)
    JsonArray rs485Array = doc["rs485"].to<JsonArray>();
    if (rs485.getActiveCount() > 0) {
        rs485.readAllSlaves(rs485Array);
    } else {
        doc["rs485_status"] = "no_slaves_detected";
    }

    // Analog inputs (4-20mA)
    JsonArray analogArray = doc["analog"].to<JsonArray>();
    analog.readAllChannels(analogArray);

    // Digital inputs
    JsonArray digitalArray = doc["digital"].to<JsonArray>();
    digital.readAllInputs(digitalArray);

    // System info
    JsonObject system = doc["system"].to<JsonObject>();
    system["free_heap"] = ESP.getFreeHeap();
    system["uptime_ms"] = millis();
    system["devices_scanned"] = devicesScanned;

    Serial.println(F("[GenericIO] ✅ Raw telemetry generated"));
}

void GenericIOManager::printDeviceSummary() {
    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  DEVICE SUMMARY                       ║"));
    Serial.println(F("╚════════════════════════════════════════╝"));
    
    Serial.println(F("\n📡 RS485 Bus:"));
    if (rs485.getActiveCount() > 0) {
        Serial.printf("  ✅ %u slave device(s) detected\n", rs485.getActiveCount());
        Serial.print(F("  IDs: "));
        for (uint8_t i = 0; i < rs485.getActiveCount(); i++) {
            Serial.print(rs485.getActiveSlaves()[i]);
            if (i < rs485.getActiveCount() - 1) Serial.print(", ");
        }
        Serial.println();
    } else {
        Serial.println(F("  ⚠️ No devices detected"));
    }

    Serial.println(F("\n📊 Analog Inputs:"));
    Serial.println(F("  - GPIO1 (A2): 4-20mA Sensor"));
    Serial.println(F("  - GPIO2 (A3): 4-20mA Sensor"));

    Serial.println(F("\n🔘 Digital Inputs:"));
    Serial.println(F("  - GPIO14: PUMP_STATUS"));

    Serial.println(F("\n════════════════════════════════════════\n"));
}
