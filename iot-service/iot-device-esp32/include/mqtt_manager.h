#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Client.h>

// MQTT_MAX_PACKET_SIZE and MQTT_SOCKET_TIMEOUT are now set via platformio.ini build_flags
// This ensures the library is compiled with the correct limits from the start

#include <PubSubClient.h>

// ============================================================================
// MQTT MANAGER - TinyGSM + PubSubClient wrapper
// ============================================================================

class MQTTManager {
public:
    explicit MQTTManager(Client& networkClient);

    // Initialize MQTT client
    bool begin(const char* broker, uint16_t port, const char* clientId);

    // Connect / disconnect
    bool connect();
    bool disconnect();

    // Status helpers
    bool isConnected();

    // Publish helpers
    bool publish(const char* topic, const char* payload, bool retained = false);
    bool publish(const char* topic, JsonDocument& doc, bool retained = false);

    // Subscriptions
    bool subscribe(const char* topic);
    void setCallback(void (*callback)(char*, uint8_t*, unsigned int));

    // Keepalive
    void loop();

    // Stats
    unsigned long getPublishCount() const { return publishCount; }
    unsigned long getFailedCount() const { return failedCount; }

    // Diagnostics
    void printStatus();

private:
    Client& networkClient;
    PubSubClient mqttClient;

    String brokerHost;
    uint16_t brokerPort;
    String clientId;

    bool connected;
    unsigned long publishCount;
    unsigned long failedCount;

    bool reconnect();
    void logConnectionState(bool result);
};

#endif // MQTT_MANAGER_H
