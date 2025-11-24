// ============================================================================
// ESP32-S3 GENERIC IOT FIRMWARE - FULL VERSION
// LTE + MQTT + All Sensors (Analog, ADC16, I2C, Digital, RS485)
// RS485 using proven raw Modbus RTU implementation
// ============================================================================

#define TINY_GSM_MODEM_SIM7600

#include <Arduino.h>
#include <TinyGsmClient.h>

#include "config.h"
#include "lte_manager.h"
#include "mqtt_manager.h"
#include "connection_manager.h"
#include "telemetry.h"
#include "time_manager.h"
#include "generic_io.h"

// ============================================================================
// HARDWARE SERIAL FOR SIM7600
// ============================================================================

HardwareSerial simSerial(1);

// ============================================================================
// RS485 SERIAL (Raw Modbus RTU - no library)
// ============================================================================

HardwareSerial RS485Serial(2);
uint8_t modbusResponseBuffer[128];

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================

TinyGsm modem(simSerial);
TinyGsmClient gsmClient(modem, 0);
TinyGsmClient diagClient(modem, 1);

LTEManager lteManager;
MQTTManager mqttManager(gsmClient);
ConnectionManager connectionManager(lteManager, mqttManager);
TimeManager timeManager;
GenericIOManager ioManager;

String DEVICE_ID;
unsigned long lastTelemetrySent = 0;
bool bootNotificationSent = false;

// ============================================================================
// RAW MODBUS RTU FUNCTIONS (Proven working from test)
// ============================================================================

uint16_t modbusCRC(const uint8_t* buffer, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; i++) {
        crc ^= buffer[i];
        for (uint8_t bit = 0; bit < 8; bit++) {
            if (crc & 0x0001) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

void rs485Write(const uint8_t* buffer, size_t length) {
    if (RS485_DE_RE_PIN >= 0) {
        digitalWrite(RS485_DE_RE_PIN, HIGH);
        delayMicroseconds(20);
    }

    RS485Serial.write(buffer, length);
    RS485Serial.flush();

    if (RS485_DE_RE_PIN >= 0) {
        delayMicroseconds(20);
        digitalWrite(RS485_DE_RE_PIN, LOW);
    }
}

void clearRS485Input() {
    while (RS485Serial.available()) {
        RS485Serial.read();
    }
}

size_t readModbusResponse(uint8_t* buffer, size_t bufferSize, uint32_t timeoutMs) {
    size_t index = 0;
    uint32_t start = millis();

    while ((millis() - start) < timeoutMs) {
        while (RS485Serial.available()) {
            if (index < bufferSize) {
                buffer[index++] = RS485Serial.read();
            } else {
                RS485Serial.read();
            }
            start = millis();
        }
    }

    return index;
}

void sendReadHoldingRegisters(uint8_t address, uint16_t startRegister, uint16_t count) {
    uint8_t frame[8];
    frame[0] = address;
    frame[1] = 0x03;  // Function: Read Holding Registers
    frame[2] = startRegister >> 8;
    frame[3] = startRegister & 0xFF;
    frame[4] = count >> 8;
    frame[5] = count & 0xFF;

    uint16_t crc = modbusCRC(frame, 6);
    frame[6] = crc & 0xFF;
    frame[7] = (crc >> 8) & 0xFF;

    rs485Write(frame, 8);
}

// ============================================================================
// RS485 DATA READING (Public - for telemetry)
// ============================================================================

bool readRS485Register(uint8_t slaveId, uint16_t regAddr, uint16_t count, uint16_t* output) {
    clearRS485Input();
    sendReadHoldingRegisters(slaveId, regAddr, count);
    
    size_t frameLen = readModbusResponse(modbusResponseBuffer, sizeof(modbusResponseBuffer), 300);
    
    if (frameLen < 5) return false;
    if (modbusResponseBuffer[0] != slaveId) return false;
    if (modbusResponseBuffer[1] & 0x80) return false;  // Exception
    
    uint8_t dataBytes = modbusResponseBuffer[2];
    if (dataBytes != count * 2) return false;
    
    // Extract data
    for (uint16_t i = 0; i < count; i++) {
        output[i] = (modbusResponseBuffer[3 + i*2] << 8) | modbusResponseBuffer[4 + i*2];
    }
    
    return true;
}

// Helper: Read Float32 from 2 registers (BADC byte order)
float readRS485Float32(uint8_t slaveId, uint16_t regAddr) {
    uint16_t regs[2];
    if (!readRS485Register(slaveId, regAddr, 2, regs)) {
        return NAN;
    }
    
    // BADC byte order for TUF-2000M
    uint8_t bytes[4];
    bytes[0] = regs[0] & 0xFF;      // B
    bytes[1] = (regs[0] >> 8) & 0xFF; // A
    bytes[2] = regs[1] & 0xFF;      // D
    bytes[3] = (regs[1] >> 8) & 0xFF; // C
    
    float value;
    memcpy(&value, bytes, 4);
    return value;
}

// Helper: Read Uint32 from 2 registers (swap words)
uint32_t readRS485Uint32(uint8_t slaveId, uint16_t regAddr) {
    uint16_t regs[2];
    if (!readRS485Register(slaveId, regAddr, 2, regs)) {
        return 0;
    }
    
    // Swap words: low word first, then high word
    return ((uint32_t)regs[1] << 16) | regs[0];
}

// ============================================================================
// MODBUS SETUP
// ============================================================================

static void setupModbus() {
    Serial.println("[RS485] Initializing...");
    
    if (RS485_DE_RE_PIN >= 0) {
        pinMode(RS485_DE_RE_PIN, OUTPUT);
        digitalWrite(RS485_DE_RE_PIN, LOW);
    } else {
        Serial.println("[RS485] Auto-direction MAX485 (no DE/RE control)");
    }
    
    RS485Serial.begin(MODBUS_BAUDRATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);
    
    Serial.printf("[RS485] UART: TX=GPIO%d, RX=GPIO%d, Baud=%d\n", 
                  RS485_TX_PIN, RS485_RX_PIN, MODBUS_BAUDRATE);
    Serial.println("[RS485] ✅ Ready");
}

// ============================================================================
// UTILITIES
// ============================================================================

static String buildDeviceId() {
    uint64_t chipMac = ESP.getEfuseMac();
    char macStr[13];
    sprintf(macStr, "%012llX", chipMac);
    String id = String(OWNER_CODE) + "-" + macStr;
    id.toUpperCase();
    return id;
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n========================================");
    Serial.println("ESP32-S3 GENERIC IOT FIRMWARE");
    Serial.println("Full Stack: LTE + MQTT + All Sensors");
    Serial.println("========================================");

    DEVICE_ID = buildDeviceId();
    Serial.print("Device ID: ");
    Serial.println(DEVICE_ID);

    Serial.println("\n[1/6] Initializing Time Manager...");
    timeManager.begin();
    timeManager.printStatus();

    Serial.println("\n[2/6] Setting up RS485/Modbus...");
    setupModbus();
    delay(500);

    Serial.println("\n[3/6] Initializing Generic I/O...");
    ioManager.begin();

    Serial.println("\n[4/6] Powering LTE stack...");
    bool lteReady = lteManager.begin();
    Serial.println(lteReady ? "[LTE] ✅ Ready" : "[LTE] ❌ Failed (auto-retry active)");

    Serial.println("\n[5/6] Preparing MQTT manager...");
    mqttManager.begin(MQTT_BROKER, MQTT_PORT, DEVICE_ID.c_str());

    Serial.println("\n[6/6] Starting Connection Manager...");
    connectionManager.begin();

    Serial.println("\n========================================");
    Serial.println("Initialization complete. Monitoring connections...");
    Serial.println("========================================\n");
    
    // Post-init: Scan devices (after LTE stable)
    Serial.println("[POST-INIT] Scanning I2C devices...");
    ioManager.getI2C().scanDevices();
    
    Serial.println("\n[POST-INIT] Testing RS485 device...");
    // Simple ping test
    clearRS485Input();
    uint8_t frame[8] = {1, 0x03, 0, 0, 0, 1, 0, 0};
    uint16_t crc = modbusCRC(frame, 6);
    frame[6] = crc & 0xFF;
    frame[7] = (crc >> 8) & 0xFF;
    rs485Write(frame, 8);
    
    delay(100);
    size_t resp = readModbusResponse(modbusResponseBuffer, sizeof(modbusResponseBuffer), 300);
    if (resp > 0 && modbusResponseBuffer[0] == 1) {
        Serial.println("[RS485] ✅ Device responding at address 1");
    } else {
        Serial.println("[RS485] ⚠️ No device detected (will retry in loop)");
    }
    
    ioManager.printDeviceSummary();
    Serial.println();
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
    connectionManager.loop();

    if (connectionManager.isFullyConnected()) {
        if (!bootNotificationSent) {
            sendBootNotification();
            bootNotificationSent = true;
        }

        unsigned long now = millis();
        if (now - lastTelemetrySent >= TELEMETRY_INTERVAL_MS) {
            lastTelemetrySent = now;
            sendFullTelemetry();
        }
    }

    delay(100);
}
