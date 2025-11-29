/**
 * connection_manager.h
 * 
 * Simple Connection Manager for LTE
 * Auto-reconnect and health monitoring (without MQTT)
 */

#ifndef CONNECTION_MANAGER_H
#define CONNECTION_MANAGER_H

#include <Arduino.h>
#include "lte_manager.h"

// ============================================================================
// CONNECTION MANAGER - Auto-Reconnect for LTE
// ============================================================================

class ConnectionManager {
public:
    // Connection states
    enum State {
        LTE_DOWN,               // No LTE connection
        LTE_UP_INTERNET_DOWN,   // LTE connected but internet failed
        FULLY_CONNECTED         // LTE + Internet working
    };

    ConnectionManager(LTEManager& lte);

    // Initialize connection manager
    void begin();

    // Main monitoring loop (call in main loop)
    void loop();

    // Status checks
    bool isLTEReady();
    bool isInternetReady();
    bool isFullyConnected();

    // Get current state
    State getState();
    String getStateString();

    // Metrics getters
    uint32_t getLteHardRebootCount() const { return lteHardReboots; }
    uint32_t getLteReconnectAttempts() const { return lteReconnectAttempts; }
    uint32_t getInternetFailCount() const { return internetFailCount; }
    unsigned long getLastInternetTest() const { return lastInternetTest; }

    // Print status
    void printStatus();

private:
    LTEManager& lteManager;

    State currentState;

    unsigned long lastLTERetry;
    unsigned long lastInternetTest;
    unsigned long lastHealthCheck;

    int lteFailCount;
    uint32_t lteReconnectAttempts;
    uint32_t lteHardReboots;
    uint32_t internetFailCount;

    // State machine handlers
    void handleLTEDown();
    void handleInternetDown();
    void handleConnected();

    // Internet test
    bool testInternet();
};

#endif // CONNECTION_MANAGER_H
