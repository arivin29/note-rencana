#include "generic_io.h"
#include "config.h"
#include <Adafruit_INA219.h>
#include <Adafruit_ADS1X15.h>

// Global Modbus instance

// NOTE: ModbusMaster library removed - RS485 now uses raw Modbus RTU in main.cpp

// ============================================================================
// RS485 SCANNER STUB (disabled - using raw Modbus in main.cpp)
// ============================================================================

RS485Scanner::RS485Scanner() {
    activeCount = 0;
    regStartAddr = 0;
    regEndAddr = 100;
    functionCode = 4;
}

bool RS485Scanner::begin() {
    Serial.println(F("[RS485] Using raw Modbus (library disabled)"));
    return true;
}

uint8_t RS485Scanner::scanSlaves(uint8_t, uint8_t) { return 0; }
bool RS485Scanner::pingSlaveId(uint8_t) { return false; }
bool RS485Scanner::readAllSlaves(JsonArray&) { return false; }
bool RS485Scanner::readSlaveRegisters(uint8_t, uint16_t, uint8_t, JsonObject&) { return false; }
void RS485Scanner::setRegisterRange(uint16_t start, uint16_t end) {
    regStartAddr = start;
    regEndAddr = end;
}


// ============================================================================
// ANALOG INPUT READER IMPLEMENTATION (4-20mA via ESP32 GPIO1/GPIO2)
// ============================================================================

AnalogInputReader::AnalogInputReader() {
    channels[0] = ANALOG_CURRENT_A2_PIN;  // GPIO1
    channels[1] = ANALOG_CURRENT_A3_PIN;  // GPIO2
    channelNames[0] = "gpio1";
    channelNames[1] = "gpio2";
}

bool AnalogInputReader::begin() {
    #if DEBUG_SENSORS
    Serial.println(F("[Analog] Initializing 4-20mA reader (ESP32 GPIO1/GPIO2)..."));
    #endif

    pinMode(ANALOG_CURRENT_A2_PIN, INPUT);
    pinMode(ANALOG_CURRENT_A3_PIN, INPUT);

    return true;
}

void AnalogInputReader::readAllChannels(JsonArray& output) {
    for (uint8_t i = 0; i < 2; i++) {
        // Read RAW ADC value from ESP32 (12-bit: 0-4095)
        uint16_t rawValue = analogRead(channels[i]);
        
        // DEBUG: Print raw value only
        Serial.printf("[Analog] %s (GPIO%d): raw=%d\n", 
                      channelNames[i].c_str(), channels[i], rawValue);
        
        JsonObject channel = output.add<JsonObject>();
        channel["ch"] = channelNames[i];
        channel["raw"] = rawValue;        // RAW 12-bit from ESP32 only
    }
}

// ============================================================================
// ADC 16-BIT READER IMPLEMENTATION (ADS1115)
// ============================================================================

ADC16Reader::ADC16Reader() {
    available = false;
    i2cAddress = ADS1115_I2C_ADDRESS;
    currentGain = GAIN_TWOTHIRDS;  // ±6.144V
}

bool ADC16Reader::begin() {
    #if DEBUG_SENSORS
    Serial.println(F("[ADC16] Initializing ADS1115..."));
    #endif

    Adafruit_ADS1115 ads;
    ads.setGain((adsGain_t)currentGain);  // Cast to proper type

    if (!ads.begin(i2cAddress)) {
        #if DEBUG_SENSORS
        Serial.println(F("[ADC16] ADS1115 not found!"));
        #endif
        available = false;
        return false;
    }

    available = true;

    #if DEBUG_SENSORS
    Serial.println(F("[ADC16] ADS1115 initialized successfully"));
    Serial.print(F("[ADC16] I2C Address: 0x"));
    Serial.println(i2cAddress, HEX);
    #endif

    return true;
}

void ADC16Reader::readAllChannels(JsonArray& output) {
    if (!available) {
        #if DEBUG_SENSORS
        Serial.println(F("[ADC16] ADS1115 not available, skipping"));
        #endif
        return;
    }

    Adafruit_ADS1115 ads;
    ads.setGain((adsGain_t)currentGain);
    ads.begin(i2cAddress);

    // Read all 4 channels: A0, A1, A2, A3
    for (uint8_t ch = 0; ch < 4; ch++) {
        String channelName = "A" + String(ch);
        
        // Read RAW 16-bit signed value directly from ADS1115 chip
        int16_t rawValue = ads.readADC_SingleEnded(ch);
        
        // Calculate voltage based on gain setting
        // GAIN_TWOTHIRDS = ±6.144V range, LSB = 0.1875mV
        float voltage = rawValue * 0.0001875;
        
        // Simple connection detection
        bool connected = (abs(rawValue) >= 10 && voltage <= 6.0);
        
        JsonObject channel = output.add<JsonObject>();
        channel["ch"] = channelName;
        channel["raw"] = rawValue;           // RAW 16-bit signed from ADS1115
        channel["volt"] = voltage;           // Calculated voltage
        channel["connected"] = connected;    // Connection status

        #if DEBUG_SENSORS
        Serial.printf("[ADC16] %s: %6d raw | %0.4fV\n", 
                      channelName.c_str(), rawValue, voltage);
        #endif
    }
}

ADC16ChannelData ADC16Reader::readChannel(uint8_t channel) {
    ADC16ChannelData data;
    data.channelNum = channel;
    data.channel = (channel == 0) ? "A0" : "A1";
    data.rawADC = 0;
    data.voltage = 0.0;
    data.connected = false;

    if (!available) {
        return data;
    }

    Adafruit_ADS1115 ads;
    ads.setGain((adsGain_t)currentGain);  // Cast to proper type
    ads.begin(i2cAddress);

    // Read ADC value
    data.rawADC = ads.readADC_SingleEnded(channel);

    // Convert to voltage
    data.voltage = rawToVoltage(data.rawADC);

    // Check if sensor is connected
    data.connected = isSensorConnected(data.rawADC, data.voltage);

    return data;
}

void ADC16Reader::setGain(uint8_t gain) {
    currentGain = gain;

    #if DEBUG_SENSORS
    Serial.print(F("[ADC16] Gain set to: "));
    Serial.println(gain);
    #endif
}

float ADC16Reader::rawToVoltage(int16_t raw) {
    // ADS1115 resolution: 16-bit signed
    // GAIN_TWOTHIRDS: ±6.144V range
    // LSB = 6.144V / 32768 = 0.1875 mV

    float lsb = 0.0001875;  // 0.1875 mV per bit (default for GAIN_TWOTHIRDS)

    switch ((adsGain_t)currentGain) {
        case GAIN_TWOTHIRDS:  // ±6.144V
            lsb = 0.1875 / 1000.0;
            break;
        case GAIN_ONE:        // ±4.096V
            lsb = 0.125 / 1000.0;
            break;
        case GAIN_TWO:        // ±2.048V
            lsb = 0.0625 / 1000.0;
            break;
        case GAIN_FOUR:       // ±1.024V
            lsb = 0.03125 / 1000.0;
            break;
        case GAIN_EIGHT:      // ±0.512V
            lsb = 0.015625 / 1000.0;
            break;
        case GAIN_SIXTEEN:    // ±0.256V
            lsb = 0.0078125 / 1000.0;
            break;
    }

    return raw * lsb;
}

bool ADC16Reader::isSensorConnected(int16_t raw, float voltage) {
    // Heuristic to detect if sensor is connected:
    // 1. If raw value is 0 or very close to 0 → likely no sensor
    // 2. If voltage is exactly max (6.144V) → likely open circuit
    // 3. Otherwise assume connected

    if (abs(raw) < 10) {
        return false;  // Too close to zero
    }

    if (voltage > 6.0) {
        return false;  // Open circuit (max voltage)
    }

    return true;
}

// ============================================================================
// I2C SCANNER IMPLEMENTATION
// ============================================================================

I2CScanner::I2CScanner() {
    activeCount = 0;
}

bool I2CScanner::begin() {
    #if DEBUG_SENSORS
    Serial.println(F("[I2C] Initializing I2C scanner..."));
    #endif

    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

    return true;
}

uint8_t I2CScanner::scanDevices() {
    #if DEBUG_SENSORS
    Serial.println(F("[I2C] Scanning bus..."));
    #endif

    activeCount = 0;

    for (uint8_t addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        uint8_t error = Wire.endTransmission();

        if (error == 0) {
            activeAddresses[activeCount++] = addr;

            #if DEBUG_SENSORS
            Serial.print(F("  [✓] Device at 0x"));
            Serial.print(addr, HEX);
            Serial.print(F(" ("));
            Serial.print(detectDeviceType(addr));
            Serial.println(F(")"));
            #endif
        }
    }

    #if DEBUG_SENSORS
    Serial.print(F("[I2C] Found "));
    Serial.print(activeCount);
    Serial.println(F(" devices"));
    #endif

    return activeCount;
}

void I2CScanner::readAllDevices(JsonArray& output) {
    for (uint8_t i = 0; i < activeCount; i++) {
        uint8_t addr = activeAddresses[i];

        JsonObject device = output.add<JsonObject>();
        device["addr"] = addr;
        device["type"] = detectDeviceType(addr);

        JsonObject data = device["data"].to<JsonObject>();
        readDevice(addr, data);
    }
}

bool I2CScanner::readDevice(uint8_t address, JsonObject& output) {
    // Check device type and read accordingly
    String deviceType = detectDeviceType(address);

    if (deviceType == "INA219") {
        return readINA219(address, output);
    }

    // Unknown device - no data to read
    output["status"] = "unknown";
    return false;
}

String I2CScanner::detectDeviceType(uint8_t address) {
    // Common I2C device detection by address
    if (address == 0x48 || address == 0x49 || address == 0x4A || address == 0x4B) {
        return "ADS1115";  // 16-bit ADC (0x48-0x4B)
    }
    else if (address >= 0x40 && address <= 0x4F) {
        return "INA219";   // INA219 battery monitor (0x40-0x4F)
    }
    else if (address == 0x68 || address == 0x69) {
        return "MPU6050";  // Accelerometer/Gyro
    }
    else if (address == 0x76 || address == 0x77) {
        return "BME280";   // Temp/Humidity/Pressure
    }

    return "Unknown";
}

bool I2CScanner::readINA219(uint8_t address, JsonObject& output) {
    Adafruit_INA219 ina219(address);

    if (!ina219.begin()) {
        output["error"] = "init_failed";
        return false;
    }

    // Read values
    output["voltage"] = ina219.getBusVoltage_V();
    output["current"] = ina219.getCurrent_mA();
    output["power"] = ina219.getPower_mW();

    return true;
}

// ============================================================================
// GENERIC I/O MANAGER IMPLEMENTATION
// ============================================================================

GenericIOManager::GenericIOManager() {
    initialized = false;
}

bool GenericIOManager::begin() {
    Serial.println(F("[GenericIO] Initializing Generic I/O Manager..."));

    // Initialize all subsystems
    rs485.begin();
    analog.begin();
    adc16.begin();  // ADS1115 16-bit ADC
    i2c.begin();

    initialized = true;

    Serial.println(F("[GenericIO] All I/O initialized"));

    return true;
}

void GenericIOManager::scanAllBuses() {
    Serial.println(F("\n[GenericIO] Scanning all buses for devices..."));

    // Scan RS485 (slave IDs 1-10 by default, configurable)
    uint8_t rs485Count = rs485.scanSlaves(1, 10);

    // Scan I2C bus
    uint8_t i2cCount = i2c.scanDevices();

    Serial.println(F("[GenericIO] Scan complete"));
    printDeviceSummary();
}

void GenericIOManager::generateRawTelemetry(JsonDocument& doc) {
    // === RS485 Devices ===
    JsonArray rs485Array = doc["rs485"].to<JsonArray>();
    rs485.readAllSlaves(rs485Array);

    // === Analog Inputs (4-20mA, A2/A3) ===
    JsonArray analogArray = doc["analog"].to<JsonArray>();
    analog.readAllChannels(analogArray);

    // === ADC 16-bit (ADS1115, A0/A1) ===
    if (adc16.isAvailable()) {
        JsonArray adc16Array = doc["adc16"].to<JsonArray>();
        adc16.readAllChannels(adc16Array);
    }

    // === I2C Devices ===
    JsonArray i2cArray = doc["i2c"].to<JsonArray>();
    i2c.readAllDevices(i2cArray);

    // === Digital Inputs ===
    JsonObject digitalObj = doc["digital"].to<JsonObject>();
    readDigitalInputs(digitalObj);
}

void GenericIOManager::readDigitalInputs(JsonObject& output) {
    // Read pump status from GPIO38 (IO_DIGITAL_IN_1_PIN)
    bool pumpStatus = digitalRead(IO_DIGITAL_IN_1_PIN);
    output["pump_status"] = pumpStatus;  // true=ON, false=OFF
    output["pump_pin"] = IO_DIGITAL_IN_1_PIN;

    #if DEBUG_SENSORS
    Serial.print(F("[Digital] Pump Status (GPIO"));
    Serial.print(IO_DIGITAL_IN_1_PIN);
    Serial.print(F("): "));
    Serial.println(pumpStatus ? "ON" : "OFF");
    #endif
}

void GenericIOManager::printDeviceSummary() {
    Serial.println(F("\n========== DETECTED DEVICES SUMMARY =========="));

    // RS485
    Serial.print(F("RS485 Slaves: "));
    Serial.println(rs485.getActiveCount());
    for (uint8_t i = 0; i < rs485.getActiveCount(); i++) {
        Serial.print(F("  - Slave ID: "));
        Serial.println(rs485.getActiveSlaves()[i]);
    }

    // Analog 12-bit (4-20mA)
    Serial.println(F("Analog 12-bit (4-20mA): A2, A3 (always available)"));

    // ADC 16-bit (ADS1115)
    Serial.print(F("ADC 16-bit (ADS1115): "));
    if (adc16.isAvailable()) {
        Serial.println(F("A0, A1 (available)"));
    } else {
        Serial.println(F("Not detected"));
    }

    // I2C
    Serial.print(F("I2C Devices: "));
    Serial.println(i2c.getActiveCount());
    for (uint8_t i = 0; i < i2c.getActiveCount(); i++) {
        uint8_t addr = i2c.getActiveAddresses()[i];
        Serial.print(F("  - 0x"));
        Serial.print(addr, HEX);
        Serial.print(F(" ("));
        Serial.print(i2c.detectDeviceType(addr));
        Serial.println(F(")"));
    }

    Serial.println(F("==============================================\n"));
}
