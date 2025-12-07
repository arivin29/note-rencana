// ============================================================================
// ESP32-S3 GENERIC IOT FIRMWARE - FULL VERSION
// LTE + MQTT + All Sensors (Analog, ADC16, I2C, Digital, RS485)
// RS485 Dynamic Configuration System
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
#include "rs485_config_manager.h"
#include "sd_manager.h"  // NEW: SD card manager for offline data buffering

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

// External global managers (defined in their respective .cpp files)
extern RS485ConfigManager rs485ConfigMgr;
extern SDManager sdManager;

String DEVICE_ID;
unsigned long lastTelemetrySent = 0;
unsigned long lastRS485Scan = 0;
bool bootNotificationSent = false;

// ============================================================================
// RELAY CONTROL FUNCTIONS
// ============================================================================

/**
 * Control relay state
 * @param target "out1" for NE555 relay on GPIO14
 * @param state "on", "off", "restart"
 * 
 * Logic (Active LOW relay):
 * - "on"  = GPIO LOW  = No current = Relay de-energized
 * - "off" = GPIO HIGH = Current flowing = Relay energized
 * - "restart" = OFF → delay → ON (hard restart sequence)
 */
void controlRelay(const String& target, const String& state) {
    if (target != "out1") {
        Serial.printf("[Relay] ❌ Unknown target: %s\n", target.c_str());
        return;
    }
    
    if (state == "on") {
        digitalWrite(RELAY_NE555_PIN, LOW);  // Active LOW = ON
        Serial.println("[Relay] ✅ OUT1 → ON (GPIO14 = LOW)");
        
    } else if (state == "off") {
        digitalWrite(RELAY_NE555_PIN, HIGH);  // Active LOW = OFF
        Serial.println("[Relay] ✅ OUT1 → OFF (GPIO14 = HIGH)");
        
    } else if (state == "restart") {
        Serial.println("[Relay] 🔄 Restart sequence...");
        
        // Phase 1: OFF (energize relay)
        digitalWrite(RELAY_NE555_PIN, HIGH);
        Serial.println("[Relay]   → OFF (5 seconds)");
        delay(5000);
        
        // Phase 2: ON (de-energize relay)
        digitalWrite(RELAY_NE555_PIN, LOW);
        Serial.println("[Relay]   → ON");
        Serial.println("[Relay] ✅ Restart completed");
        
    } else {
        Serial.printf("[Relay] ❌ Unknown state: %s\n", state.c_str());
    }
}

// ============================================================================
// MQTT CONFIG CALLBACK
// ============================================================================

void mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
    Serial.println("\n========================================");
    Serial.print("[MQTT] 📨 Message arrived!");
    Serial.println("\n========================================");
    Serial.printf("[MQTT] Topic: %s\n", topic);
    Serial.printf("[MQTT] Length: %u bytes\n", length);

    // Convert payload to string
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    Serial.println("[MQTT] Payload preview (first 200 chars):");
    Serial.println(message.substring(0, 200));
    Serial.println("========================================\n");

    String topicStr = String(topic);
    
    // Handle stream_config/{device_id}
    if (topicStr.indexOf("stream_config/") >= 0) {
        Serial.println("[Config] ✅ This is RS485 config message!");
        Serial.println("[Config] Raw payload:");
        Serial.println("========================================");
        Serial.println(message);
        Serial.println("========================================");
        
        if (message == "null" || message == "\"null\"") {
            Serial.println("[Config] ⚠️ No config available (null)");
            rs485ConfigMgr.clearConfig();
            
            // Still scan to report what devices are online
            Serial.println("[Config] Performing scan to report available devices...");
            rs485ConfigMgr.scanDevices(1, 10);
            rs485ConfigMgr.printDeviceStatus();
        } else {
            // Parse config JSON
            if (rs485ConfigMgr.parseConfig(message)) {
                Serial.println("[Config] ✅ Config loaded successfully");
                
                // Scan to update device status
                rs485ConfigMgr.scanDevices(1, 10);
                rs485ConfigMgr.printDeviceStatus();
            } else {
                Serial.println("[Config] ❌ Failed to parse config");
            }
        }
    }
    
    // Handle sensor/{device_id}/command
    else if (topicStr.indexOf("/command") >= 0) {
        Serial.println("[Command] Received command from server");
        Serial.print("[Command] Payload: ");
        Serial.println(message);
        
        // Parse JSON command
        DynamicJsonDocument doc(256);
        DeserializationError error = deserializeJson(doc, message);
        
        if (error) {
            Serial.print("[Command] ❌ JSON parse failed: ");
            Serial.println(error.c_str());
            return;
        }
        
        String action = doc["action"] | "";
        
        if (action == "relay") {
            String target = doc["target"] | "";
            String state = doc["state"] | "";
            
            Serial.printf("[Command] Relay control: target=%s, state=%s\n", 
                         target.c_str(), state.c_str());
            
            controlRelay(target, state);
            
            // Send status feedback
            DynamicJsonDocument statusDoc(128);
            statusDoc["target"] = target;
            statusDoc["state"] = state;
            statusDoc["success"] = true;
            
            String statusPayload;
            serializeJson(statusDoc, statusPayload);
            
            String statusTopic = "sensor/" + DEVICE_ID + "/relay_status";
            mqttManager.publish(statusTopic.c_str(), statusPayload.c_str());
            
        } else {
            Serial.printf("[Command] ❌ Unknown action: %s\n", action.c_str());
        }
    }
}

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

// Build basic telemetry JSON (without RS485 - lightweight)
String buildBasicTelemetryJSON() {
    DynamicJsonDocument doc(2048);
    
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = time(nullptr);
    
    // System info
    JsonObject sys = doc.createNestedObject("system");
    sys["uptime"] = millis();
    sys["free_heap"] = ESP.getFreeHeap();
    sys["cpu_freq"] = ESP.getCpuFreqMHz();
    
    // Network info
    JsonObject net = doc.createNestedObject("network");
    net["lte_connected"] = lteManager.isConnected();
    net["mqtt_connected"] = connectionManager.isFullyConnected();
    net["signal"] = lteManager.getSignalQuality();
    
    // I/O data (use existing GenericIOManager method)
    ioManager.generateRawTelemetry(doc);
    
    String output;
    serializeJson(doc, output);
    return output;
}

// Build RS485 telemetry JSON (separate message for large data)
String buildRS485TelemetryJSON() {
    DynamicJsonDocument doc(4096);
    
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = time(nullptr);
    
    // RS485 devices only
    JsonDocument rs485Doc = rs485ConfigMgr.buildDynamicTelemetry();
    doc["rs485"] = rs485Doc.as<JsonObject>();
    
    String output;
    serializeJson(doc, output);
    return output;
}

// Request RS485 configuration from server
void requestRS485Config() {
    Serial.println("\n========================================");
    Serial.println("[Config] Requesting RS485 configuration...");
    Serial.println("========================================");
    
    // Device mengirim request ke: get_config/{device_id}
    // Server akan mengirim response ke: stream_config/{device_id}
    String requestTopic = "get_config/" + DEVICE_ID;
    String requestPayload = "{\"request\":\"config\"}";
    
    Serial.printf("[Config] Request topic: %s\n", requestTopic.c_str());
    Serial.printf("[Config] Request payload: %s\n", requestPayload.c_str());
    
    if (mqttManager.publish(requestTopic.c_str(), requestPayload.c_str())) {
        Serial.println("[Config] ✅ Config request sent");
        
        // Subscribe to config topic
        String configTopic = "stream_config/" + DEVICE_ID;
        Serial.printf("[Config] Subscribing to: %s\n", configTopic.c_str());
        
        if (mqttManager.subscribe(configTopic.c_str())) {
            Serial.println("[Config] ✅ Subscribed successfully");
            Serial.println("[Config] 🕐 Waiting for server response...");
            Serial.println("[Config] 💡 If no response in 30s, server may not have config");
        } else {
            Serial.println("[Config] ❌ Failed to subscribe");
        }
    } else {
        Serial.println("[Config] ❌ Failed to send config request");
    }
    Serial.println("========================================\n");
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

    // Initialize GPIO pins
    pinMode(RELAY_NE555_PIN, OUTPUT);
    digitalWrite(RELAY_NE555_PIN, LOW);  // Relay OFF (active LOW)
    Serial.println("[Relay] NE555 module initialized on GPIO14");
    
    pinMode(IO_DIGITAL_IN_1_PIN, INPUT);  // Pump status input
    Serial.println("[Digital Input] GPIO38 initialized for pump status");

    // NEW: Initialize SD card for offline data buffering
    Serial.println("\n[3.5/6] Initializing SD Card Manager...");
    if (sdManager.begin()) {
        Serial.println("[SD] ✅ SD card ready for offline buffering");
        sdManager.printStatus();
    } else {
        Serial.println("[SD] ⚠️ SD card not available");
        Serial.println("[SD] Device will operate without data buffering (graceful degradation)");
    }

    Serial.println("\n[4/6] Powering LTE stack...");
    bool lteReady = lteManager.begin();
    Serial.println(lteReady ? "[LTE] ✅ Ready" : "[LTE] ❌ Failed (auto-retry active)");

    Serial.println("\n[5/6] Preparing MQTT manager...");
    mqttManager.begin(MQTT_BROKER, MQTT_PORT, DEVICE_ID.c_str());
    mqttManager.setCallback(mqttCallback);  // Set callback for config messages

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
// REQUEST RS485 CONFIG FROM SERVER
// ============================================================================
// LOOP - 3-SERVICE ARCHITECTURE
// ============================================================================
// Service 1: Sensor Reading (30s) - ALWAYS runs, saves to SD when offline
// Service 2: Network Management (1s) - Non-blocking state machine
// Service 3: Data Sync (10s) - ONE-by-ONE sync from SD when connected
// ============================================================================

void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastNetworkCheck = 0;
    static unsigned long lastSync = 0;
    static unsigned long lastRS485Scan = 0;
    
    // Burst control for data sync
    static int burstCount = 0;
    static bool pausingAfterBurst = false;
    static unsigned long pauseStartTime = 0;
    
    unsigned long now = millis();
    
    // ========================================================================
    // SERVICE 1: SENSOR READING (ALWAYS RUNNING - INDEPENDENT)
    // ========================================================================
    if (now - lastSensorRead >= TELEMETRY_INTERVAL_MS) {
        #if DEBUG_SENSORS
        Serial.println("\n[SERVICE 1] Reading sensors...");
        #endif
        
        // ============================================================
        // MESSAGE 1: Basic Telemetry (Always send)
        // ============================================================
        String basicTelemetry = buildBasicTelemetryJSON();
        bool basicSent = false;
        
        Serial.printf("[Telemetry] Message 1 - Basic sensors (%d bytes)\n", basicTelemetry.length());
        
        // Try to send immediately if connected
        if (connectionManager.isFullyConnected()) {
            Serial.printf("[Telemetry] Publishing to: %s\n", MQTT_TOPIC);
            if (mqttManager.publish(MQTT_TOPIC, basicTelemetry.c_str())) {
                Serial.println("[Telemetry] ✅ Message 1 sent successfully");
                basicSent = true;
            } else {
                // Send failed - save to SD as backup
                Serial.println("[Telemetry] ❌ Message 1 send failed");
                if (sdManager.isAvailable()) {
                    sdManager.writeTelemetry(basicTelemetry);
                    Serial.println("[Telemetry] 💾 Message 1 saved to SD");
                } else {
                    Serial.println("[Telemetry] ⚠️ Message 1 lost (no SD)");
                }
            }
        } else {
            // Offline - save to SD
            Serial.println("[Telemetry] Offline mode - saving to SD");
            if (sdManager.isAvailable()) {
                sdManager.writeTelemetry(basicTelemetry);
                Serial.println("[Telemetry] 💾 Message 1 saved to SD");
            } else {
                Serial.println("[Telemetry] ⚠️ Message 1 lost (no SD)");
            }
        }
        
        // ============================================================
        // MESSAGE 2: RS485 Data (Only if devices configured)
        // ============================================================
        if (rs485ConfigMgr.hasConfig() && rs485ConfigMgr.getOnlineCount() > 0) {
            String rs485Telemetry = buildRS485TelemetryJSON();
            String rs485Topic = String(MQTT_TOPIC) + "/rs485";
            
            Serial.printf("[Telemetry] Message 2 - RS485 data (%d bytes)\n", rs485Telemetry.length());
            
            if (connectionManager.isFullyConnected()) {
                Serial.printf("[Telemetry] Publishing to: %s\n", rs485Topic.c_str());
                if (mqttManager.publish(rs485Topic.c_str(), rs485Telemetry.c_str())) {
                    Serial.println("[Telemetry] ✅ Message 2 sent successfully");
                } else {
                    // Send failed - save to SD
                    Serial.println("[Telemetry] ❌ Message 2 send failed");
                    if (sdManager.isAvailable()) {
                        sdManager.writeTelemetry(rs485Telemetry);
                        Serial.println("[Telemetry] 💾 Message 2 saved to SD");
                    }
                }
            } else {
                // Offline - save to SD
                Serial.println("[Telemetry] Offline mode - saving to SD");
                if (sdManager.isAvailable()) {
                    sdManager.writeTelemetry(rs485Telemetry);
                    Serial.println("[Telemetry] 💾 Message 2 saved to SD");
                }
            }
        } else {
            Serial.println("[Telemetry] No RS485 devices configured, skipping Message 2");
        }
        
        lastSensorRead = now;
    }
    
    // ========================================================================
    // SERVICE 2: NETWORK MANAGEMENT (NON-BLOCKING STATE MACHINE)
    // ========================================================================
    if (now - lastNetworkCheck >= 1000) {
        connectionManager.loop();  // Non-blocking tick
        
        // Send boot notification once when connected
        if (connectionManager.isFullyConnected() && !bootNotificationSent) {
            sendBootNotification();
            delay(1000);
            requestRS485Config();
            bootNotificationSent = true;
        }
        
        lastNetworkCheck = now;
    }
    
    // ========================================================================
    // SERVICE 3: DATA SYNC (ONE-by-ONE FROM SD WHEN CONNECTED)
    // ========================================================================
    
    // Check if in pause mode (after burst)
    if (pausingAfterBurst) {
        if (now - pauseStartTime >= SYNC_PAUSE_AFTER_BURST_MS) {
            pausingAfterBurst = false;
            burstCount = 0;
            Serial.println("[SYNC] ⏸️ Pause ended, resuming sync");
        }
        // Skip sync while pausing
    } else if (connectionManager.isFullyConnected() && 
               now - lastSync >= SYNC_RATE_LIMIT_MS) {
        
        // Check if SD has pending data
        if (sdManager.hasPendingData()) {
            String oldestFile = sdManager.getOldestFile();
            
            if (!oldestFile.isEmpty()) {
                // Read file content
                String jsonData = sdManager.readFile(oldestFile);
                
                if (!jsonData.isEmpty()) {
                    // Send ONE file only
                    if (mqttManager.publish(MQTT_TOPIC, jsonData.c_str())) {
                        // Delete after successful send
                        if (sdManager.deleteFile(oldestFile)) {
                            burstCount++;
                            
                            uint32_t remaining = sdManager.getPendingFileCount();
                            Serial.printf("[SYNC] ✅ Sent & deleted (%d/%d) - %u files remaining\n", 
                                          burstCount, SYNC_MAX_BURST, remaining);
                            
                            // Check burst limit (10 messages)
                            if (burstCount >= SYNC_MAX_BURST) {
                                pausingAfterBurst = true;
                                pauseStartTime = now;
                                Serial.println("[SYNC] ⏸️ Burst limit reached, pausing 30s");
                            }
                        } else {
                            Serial.println("[SYNC] ⚠️ Send OK but delete failed");
                        }
                    } else {
                        // Send failed - keep file, stop syncing
                        Serial.printf("[SYNC] ❌ Send failed, keeping file: %s\n", oldestFile.c_str());
                    }
                } else {
                    Serial.printf("[SYNC] ❌ Failed to read file: %s\n", oldestFile.c_str());
                }
            }
        }
        
        lastSync = now;
    }
    
    // ========================================================================
    // PERIODIC RS485 SCAN (WHEN CONNECTED)
    // ========================================================================
    if (connectionManager.isFullyConnected() && 
        now - lastRS485Scan >= RS485_SCAN_INTERVAL_MS) {
        Serial.println("\n[Periodic] RS485 device scan...");
        rs485ConfigMgr.scanDevices(1, 10);
        rs485ConfigMgr.printDeviceStatus();
        lastRS485Scan = now;
    }
    
    delay(100);
}
