#include <Arduino.h>

// ============================================================================
// TUF-2000M Ultrasonic Flow Meter - ESP32-S3 RS485 Reader + LTE
// ============================================================================
// Reads key registers from TUF-2000M via Modbus RTU protocol
// Sends data via LTE (HTTP POST)
// With Auto-Reconnect Connection Manager + Generic I/O + Telemetry
// ============================================================================

#include "config.h"
#include "lte_manager.h"
#include "connection_manager.h"
#include "generic_io.h"
#include "telemetry.h"

// --- RS485 Configuration (FIXED) --------------------------------------------
constexpr int RS485_TX_PIN = 15;                      // TX2 -> MAX485 DI (A+)
constexpr int RS485_RX_PIN = 16;                      // RX2 <- MAX485 RO (B-)
constexpr int RS485_DE_RE_PIN = -1;                   // Driver Enable (not used)
constexpr uint32_t RS485_BAUD = 9600;                 // TUF-2000M: 9600 8N1

// --- Modbus Configuration ---------------------------------------------------
constexpr uint8_t MODBUS_DEVICE_ADDRESS = 1;          // TUF-2000M Slave ID
constexpr uint32_t MODBUS_RESPONSE_TIMEOUT = 300;     // ms
constexpr uint32_t SCAN_INTERVAL = 5000;               // ms between reads
constexpr bool PRINT_RAW_FRAMES = false;               // Debug: show raw hex
constexpr bool DEBUG_BYTE_ORDER = false;               // Debug: show all byte order variants

// --- LTE Configuration ------------------------------------------------------
constexpr bool ENABLE_LTE = true;                      // Set to false to disable LTE
constexpr bool ENABLE_CONNECTION_MANAGER = true;       // Enable auto-reconnect

// ============================================================================
// Data Structures
// ============================================================================

enum class ValueKind {
    Float32,      // IEEE 754 single precision (4 bytes)
    Uint32,       // Unsigned 32-bit integer (4 bytes)
    Uint16,       // Unsigned 16-bit integer (2 bytes)
    Hex16,        // 16-bit hex display
    Raw           // Raw hex bytes
};

struct RegisterDef {
    const char* label;           // Display name
    uint16_t regNumber;          // Register address (1-based per manual)
    uint8_t wordCount;           // Number of 16-bit words to read
    ValueKind kind;              // Data type
    bool swapWords;              // Byte swap for Float32/Uint32
    const char* unit;            // Unit string (optional)
};

// ============================================================================
// TUF-2000M Register Map
// ============================================================================

// ============================================================================
// CATEGORY 1: SENSOR DATA (Primary Measurements)
// Data utama dari sensor flowmeter - untuk monitoring real-time
// ============================================================================
const RegisterDef kSensorRegisters[] = {
    {"Flow rate",             1,   2, ValueKind::Float32, true,  "m³/h"},
    {"Flow velocity",         5,   2, ValueKind::Float32, true,  "m/s"},
    {"Positive totalizer",    9,   2, ValueKind::Uint32,  true,  "m³"},
    {"Negative totalizer",    13,  2, ValueKind::Uint32,  true,  "m³"},
    {"Net totalizer",         25,  2, ValueKind::Uint32,  true,  "m³"},
};

// ============================================================================
// CATEGORY 2: SYSTEM STATUS (Health & Diagnostics)
// Status sistem dan kualitas sinyal - untuk troubleshooting
// ============================================================================
const RegisterDef kSystemRegisters[] = {
    {"Error code",            72,  1, ValueKind::Hex16,   false, ""},
    {"Signal quality",        92,  1, ValueKind::Uint16,  false, "%"},
    {"Upstream strength",     93,  1, ValueKind::Uint16,  false, "raw"},
    {"Downstream strength",   94,  1, ValueKind::Uint16,  false, "raw"},
    {"Working time",          103, 2, ValueKind::Uint32,  true,  "s"},
    {"Display window",        158, 1, ValueKind::Uint16,  false, "Mxx"},
};

// ============================================================================
// CATEGORY 3: ADDITIONAL INFO (Optional but useful)
// Informasi tambahan untuk analisis mendalam
// ============================================================================
const RegisterDef kAdditionalRegisters[] = {
    {"Fluid sound speed",     7,   2, ValueKind::Float32, true,  "m/s"},
    {"Temperature T1",        33,  2, ValueKind::Float32, true,  "°C"},
    {"Temperature T2",        35,  2, ValueKind::Float32, true,  "°C"},
    {"Temperature diff",      89,  2, ValueKind::Float32, true,  "°C"},
    {"Travel time ratio",     97,  2, ValueKind::Float32, true,  "%"},
    {"Reynolds number",       99,  2, ValueKind::Float32, true,  ""},
};

// ============================================================================
// CATEGORY 4: CONFIGURATION (Device Settings)
// Konfigurasi device - untuk validasi setup dan troubleshooting
// ============================================================================
const RegisterDef kConfigRegisters[] = {
    // Pipe Configuration
    {"Pipe inner diameter",   221, 2, ValueKind::Float32, true,  "mm"},
    {"Transducer spacing",    227, 2, ValueKind::Float32, true,  "mm"},  // ✅ VERIFIED: R227

    // Flow Measurement Settings (high register addresses - may not be available on all models)
    {"Flow unit",             1437, 1, ValueKind::Uint16, false, ""},
    {"Totalizer unit",        1438, 1, ValueKind::Uint16, false, ""},

    // Communication Settings
    {"Modbus address",        1442, 1, ValueKind::Uint16, false, ""},  // ✅ VERIFIED: R1442
};

// Combined table for easy iteration
const RegisterDef kRegisterTable[] = {
    // SENSOR DATA (5 items)
    {"Flow rate",             1,   2, ValueKind::Float32, true,  "m³/h"},
    {"Flow velocity",         5,   2, ValueKind::Float32, true,  "m/s"},
    {"Positive totalizer",    9,   2, ValueKind::Uint32,  true,  "m³"},
    {"Negative totalizer",    13,  2, ValueKind::Uint32,  true,  "m³"},
    {"Net totalizer",         25,  2, ValueKind::Uint32,  true,  "m³"},

    // SYSTEM STATUS (6 items)
    {"Error code",            72,  1, ValueKind::Hex16,   false, ""},
    {"Signal quality",        92,  1, ValueKind::Uint16,  false, "%"},
    {"Upstream strength",     93,  1, ValueKind::Uint16,  false, "raw"},
    {"Downstream strength",   94,  1, ValueKind::Uint16,  false, "raw"},
    {"Working time",          103, 2, ValueKind::Uint32,  true,  "s"},
    {"Display window",        158, 1, ValueKind::Uint16,  false, "Mxx"},

    // ADDITIONAL INFO (6 items)
    {"Fluid sound speed",     7,   2, ValueKind::Float32, true,  "m/s"},
    {"Temperature T1",        33,  2, ValueKind::Float32, true,  "°C"},
    {"Temperature T2",        35,  2, ValueKind::Float32, true,  "°C"},
    {"Temperature diff",      89,  2, ValueKind::Float32, true,  "°C"},
    {"Travel time ratio",     97,  2, ValueKind::Float32, true,  "%"},
    {"Reynolds number",       99,  2, ValueKind::Float32, true,  ""},

    // CONFIGURATION (6 items)
    {"Pipe inner diameter",   221, 2, ValueKind::Float32, true,  "mm"},
    {"Transducer spacing",    223, 2, ValueKind::Float32, true,  "mm"},
    {"Transducer type",       229, 1, ValueKind::Uint16,  false, ""},
    {"Flow unit",             1437, 1, ValueKind::Uint16, false, ""},
    {"Totalizer unit",        1438, 1, ValueKind::Uint16, false, ""},
    {"Modbus address",        1442, 1, ValueKind::Uint16, false, ""},
};

constexpr size_t REGISTER_COUNT = sizeof(kRegisterTable) / sizeof(kRegisterTable[0]);

// ============================================================================
// Global Variables
// ============================================================================

HardwareSerial RS485Serial(2);           // UART2 for RS485
HardwareSerial simSerial(1);             // UART1 for SIM7600 (renamed for LTEManager compatibility)
uint8_t responseBuffer[128];

// LTE components (required by LTEManager)
TinyGsm modem(simSerial);                // TinyGsm modem instance
TinyGsmClient client(modem);             // TinyGsmClient for HTTP
LTEManager lte;                          // LTE manager instance
ConnectionManager connMgr(lte);          // Connection manager with auto-reconnect

// Generic I/O and Telemetry
GenericIOManager ioManager;              // Generic I/O Manager
TelemetryManager telemetry(ioManager, lte, client); // Telemetry Manager with GSM client

// ============================================================================
// Modbus RTU Functions
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

void clearSerialInput() {
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

// ============================================================================
// Data Parsing Functions
// ============================================================================

float bytesToFloat32(const uint8_t* data, bool swapWords) {
    // TUF-2000M uses BADC byte order (swap bytes within each 16-bit word)
    // Confirmed from testing: Temperature ~36°C, Pipe diameter 100mm
    // Reference: https://partofthething.com/thoughts/reading-a-tuf-2000m-ultrasonic-flow-meter-with-an-arduino-or-esp8266/

    uint8_t ordered[4];

    if (swapWords) {
        // BADC order: Swap bytes within each word
        // Original: [A][B][C][D] (as received from Modbus)
        // Result:   [B][A][D][C]
        ordered[0] = data[1];  // B
        ordered[1] = data[0];  // A
        ordered[2] = data[3];  // D
        ordered[3] = data[2];  // C
    } else {
        // ABCD order: No swap
        memcpy(ordered, data, 4);
    }

    float value;
    memcpy(&value, ordered, sizeof(float));
    return value;
}

uint32_t bytesToUint32(const uint8_t* data, bool swapWords) {
    uint16_t highWord = (data[0] << 8) | data[1];
    uint16_t lowWord = (data[2] << 8) | data[3];

    if (swapWords) {
        return ((uint32_t)lowWord << 16) | highWord;
    }
    return ((uint32_t)highWord << 16) | lowWord;
}

uint16_t bytesToUint16(const uint8_t* data) {
    return (data[0] << 8) | data[1];
}

// ============================================================================
// Modbus Protocol Functions
// ============================================================================

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

bool readHoldingRegisters(uint8_t address, uint16_t regNumber, uint16_t count,
                         uint8_t* payload, size_t payloadSize, size_t& payloadLength) {
    // TUF-2000M manual uses 1-based addressing
    uint16_t startReg = (regNumber == 0) ? 0 : (regNumber - 1);

    clearSerialInput();
    sendReadHoldingRegisters(address, startReg, count);

    size_t frameLen = readModbusResponse(responseBuffer, sizeof(responseBuffer),
                                         MODBUS_RESPONSE_TIMEOUT);

    if (frameLen == 0) {
        Serial.println("  [WARN] No response");
        return false;
    }

    if (PRINT_RAW_FRAMES) {
        Serial.print("  [RAW] ");
        for (size_t i = 0; i < frameLen; i++) {
            Serial.printf("%02X ", responseBuffer[i]);
        }
        Serial.println();
    }

    if (frameLen < 5) {
        Serial.println("  [ERR] Response too short");
        return false;
    }

    // Check for Modbus exception
    if (responseBuffer[1] & 0x80) {
        Serial.printf("  [ERR] Modbus exception 0x%02X\n", responseBuffer[2]);
        return false;
    }

    uint8_t dataBytes = responseBuffer[2];
    if (dataBytes != count * 2) {
        Serial.printf("  [WARN] Unexpected data length %u\n", dataBytes);
    }

    // Verify CRC
    uint16_t crcRx = responseBuffer[frameLen - 2] |
                     (responseBuffer[frameLen - 1] << 8);
    uint16_t crcCalc = modbusCRC(responseBuffer, frameLen - 2);

    if (crcCalc != crcRx) {
        Serial.printf("  [ERR] CRC error (calc=0x%04X rx=0x%04X)\n", crcCalc, crcRx);
        return false;
    }

    memcpy(payload, &responseBuffer[3], dataBytes);
    payloadLength = dataBytes;
    return true;
}

// ============================================================================
// Register Query & Display
// ============================================================================

// Helper: Decode flow unit code to string
const char* decodeFlowUnit(uint16_t code) {
    switch (code) {
        case 0: return "m³/h";
        case 1: return "ft³/h";
        case 2: return "L/h";
        case 3: return "gal/h";
        case 4: return "L/s";
        case 5: return "gal/s";
        case 6: return "m³/s";
        case 7: return "ft³/s";
        case 8: return "L/min";
        case 9: return "gal/min";
        default: return "unknown";
    }
}

// Helper: Decode totalizer unit code to string
const char* decodeTotalizerUnit(uint16_t code) {
    switch (code) {
        case 0: return "m³";
        case 1: return "ft³";
        case 2: return "L";
        case 3: return "gal";
        default: return "unknown";
    }
}

// Helper: Decode transducer type
const char* decodeTransducerType(uint16_t code) {
    switch (code) {
        case 0: return "Standard";
        case 1: return "High temp";
        case 2: return "Insertion";
        case 3: return "Clamp-on";
        default: return "unknown";
    }
}

String formatValue(const RegisterDef& reg, const uint8_t* data, size_t dataLen) {
    char buffer[64];

    switch (reg.kind) {
        case ValueKind::Float32:
            if (dataLen < 4) return "N/A";
            snprintf(buffer, sizeof(buffer), "%.3f", bytesToFloat32(data, reg.swapWords));
            return String(buffer);

        case ValueKind::Uint32:
            if (dataLen < 4) return "N/A";
            snprintf(buffer, sizeof(buffer), "%lu",
                    (unsigned long)bytesToUint32(data, reg.swapWords));
            return String(buffer);

        case ValueKind::Uint16: {
            if (dataLen < 2) return "N/A";
            uint16_t value = bytesToUint16(data);

            // Special handling for unit codes
            if (strcmp(reg.label, "Flow unit") == 0) {
                snprintf(buffer, sizeof(buffer), "%u (%s)", value, decodeFlowUnit(value));
            } else if (strcmp(reg.label, "Totalizer unit") == 0) {
                snprintf(buffer, sizeof(buffer), "%u (%s)", value, decodeTotalizerUnit(value));
            } else if (strcmp(reg.label, "Transducer type") == 0) {
                snprintf(buffer, sizeof(buffer), "%u (%s)", value, decodeTransducerType(value));
            } else {
                snprintf(buffer, sizeof(buffer), "%u", value);
            }
            return String(buffer);
        }

        case ValueKind::Hex16:
            if (dataLen < 2) return "N/A";
            snprintf(buffer, sizeof(buffer), "0x%04X", bytesToUint16(data));
            return String(buffer);

        case ValueKind::Raw:
        default:
            String hex;
            for (size_t i = 0; i < dataLen; i++) {
                hex += String(data[i], HEX);
                hex += " ";
            }
            return hex;
    }
}

void queryRegister(const RegisterDef& reg) {
    uint8_t payload[64];
    size_t payloadLen = 0;

    // Read register
    bool success = readHoldingRegisters(MODBUS_DEVICE_ADDRESS, reg.regNumber,
                                       reg.wordCount, payload, sizeof(payload),
                                       payloadLen);

    if (!success) {
        Serial.printf("  [FAIL] %-25s (R%-4u)\n", reg.label, reg.regNumber);
        return;
    }

    // Show raw hex for debugging
    if (DEBUG_BYTE_ORDER && reg.kind == ValueKind::Float32 && payloadLen >= 4) {
        Serial.printf("  [RAW]  %-25s: %02X %02X %02X %02X\n",
                     reg.label, payload[0], payload[1], payload[2], payload[3]);

        // Show all byte order interpretations
        uint8_t abcd[4] = {payload[0], payload[1], payload[2], payload[3]};
        uint8_t badc[4] = {payload[1], payload[0], payload[3], payload[2]};
        uint8_t cdab[4] = {payload[2], payload[3], payload[0], payload[1]};
        uint8_t dcba[4] = {payload[3], payload[2], payload[1], payload[0]};

        float val_abcd, val_badc, val_cdab, val_dcba;
        memcpy(&val_abcd, abcd, 4);
        memcpy(&val_badc, badc, 4);
        memcpy(&val_cdab, cdab, 4);
        memcpy(&val_dcba, dcba, 4);

        Serial.printf("         ABCD=%.3f  BADC=%.3f  CDAB=%.3f  DCBA=%.3f\n",
                     val_abcd, val_badc, val_cdab, val_dcba);
    }

    // Format and display value
    String value = formatValue(reg, payload, payloadLen);
    Serial.printf("  [DATA] %-25s = %10s", reg.label, value.c_str());

    if (reg.unit && strlen(reg.unit) > 0) {
        Serial.printf(" %s", reg.unit);
    }

    Serial.println();
}

// ============================================================================
// Setup & Loop
// ============================================================================

void setup() {
    delay(500);
    Serial.begin(115200);
    while (!Serial) delay(10);

    Serial.println("\n╔════════════════════════════════════════════════════════╗");
    Serial.println("║  TUF-2000M Ultrasonic Flow Meter Reader               ║");
    Serial.println("║  ESP32-S3 + RS485 Modbus RTU                          ║");
    Serial.println("╚════════════════════════════════════════════════════════╝\n");

    // Initialize RS485 Serial
    RS485Serial.begin(RS485_BAUD, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

    if (RS485_DE_RE_PIN >= 0) {
        pinMode(RS485_DE_RE_PIN, OUTPUT);
        digitalWrite(RS485_DE_RE_PIN, LOW);
    }

    Serial.printf("[CONFIG] RS485 UART:  TX=GPIO%d  RX=GPIO%d\n", RS485_TX_PIN, RS485_RX_PIN);
    Serial.printf("[CONFIG] Baudrate:    %lu bps (8N1)\n", (unsigned long)RS485_BAUD);
    Serial.printf("[CONFIG] Slave ID:    %u\n", MODBUS_DEVICE_ADDRESS);
    Serial.printf("[CONFIG] Scan Period: %lu ms\n", (unsigned long)SCAN_INTERVAL);
    Serial.printf("[CONFIG] Registers:   %u items\n\n", (unsigned)REGISTER_COUNT);

    delay(1000);
    
    // Initialize LTE (optional)
    if (ENABLE_LTE) {
        // LTE Manager handles all initialization internally
        if (lte.begin()) {
            Serial.println("[INIT] ✅ LTE fully initialized and connected");
            
            // Test internet connectivity
            if (lte.testInternet()) {
                Serial.println("[INIT] ✅ Internet test PASSED");
            } else {
                Serial.println("[INIT] ⚠️ Internet test FAILED (but GPRS connected)");
            }
            
            // Print status
            lte.printStatus();
            
            // Initialize Connection Manager for auto-reconnect
            if (ENABLE_CONNECTION_MANAGER) {
                Serial.println("\n[INIT] Starting Connection Manager...");
                connMgr.begin();
                Serial.println("[INIT] ✅ Connection Manager active");
            }
        } else {
            Serial.println("[INIT] ❌ LTE initialization failed");
            
            // Still start connection manager to handle reconnection
            if (ENABLE_CONNECTION_MANAGER) {
                Serial.println("[INIT] Starting Connection Manager for auto-recovery...");
                connMgr.begin();
            }
        }
    }
    
    // Initialize Generic I/O Manager
    if (ENABLE_GENERIC_IO) {
        if (ioManager.begin()) {
            Serial.println("[INIT] ✅ Generic I/O Manager initialized");
            
            // Scan all I/O buses for devices
            ioManager.scanAllBuses();
            
            // Print summary
            ioManager.printDeviceSummary();
        } else {
            Serial.println("[INIT] ❌ Generic I/O Manager initialization failed");
        }
    }
    
    // Initialize Telemetry Manager
    if (ENABLE_TELEMETRY && ENABLE_LTE) {
        telemetry.setServerURL(SERVER_URL);
        telemetry.setDeviceID(String(DEVICE_ID_PREFIX) + "_" + String((uint32_t)ESP.getEfuseMac(), HEX));
        telemetry.setInterval(TELEMETRY_INTERVAL_MS);
        
        if (telemetry.begin()) {
            Serial.println("[INIT] ✅ Telemetry Manager initialized");
            
            // Send boot notification (if LTE connected)
            if (lte.isConnected()) {
                delay(2000);  // Give system time to stabilize
                telemetry.sendBootNotification();
            }
        } else {
            Serial.println("[INIT] ❌ Telemetry Manager initialization failed");
        }
    }
}

void loop() {
    static uint32_t lastScan = 0;
    
    // Connection Manager monitoring (if enabled)
    if (ENABLE_LTE && ENABLE_CONNECTION_MANAGER) {
        connMgr.loop();
    }
    
    // Telemetry sending (if enabled and time to send)
    if (ENABLE_TELEMETRY && ENABLE_LTE) {
        if (telemetry.shouldSendNow()) {
            telemetry.sendTelemetry();
        }
    }

    if ((millis() - lastScan) < SCAN_INTERVAL) {
        delay(10);
        return;
    }

    lastScan = millis();

    Serial.println("╔════════════════════════════════════════════════════════╗");
    Serial.printf("║  Snapshot @ %10lu ms                            ║\n",
                  (unsigned long)lastScan);
    Serial.println("╚════════════════════════════════════════════════════════╝\n");

    // ========== CATEGORY 1: SENSOR DATA ==========
    Serial.println("┌─ SENSOR DATA ──────────────────────────────────────────┐");
    constexpr size_t sensorCount = sizeof(kSensorRegisters) / sizeof(kSensorRegisters[0]);
    for (size_t i = 0; i < sensorCount; i++) {
        queryRegister(kSensorRegisters[i]);
        delay(50);
    }
    Serial.println("└────────────────────────────────────────────────────────┘\n");

    // ========== CATEGORY 2: SYSTEM STATUS ==========
    Serial.println("┌─ SYSTEM STATUS ────────────────────────────────────────┐");
    constexpr size_t systemCount = sizeof(kSystemRegisters) / sizeof(kSystemRegisters[0]);
    for (size_t i = 0; i < systemCount; i++) {
        queryRegister(kSystemRegisters[i]);
        delay(50);
    }
    Serial.println("└────────────────────────────────────────────────────────┘\n");

    // ========== CATEGORY 3: ADDITIONAL INFO ==========
    Serial.println("┌─ ADDITIONAL INFO ──────────────────────────────────────┐");
    constexpr size_t additionalCount = sizeof(kAdditionalRegisters) / sizeof(kAdditionalRegisters[0]);
    for (size_t i = 0; i < additionalCount; i++) {
        queryRegister(kAdditionalRegisters[i]);
        delay(50);
    }
    Serial.println("└────────────────────────────────────────────────────────┘\n");

    // ========== CATEGORY 4: CONFIGURATION ==========
    Serial.println("┌─ CONFIGURATION ────────────────────────────────────────┐");
    constexpr size_t configCount = sizeof(kConfigRegisters) / sizeof(kConfigRegisters[0]);
    for (size_t i = 0; i < configCount; i++) {
        queryRegister(kConfigRegisters[i]);
        delay(50);
    }
    Serial.println("└────────────────────────────────────────────────────────┘\n");

    Serial.println("════════════════════════════════════════════════════════\n");
}
