#include <Arduino.h>
#include <ModbusMaster.h>
#include "esp_system.h"
#include "config.h"
#include "lte_manager.h"
#include "mqtt_manager.h"
#include "generic_io.h"
#include "sd_logger.h"
#include "time_manager.h"

// ============================================================================
// GENERIC FIRMWARE - TRULY UNIVERSAL
// ============================================================================
// Firmware yang kirim RAW data dari semua I/O
// Server-side yang akan mapping dan parsing sesuai Node Profile
// One firmware for ALL deployments!

// ============================================================================
// GLOBAL INSTANCES
// ============================================================================

LTEManager lte;
MQTTManager* mqtt;
GenericIOManager ioManager;
SDLogger sdCard;
TimeManager timeManager;
ModbusMaster modbusNode;

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// Device ID (auto-generated at runtime from MAC address)
String DEVICE_ID;

// ============================================================================
// STATE VARIABLES
// ============================================================================

unsigned long lastTelemetrySent = 0;
unsigned long lastDeviceScan = 0;
unsigned long lastWatchdogCheck = 0;
unsigned long lastMqttConnected = 0;
bool firstBoot = true;
bool firstMqttConnect = true;  // Track first MQTT connection for time sync

// ============================================================================
// FUNCTION PROTOTYPES
// ============================================================================

String getHardwareID();
String getDeviceID();
String getResetReasonString(int reason);
void setupHardware();
void setupModbus();
void setupComponents();
void sendRawTelemetry();
void processOfflineQueue();
void watchdogCheck();
void hardRestart();
void mqttCallback(char* topic, byte* payload, unsigned int length);
String getTimestamp();

// ============================================================================
// RESET REASON HELPER
// ============================================================================

String getResetReasonString(int reason) {
    switch (reason) {
        case ESP_RST_UNKNOWN: return "UNKNOWN - Reset reason unknown";
        case ESP_RST_POWERON: return "POWERON - Vbat power on reset";
        case ESP_RST_EXT: return "EXTERNAL - External pin reset";
        case ESP_RST_SW: return "SOFTWARE - Software reset via esp_restart";
        case ESP_RST_PANIC: return "PANIC - Software panic/exception";
        case ESP_RST_INT_WDT: return "INT_WDT - Interrupt watchdog";
        case ESP_RST_TASK_WDT: return "TASK_WDT - Task watchdog";
        case ESP_RST_WDT: return "WDT - Other watchdog";
        case ESP_RST_DEEPSLEEP: return "DEEPSLEEP - Reset after deep sleep";
        case ESP_RST_BROWNOUT: return "BROWNOUT - Brownout reset (power issue!)";
        case ESP_RST_SDIO: return "SDIO - Reset by SDIO module";
        default: return "UNKNOWN - Code " + String(reason);
    }
}

// ============================================================================
// DEVICE ID GENERATION (from MAC Address)
// ============================================================================

String getHardwareID() {
    // Get ESP32 MAC address from eFuse (permanent, unique, factory-programmed)
    uint8_t mac[6];
    esp_efuse_mac_get_default(mac);
    
    // Convert to hex string (12 characters)
    // Example: A4CF12EF5D8C
    char macStr[13];
    sprintf(macStr, "%02X%02X%02X%02X%02X%02X", 
            mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    return String(macStr);
}

String getDeviceID() {
    // Format: OWNER_CODE-HARDWARE_ID
    // Example: DEMO1-A4CF12EF5D8C
    return String(OWNER_CODE) + "-" + getHardwareID();
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    // Initialize serial for debugging
    Serial.begin(DEBUG_BAUDRATE);
    delay(2000);
    
    Serial.println(F("\n\n[Boot] ESP32-S3 Starting..."));
    Serial.print(F("[Boot] Reset Reason: "));
    esp_reset_reason_t resetReason = esp_reset_reason();
    Serial.println(getResetReasonString((int)resetReason));
    
    // Check for boot loop (multiple software resets in short time)
    if (resetReason == ESP_RST_SW || resetReason == ESP_RST_PANIC || 
        resetReason == ESP_RST_INT_WDT || resetReason == ESP_RST_TASK_WDT ||
        resetReason == ESP_RST_WDT) {
        Serial.println(F("[Boot] WARNING: Detected watchdog/software reset!"));
        Serial.println(F("[Boot] Waiting 10 seconds before continuing..."));
        delay(10000);
    }
    
    // Generate Device ID from MAC address
    DEVICE_ID = getDeviceID();

    Serial.println(F("\n\n========================================"));
    Serial.println(F("ESP32-S3 GENERIC IOT FIRMWARE"));
    Serial.println(F("========================================"));
    Serial.print(F("Owner Code: "));
    Serial.println(OWNER_CODE);
    Serial.print(F("Hardware ID: "));
    Serial.println(getHardwareID());
    Serial.print(F("Device ID: "));
    Serial.println(DEVICE_ID);
    Serial.println(F("Firmware: Generic v2.0 (RAW Data)"));
    Serial.println(F("Approach: Server-side parsing"));
    Serial.println(F("========================================\n"));

    // Setup hardware pins
    setupHardware();

    // Setup components
    setupComponents();

    Serial.println(F("\n[System] Boot complete!"));
    Serial.println(F("[System] Starting main loop...\n"));

    firstBoot = false;
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
    // Update LTE manager
    lte.update();

    // Update MQTT client (handles reconnection)
    mqtt->loop();

    // Check watchdog
    #if ENABLE_WATCHDOG
    watchdogCheck();
    #endif

    // Re-scan devices every 5 minutes (optional, can be disabled)
    unsigned long now = millis();
    if (now - lastDeviceScan >= 300000) {  // 5 minutes
        lastDeviceScan = now;
        Serial.println(F("[System] Re-scanning devices..."));
        ioManager.scanAllBuses();
    }

    // Send telemetry at regular intervals
    if (now - lastTelemetrySent >= TELEMETRY_INTERVAL_MS) {
        lastTelemetrySent = now;
        sendRawTelemetry();
    }

    // Process offline queue if connected
    if (mqtt->isConnected()) {
        processOfflineQueue();
    }

    // Small delay to prevent watchdog timeout
    delay(10);
}

// ============================================================================
// SETUP HARDWARE
// ============================================================================

void setupHardware() {
    Serial.println(F("[Hardware] Initializing pins..."));

    // Relay pin (for hard restart)
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH); // Relay off (active LOW)

    // Digital Input: Pump Status Monitor
    pinMode(IO_DIGITAL_IN_1_PIN, INPUT);

    // LED (if available)
    #ifdef LED_BUILTIN
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);
    #endif

    Serial.println(F("[Hardware] Pins initialized"));
}

// ============================================================================
// SETUP MODBUS
// ============================================================================

void setupModbus() {
    Serial.println(F("[Modbus] Initializing RS485..."));

    // Initialize RS485 serial
    MODBUS_SERIAL.begin(MODBUS_BAUDRATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

    // Setup DE/RE pin
    pinMode(RS485_DE_RE_PIN, OUTPUT);
    digitalWrite(RS485_DE_RE_PIN, LOW); // Receive mode

    // Configure Modbus callbacks
    modbusNode.preTransmission([]() {
        digitalWrite(RS485_DE_RE_PIN, HIGH); // Transmit mode
    });

    modbusNode.postTransmission([]() {
        digitalWrite(RS485_DE_RE_PIN, LOW); // Receive mode
    });

    Serial.println(F("[Modbus] RS485 initialized"));
}

// ============================================================================
// SETUP COMPONENTS
// ============================================================================

void setupComponents() {
    // 1. Initialize SD Card
    #if ENABLE_SD_CARD
    Serial.println(F("\n[1/6] Initializing SD Card..."));
    try {
        if (sdCard.begin()) {
            Serial.println(F("[SD] OK"));
            sdCard.printInfo();
        } else {
            Serial.println(F("[SD] FAILED - Continuing without SD"));
        }
    } catch (...) {
        Serial.println(F("[SD] EXCEPTION - Continuing without SD"));
    }
    delay(500);
    #endif

    // 2. Initialize Time Manager (RTC)
    Serial.println(F("\n[2/6] Initializing Time Manager..."));
    try {
        timeManager.begin();
        timeManager.printStatus();
    } catch (...) {
        Serial.println(F("[Time] EXCEPTION - Continuing without RTC"));
    }
    delay(500);

    // 3. Initialize Modbus RS485
    Serial.println(F("\n[3/6] Initializing Modbus RS485..."));
    try {
        setupModbus();
    } catch (...) {
        Serial.println(F("[Modbus] EXCEPTION - Continuing without Modbus"));
    }
    delay(500);

    // 4. Initialize Generic I/O Manager
    Serial.println(F("\n[4/6] Initializing Generic I/O Manager..."));
    try {
        ioManager.begin();

        // Scan all buses for devices
        Serial.println(F("[GenericIO] Auto-scanning all buses..."));
        ioManager.scanAllBuses();
    } catch (...) {
        Serial.println(F("[GenericIO] EXCEPTION - Continuing without I/O"));
    }
    delay(500);

    // 5. Initialize 4G LTE
    Serial.println(F("\n[5/6] Initializing 4G LTE Module..."));
    try {
        if (lte.begin()) {
            Serial.println(F("[LTE] Module initialized"));

            // Connect to network
            Serial.println(F("[LTE] Connecting to network..."));
            if (lte.connect(APN_NAME, APN_USER, APN_PASS)) {
                Serial.println(F("[LTE] Connected to network!"));
                lte.printStatus();
            } else {
                Serial.println(F("[LTE] Network connection failed!"));
            }
        } else {
            Serial.println(F("[LTE] Initialization failed!"));
        }
    } catch (...) {
        Serial.println(F("[LTE] EXCEPTION - Continuing without LTE"));
    }
    delay(500);

    // 6. Initialize MQTT
    Serial.println(F("\n[6/6] Initializing MQTT Client..."));
    try {
        mqtt = new MQTTManager(lte);
        mqtt->begin(MQTT_BROKER, MQTT_PORT, DEVICE_ID.c_str());
        mqtt->setCallback(mqttCallback);

        // Connect to MQTT broker
        if (lte.isConnected()) {
            Serial.println(F("[MQTT] Connecting to broker..."));
            if (mqtt->connect()) {
                Serial.println(F("[MQTT] Connected!"));
                mqtt->printStatus();

                // Subscribe to command topic
                String commandTopic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/command";
                mqtt->subscribe(commandTopic.c_str());
                Serial.print(F("[MQTT] Subscribed to command topic: "));
                Serial.println(commandTopic);

                // Subscribe to time sync response topic
                String timeTopic = timeManager.getResponseTopic();
                mqtt->subscribe(timeTopic.c_str());
                Serial.print(F("[MQTT] Subscribed to time sync topic: "));
                Serial.println(timeTopic);

                // Request time sync ONLY on first MQTT connect
                if (firstMqttConnect && !timeManager.isSynced()) {
                    Serial.println(F("[Time] First MQTT connect - Requesting time sync..."));
                    timeManager.requestMQTTTimeSync();

                    // Publish time request
                    JsonDocument timeReq;
                    timeReq["device_id"] = DEVICE_ID;
                    timeReq["command"] = "request_time";
                    String requestTopic = timeManager.getRequestTopic();
                    mqtt->publish(requestTopic.c_str(), timeReq);

                    Serial.print(F("[Time] Request sent to: "));
                    Serial.println(requestTopic);

                    firstMqttConnect = false;  // Mark as no longer first connect
                } else if (firstMqttConnect && timeManager.isSynced()) {
                    Serial.println(F("[Time] Already synced from RTC, skipping MQTT sync"));
                    firstMqttConnect = false;
                }

                lastMqttConnected = millis();
            } else {
                Serial.println(F("[MQTT] Connection failed!"));
            }
        } else {
            Serial.println(F("[MQTT] Skipping (no LTE connection)"));
        }
    } catch (...) {
        Serial.println(F("[MQTT] EXCEPTION - Continuing without MQTT"));
    }
    delay(500);

    // Send boot message
    Serial.println(F("\n[Boot] Sending boot notification..."));
    try {
        if (mqtt != nullptr && mqtt->isConnected()) {
            JsonDocument bootDoc;
            bootDoc["device_id"] = DEVICE_ID;
            bootDoc["event"] = "boot";
            bootDoc["firmware"] = "Generic v2.0 (RAW Data)";
            bootDoc["timestamp"] = getTimestamp();

            // Add device summary
            JsonObject devices = bootDoc["detected_devices"].to<JsonObject>();
            devices["rs485_count"] = ioManager.getRS485().getActiveCount();
            devices["i2c_count"] = ioManager.getI2C().getActiveCount();
            devices["analog_channels"] = 2;  // A2, A3

            mqtt->publish(MQTT_TOPIC, bootDoc);
            Serial.println(F("[Boot] Boot notification sent"));
        }
    } catch (...) {
        Serial.println(F("[Boot] EXCEPTION sending boot notification"));
    }
}

// ============================================================================
// SEND RAW TELEMETRY
// ============================================================================

void sendRawTelemetry() {
    Serial.println(F("\n========== RAW TELEMETRY =========="));

    // Create JSON document
    JsonDocument doc;

    // Device metadata
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = getTimestamp();
    doc["firmware"] = "generic-v2.0";

    // === GENERATE RAW DATA FROM ALL I/O ===
    ioManager.generateRawTelemetry(doc);

    // Add signal quality
    JsonObject signal = doc["signal"].to<JsonObject>();
    signal["rssi"] = lte.getSignalQuality();
    signal["operator"] = lte.getOperator();

    // Add system info
    JsonObject system = doc["system"].to<JsonObject>();
    system["uptime"] = millis() / 1000;
    system["free_heap"] = ESP.getFreeHeap();
    #if ENABLE_SD_CARD
    if (sdCard.isAvailable()) {
        system["sd_free_mb"] = sdCard.getFreeSpaceMB();
        system["queued"] = sdCard.getQueueSize();
    }
    #endif

    // Print JSON to Serial
    Serial.println(F("RAW Payload:"));
    serializeJsonPretty(doc, Serial);
    Serial.println();

    // Publish to MQTT
    if (mqtt->isConnected()) {
        if (mqtt->publish(MQTT_TOPIC, doc)) {
            Serial.println(F("[Telemetry] Published successfully"));
            lastMqttConnected = millis();

            #ifdef LED_BUILTIN
            // Blink LED to indicate success
            digitalWrite(LED_BUILTIN, HIGH);
            delay(50);
            digitalWrite(LED_BUILTIN, LOW);
            #endif
        } else {
            Serial.println(F("[Telemetry] Publish failed!"));

            // Save to SD card if available
            #if ENABLE_SD_CARD
            if (sdCard.isAvailable()) {
                sdCard.queueTelemetry(doc);
                Serial.println(F("[Telemetry] Queued to SD card"));
            }
            #endif
        }
    } else {
        Serial.println(F("[Telemetry] MQTT not connected"));

        // Save to SD card
        #if ENABLE_SD_CARD
        if (sdCard.isAvailable()) {
            sdCard.queueTelemetry(doc);
            Serial.println(F("[Telemetry] Queued to SD card"));
        }
        #endif
    }

    Serial.println(F("===================================\n"));
}

// ============================================================================
// PROCESS OFFLINE QUEUE
// ============================================================================

void processOfflineQueue() {
    #if ENABLE_SD_CARD
    if (!sdCard.isAvailable()) {
        return;
    }

    uint16_t queueSize = sdCard.getQueueSize();
    if (queueSize == 0) {
        return;
    }

    Serial.print(F("[Queue] Processing offline queue ("));
    Serial.print(queueSize);
    Serial.println(F(" records)..."));

    // Process up to 10 records per loop iteration
    uint8_t processed = 0;
    while (processed < 10 && sdCard.getQueueSize() > 0) {
        JsonDocument doc;

        if (sdCard.dequeueOldest(doc)) {
            if (mqtt->publish(MQTT_TOPIC, doc)) {
                Serial.print(F("[Queue] Published queued record "));
                Serial.println(processed + 1);
                processed++;
            } else {
                Serial.println(F("[Queue] Publish failed, stopping queue processing"));
                // Re-queue the failed record
                sdCard.queueTelemetry(doc);
                break;
            }
        }

        delay(100); // Small delay between publishes
    }

    if (processed > 0) {
        Serial.print(F("[Queue] Processed "));
        Serial.print(processed);
        Serial.println(F(" records"));
    }
    #endif
}

// ============================================================================
// WATCHDOG CHECK
// ============================================================================

void watchdogCheck() {
    unsigned long now = millis();

    // Check if MQTT hasn't been connected for too long
    if (now - lastMqttConnected > WATCHDOG_TIMEOUT_MS) {
        Serial.println(F("\n[Watchdog] MQTT timeout! Attempting reconnection..."));

        // Try to reconnect
        if (lte.isConnected() && mqtt->connect()) {
            lastMqttConnected = now;
            Serial.println(F("[Watchdog] Reconnected successfully"));
        }
    }

    // Hard restart if timeout is too long
    #if ENABLE_HARD_RESTART
    if (now - lastMqttConnected > HARD_RESTART_TIMEOUT_MS) {
        Serial.println(F("\n[Watchdog] HARD RESTART triggered!"));
        hardRestart();
    }
    #endif
}

// ============================================================================
// HARD RESTART VIA RELAY
// ============================================================================

void hardRestart() {
    Serial.println(F("[System] Triggering hard restart via relay..."));
    delay(1000);

    // Cut power via relay (active LOW)
    digitalWrite(RELAY_PIN, LOW);
    delay(5000); // Keep relay on for 5 seconds

    // This code won't be reached if relay actually cuts power
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println(F("[System] Relay reset complete, rebooting ESP32..."));

    // Software reset as backup
    ESP.restart();
}

// ============================================================================
// MQTT CALLBACK (for commands)
// ============================================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print(F("[MQTT] Message received on topic: "));
    Serial.println(topic);

    // Convert payload to string
    String message = "";
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    Serial.print(F("[MQTT] Payload: "));
    Serial.println(message);

    // Check if this is time sync response
    String topicStr = String(topic);
    String timeSyncTopic = timeManager.getResponseTopic();
    if (topicStr == timeSyncTopic || topicStr == "cek_waktu/response") {
        Serial.println(F("[Time] Time sync response received"));

        // Parse JSON response from server
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, message);

        if (!error) {
            // Server response format:
            // {
            //   "status": "ok",
            //   "server_time": {
            //     "unix": 1732176645,
            //     "iso": "2025-11-21T10:30:45Z",
            //     "local": "21/11/2025, 17:30:45"
            //   }
            // }

            unsigned long timestamp = doc["server_time"]["unix"] | 0;

            if (timestamp > 0) {
                timeManager.setTimeFromMQTT(timestamp);

                Serial.println(F("[Time] ✅ Time synced successfully!"));
                Serial.print(F("[Time] Server time: "));

                const char* isoTime = doc["server_time"]["iso"] | "N/A";
                Serial.println(isoTime);

                timeManager.printStatus();
            } else {
                Serial.println(F("[Time] ❌ Invalid timestamp in response"));
            }
        } else {
            Serial.println(F("[Time] ❌ Failed to parse response JSON"));
        }
        return;
    }

    // Parse JSON command
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.println(F("[MQTT] Invalid JSON command"));
        return;
    }

    // Handle commands
    String command = doc["command"] | "";

    if (command == "restart") {
        Serial.println(F("[Command] Restart requested"));
        delay(1000);
        ESP.restart();
    }
    else if (command == "hard_restart") {
        Serial.println(F("[Command] Hard restart requested"));
        hardRestart();
    }
    else if (command == "status") {
        Serial.println(F("[Command] Status request"));
        sendRawTelemetry();
    }
    else if (command == "rescan") {
        Serial.println(F("[Command] Rescan devices"));
        ioManager.scanAllBuses();
        sendRawTelemetry();
    }
    else if (command == "clear_queue") {
        Serial.println(F("[Command] Clear queue requested"));
        #if ENABLE_SD_CARD
        sdCard.clearQueue();
        #endif
    }
    else {
        Serial.print(F("[Command] Unknown command: "));
        Serial.println(command);
    }
}

// ============================================================================
// GET TIMESTAMP (ISO 8601 format)
// ============================================================================

String getTimestamp() {
    // Use TimeManager for accurate timestamp
    if (timeManager.isSynced()) {
        return timeManager.getISO8601();
    }

    // Fallback: use uptime-based timestamp if not synced
    unsigned long uptimeSec = millis() / 1000;

    char timestamp[25];
    sprintf(timestamp, "UNSYNC-%02lu:%02lu:%02luZ",
            (uptimeSec / 3600) % 24,
            (uptimeSec / 60) % 60,
            uptimeSec % 60);

    return String(timestamp);
}
