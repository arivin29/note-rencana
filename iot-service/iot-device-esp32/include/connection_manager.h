#ifndef CONNECTION_MANAGER_H
#define CONNECTION_MANAGER_H

#include <Arduino.h>
#include "lte_manager.h"
#include "mqtt_manager.h"
#include <esp_system.h>

// ============================================================================
// CONNECTION MANAGER - Hierarchical Auto-Reconnect State Machine
// ============================================================================

class ConnectionManager {
public:
    // Connection states
    enum State {
        LTE_DOWN,
        LTE_UP_INTERNET_DOWN,
        LTE_UP_INTERNET_UP_MQTT_DOWN,
        FULLY_CONNECTED
    };

    ConnectionManager(LTEManager& lte, MQTTManager& mqtt);

    // Initialize connection manager
    void begin();

    // Main state machine loop (call in main loop)
    void loop();

    // Status checks
    bool isLTEReady();
    bool isInternetReady();
    bool isMQTTReady();
    bool isFullyConnected();

    // Publish feedback
    void notifyPublishResult(bool success);

    // Metrics getters
    uint32_t getLteHardRebootCount() const { return lteHardReboots; }
    uint32_t getLteReconnectAttempts() const { return lteReconnectAttempts; }
    uint32_t getInternetFailCount() const { return internetFailCount; }
    uint32_t getMqttReconnectAttempts() const { return mqttReconnectAttempts; }
    uint32_t getMqttTotalFailures() const { return mqttTotalFailures; }
    uint32_t getPublishFailureCount() const { return mqttPublishFailures; }
    unsigned long getLastPublishSuccess() const { return lastPublishSuccess; }

    // Get current state
    State getState();
    String getStateString();

    // Print status
    void printStatus();

private:
    LTEManager& lteManager;
    MQTTManager& mqttManager;

    State currentState;

    unsigned long lastLTERetry;
    unsigned long lastInternetTest;
    unsigned long lastMQTTRetry;
    unsigned long lastHealthCheck;
    unsigned long lastPublishSuccess;

    int mqttFailCount;
    int lteFailCount;
    uint32_t lteReconnectAttempts;
    uint32_t lteHardReboots;
    uint32_t internetFailCount;
    uint32_t mqttReconnectAttempts;
    uint32_t mqttTotalFailures;
    uint32_t mqttPublishFailures;

    // State machine handlers
    void handleLTEDown();
    void handleInternetDown();
    void handleMQTTDown();
    void handleConnected();

    // Internet test
    bool testInternet();
};

#endif // CONNECTION_MANAGER_H
