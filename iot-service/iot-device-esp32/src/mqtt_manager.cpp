#define TINY_GSM_MODEM_SIM7600
#include "mqtt_manager.h"
#include "config.h"

// ============================================================================
// CONSTRUCTOR
// ============================================================================

MQTTManager::MQTTManager(Client& netClient)
    : networkClient(netClient), mqttClient(netClient) {
    brokerPort = 0;
    connected = false;
    publishCount = 0;
    failedCount = 0;
}

// ============================================================================
// INITIALIZE
// ============================================================================

bool MQTTManager::begin(const char* brokerAddr, uint16_t port, const char* clientIdStr) {
    brokerHost = brokerAddr;
    brokerPort = port;
    clientId = String(clientIdStr);

    mqttClient.setServer(brokerHost.c_str(), brokerPort);
    mqttClient.setKeepAlive(MQTT_KEEP_ALIVE);
    mqttClient.setBufferSize(1024);  // allow payloads >256B

    #if DEBUG_MQTT
    Serial.print(F("[MQTT] Initialized for "));
    Serial.print(brokerHost);
    Serial.print(F(":"));
    Serial.println(brokerPort);
    Serial.print(F("[MQTT] Client ID: "));
    Serial.println(clientId);
    #endif

    return true;
}

// ============================================================================
// CONNECT / DISCONNECT
// ============================================================================

bool MQTTManager::connect() {
    if (brokerPort == 0) {
        Serial.println(F("[MQTT] Broker not configured"));
        return false;
    }

    if (mqttClient.connected()) {
        connected = true;
        return true;
    }

    Serial.print(F("[MQTT] Connecting to "));
    Serial.print(brokerHost);
    Serial.print(F(":"));
    Serial.println(brokerPort);

    bool result = mqttClient.connect(clientId.c_str());
    logConnectionState(result);

    if (result) {
        connected = true;
    } else {
        connected = false;
        failedCount++;
    }

    return result;
}

bool MQTTManager::disconnect() {
    if (mqttClient.connected()) {
        mqttClient.disconnect();
    }

    connected = false;
    return true;
}

bool MQTTManager::reconnect() {
    return connect();
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

bool MQTTManager::isConnected() {
    connected = mqttClient.connected();
    return connected;
}

void MQTTManager::loop() {
    mqttClient.loop();
    connected = mqttClient.connected();
}

// ============================================================================
// PUBLISH HELPERS
// ============================================================================

bool MQTTManager::publish(const char* topic, const char* payload, bool retained) {
    if (!mqttClient.connected()) {
        connected = false;
        failedCount++;
        #if DEBUG_MQTT
        Serial.println(F("[MQTT] Cannot publish - not connected"));
        #endif
        return false;
    }

    #if DEBUG_MQTT
    Serial.print(F("[MQTT] Publishing to "));
    Serial.print(topic);
    Serial.print(F(" ("));
    Serial.print(strlen(payload));
    Serial.println(F(" bytes)"));
    #endif

    bool ok = mqttClient.publish(
        topic,
        reinterpret_cast<const uint8_t*>(payload),
        strlen(payload),
        retained);

    if (ok) {
        publishCount++;
    } else {
        failedCount++;
        #if DEBUG_MQTT
        Serial.print(F("[MQTT] Publish failed, state="));
        Serial.println(mqttClient.state());
        #endif
    }

    return ok;
}

bool MQTTManager::publish(const char* topic, JsonDocument& doc, bool retained) {
    String payload;
    serializeJson(doc, payload);
    return publish(topic, payload.c_str(), retained);
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

bool MQTTManager::subscribe(const char* topic) {
    if (!mqttClient.connected()) {
        return false;
    }

    bool ok = mqttClient.subscribe(topic);

    #if DEBUG_MQTT
    Serial.print(F("[MQTT] Subscribe "));
    Serial.print(topic);
    Serial.println(ok ? F(" ✅") : F(" ❌"));
    #endif

    return ok;
}

void MQTTManager::setCallback(void (*callback)(char*, uint8_t*, unsigned int)) {
    mqttClient.setCallback(callback);
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

void MQTTManager::printStatus() {
    Serial.println(F("\n========== MQTT STATUS =========="));
    Serial.print(F("Broker: "));
    Serial.print(brokerHost);
    Serial.print(F(":"));
    Serial.println(brokerPort);
    Serial.print(F("Client ID: "));
    Serial.println(clientId);
    Serial.print(F("Connected: "));
    Serial.println(mqttClient.connected() ? F("Yes") : F("No"));
    Serial.print(F("State: "));
    Serial.println(mqttClient.state());
    Serial.print(F("Published: "));
    Serial.println(publishCount);
    Serial.print(F("Failed: "));
    Serial.println(failedCount);
    Serial.println(F("=================================\n"));
}

void MQTTManager::logConnectionState(bool result) {
    if (result) {
        Serial.println(F("[MQTT] ✅ Connected"));
    } else {
        Serial.print(F("[MQTT] ❌ Failed, state="));
        Serial.println(mqttClient.state());
    }
}
