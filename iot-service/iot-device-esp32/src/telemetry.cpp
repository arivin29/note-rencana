#define TINY_GSM_MODEM_SIM7600
#include "telemetry.h"
#include "config.h"
#include "mqtt_manager.h"
#include "connection_manager.h"
#include "time_manager.h"
#include <ArduinoJson.h>
#include <TinyGsmClient.h>

// External references
extern String DEVICE_ID;
extern TinyGsm modem;
extern MQTTManager mqttManager;
extern TimeManager timeManager;
extern ConnectionManager connectionManager;

// ============================================================================
// HELPERS
// ============================================================================

static void buildDummySensors(JsonDocument& doc) {
    JsonObject sensors = doc["sensors"].to<JsonObject>();
    sensors["pressure_bar"] = 2.3 + (millis() % 40) / 10.0f;
    sensors["flow_lpm"] = 12 + (millis() / 1000) % 5;
    sensors["temperature_c"] = 28.5f;
    sensors["status"] = "dummy";
}

static void appendSignalInfo(JsonDocument& doc) {
    JsonObject signal = doc["signal"].to<JsonObject>();
    signal["rssi"] = modem.getSignalQuality();
    signal["operator"] = modem.getOperator();
    signal["ip"] = modem.localIP().toString();
}

static void appendSystemInfo(JsonDocument& doc) {
    JsonObject system = doc["system"].to<JsonObject>();
    system["uptime_s"] = millis() / 1000;
    system["free_heap"] = ESP.getFreeHeap();
}

// ============================================================================
// FULL TELEMETRY
// ============================================================================

void sendFullTelemetry() {
    JsonDocument doc;

    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = timeManager.getTimestamp();
    doc["firmware"] = "generic-v2.0-conn";

    buildDummySensors(doc);
    appendSignalInfo(doc);
    appendSystemInfo(doc);

    JsonObject conn = doc["connection"].to<JsonObject>();
    conn["state"] = connectionManager.getStateString();
    conn["lte_reconnects"] = connectionManager.getLteReconnectAttempts();
    conn["lte_reboots"] = connectionManager.getLteHardRebootCount();
    conn["internet_fail"] = connectionManager.getInternetFailCount();
    conn["mqtt_reconnects"] = connectionManager.getMqttReconnectAttempts();
    conn["mqtt_fail"] = connectionManager.getMqttTotalFailures();
    conn["publish_fail"] = connectionManager.getPublishFailureCount();
    unsigned long lastOk = connectionManager.getLastPublishSuccess();
    conn["seconds_since_ok"] = lastOk ? (millis() - lastOk) / 1000 : 0;

    Serial.println("\n========== DUMMY TELEMETRY ==========");
    serializeJsonPretty(doc, Serial);
    Serial.println();

    if (!mqttManager.isConnected()) {
        Serial.println("[Telemetry] MQTT not ready. Skipping publish.");
        return;
    }

    String topic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/telemetry";
    Serial.print("[Telemetry] Publishing to ");
    Serial.println(topic);

    bool publishOk = mqttManager.publish(topic.c_str(), doc);
    connectionManager.notifyPublishResult(publishOk);

    if (publishOk) {
        Serial.println("[Telemetry] ✅ Published");
    } else {
        Serial.println("[Telemetry] ❌ Publish failed");
    }

    Serial.println("======================================\n");
}

// ============================================================================
// BOOT NOTIFICATION
// ============================================================================

void sendBootNotification() {
    if (!mqttManager.isConnected()) {
        Serial.println("[Boot] MQTT not ready. Boot notification skipped.");
        return;
    }

    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = timeManager.getTimestamp();
    doc["event"] = "boot";
    doc["firmware"] = "generic-v2.0-conn";
    doc["reset_reason"] = esp_reset_reason();

    appendSignalInfo(doc);
    appendSystemInfo(doc);

    String topic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/boot";
    Serial.print("[Boot] Publishing boot event to ");
    Serial.println(topic);

    bool ok = mqttManager.publish(topic.c_str(), doc);
    connectionManager.notifyPublishResult(ok);

    if (ok) {
        Serial.println("[Boot] ✅ Notification sent");
    } else {
        Serial.println("[Boot] ❌ Failed to send notification");
    }
}
