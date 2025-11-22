// ============================================================================
// ESP32-S3 GENERIC IOT FIRMWARE - CONNECTION FIRST APPROACH
// Focus: LTE + MQTT reliability with dummy telemetry payloads
// ============================================================================

#define TINY_GSM_MODEM_SIM7600

#include <TinyGsmClient.h>
#include <ModbusMaster.h>

#include "config.h"
#include "lte_manager.h"
#include "mqtt_manager.h"
#include "connection_manager.h"
#include "telemetry.h"
#include "time_manager.h"

// ============================================================================
// HARDWARE SERIAL FOR SIM7600
// ============================================================================

HardwareSerial simSerial(1);

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================

TinyGsm modem(simSerial);
TinyGsmClient gsmClient(modem, 0);     // Dedicated socket for MQTT
TinyGsmClient diagClient(modem, 1);    // Dedicated socket for diagnostics/HTTP tests

LTEManager lteManager;
MQTTManager mqttManager(gsmClient);
ConnectionManager connectionManager(lteManager, mqttManager);
TimeManager timeManager;
ModbusMaster modbusNode;   // Required by generic_io module (even if unused now)

String DEVICE_ID;
unsigned long lastTelemetrySent = 0;
bool bootNotificationSent = false;

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
    Serial.println("Connection Layer Validation Build");
    Serial.println("========================================");

    DEVICE_ID = buildDeviceId();
    Serial.print("Device ID: ");
    Serial.println(DEVICE_ID);

    Serial.println("\n[1/4] Initializing Time Manager...");
    timeManager.begin();
    timeManager.printStatus();

    Serial.println("\n[2/4] Powering LTE stack...");
    bool lteReady = lteManager.begin();
    Serial.println(lteReady ? "[LTE] ✅ Ready" : "[LTE] ❌ Failed (auto-retry active)");

    Serial.println("\n[3/4] Preparing MQTT manager...");
    mqttManager.begin(MQTT_BROKER, MQTT_PORT, DEVICE_ID.c_str());

    Serial.println("\n[4/4] Starting Connection Manager...");
    connectionManager.begin();

    Serial.println("\n========================================");
    Serial.println("Initialization complete. Monitoring connections...");
    Serial.println("========================================\n");
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
