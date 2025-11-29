#include "connection_manager.h"

// ============================================================================
// TIMING CONSTANTS
// ============================================================================
#define LTE_RECONNECT_INTERVAL 30000          // 30s between LTE retries
#define INTERNET_TEST_INTERVAL 300000         // 5min periodic internet test
#define INTERNET_DOWN_RETRY_INTERVAL 10000    // 10s retry when internet is down
#define HEALTH_CHECK_INTERVAL 300000          // 5min full health check
#define LTE_REBOOT_RETRY_THRESHOLD 3          // Hard reboot after 3 consecutive failures

// ============================================================================
// HELPER
// ============================================================================
namespace {
    inline bool intervalElapsed(unsigned long now, unsigned long last, unsigned long intervalMs) {
        return last == 0 || now - last >= intervalMs;
    }
}

// ============================================================================
// CONSTRUCTOR
// ============================================================================

ConnectionManager::ConnectionManager(LTEManager& lte)
    : lteManager(lte) {
    currentState = LTE_DOWN;
    lastLTERetry = 0;
    lastInternetTest = 0;
    lastHealthCheck = 0;
    lteFailCount = 0;
    lteReconnectAttempts = 0;
    lteHardReboots = 0;
    internetFailCount = 0;
}

// ============================================================================
// BEGIN
// ============================================================================

void ConnectionManager::begin() {
    Serial.println("\n[ConnMgr] Starting Connection Manager...");
    
    if (lteManager.isConnected()) {
        currentState = LTE_UP_INTERNET_DOWN;
        lastInternetTest = 0; // trigger immediate HTTP validation
        Serial.println("[ConnMgr] LTE ready. Validating internet next...");
    } else {
        currentState = LTE_DOWN;
        lastLTERetry = 0; // trigger immediate reconnect attempt
        Serial.println("[ConnMgr] LTE offline. Starting reconnection loop...");
    }

    Serial.print("[ConnMgr] Initial State: ");
    Serial.println(getStateString());
}

// ============================================================================
// TEST INTERNET
// ============================================================================

bool ConnectionManager::testInternet() {
    return lteManager.testInternet();
}

// ============================================================================
// STATE HANDLERS
// ============================================================================

void ConnectionManager::handleLTEDown() {
    unsigned long now = millis();

    if (!intervalElapsed(now, lastLTERetry, LTE_RECONNECT_INTERVAL)) {
        return;
    }

    lastLTERetry = now;
    lteReconnectAttempts++;
    Serial.println("\n[ConnMgr] === LTE RECONNECTION ATTEMPT ===");
    Serial.printf("[ConnMgr] Attempt #%u\n", lteReconnectAttempts);

    if (lteManager.connect()) {
        Serial.println("[ConnMgr] ✅ LTE reconnected successfully");
        currentState = LTE_UP_INTERNET_DOWN;
        lastInternetTest = 0;  // force immediate internet test
        lteFailCount = 0;
    } else {
        lteFailCount++;
        Serial.printf("[ConnMgr] ❌ LTE reconnection failed (%d consecutive failures)\n", lteFailCount);

        if (lteFailCount >= LTE_REBOOT_RETRY_THRESHOLD) {
            Serial.println("[ConnMgr] ⚠️ LTE not recovering. Performing modem HARD REBOOT...");
            
            if (lteManager.rebootModem()) {
                Serial.println("[ConnMgr] ✅ Modem reboot complete");
                currentState = LTE_UP_INTERNET_DOWN;
                lastInternetTest = 0;
                lteFailCount = 0;
                lteHardReboots++;
                return;
            } else {
                Serial.println("[ConnMgr] ❌ Modem reboot failed, will retry later");
            }
        }

        Serial.printf("[ConnMgr] Next retry in %d seconds...\n", LTE_RECONNECT_INTERVAL / 1000);
    }
}

void ConnectionManager::handleInternetDown() {
    unsigned long now = millis();

    // Check if LTE dropped
    if (!lteManager.isConnected()) {
        Serial.println("[ConnMgr] ⚠️ LTE dropped while checking internet. Returning to LTE_DOWN");
        currentState = LTE_DOWN;
        lastLTERetry = 0;
        return;
    }

    if (!intervalElapsed(now, lastInternetTest, INTERNET_DOWN_RETRY_INTERVAL)) {
        return;
    }

    lastInternetTest = now;
    Serial.println("\n[ConnMgr] Testing internet connectivity (HTTP)...");

    if (testInternet()) {
        Serial.println("[ConnMgr] ✅ Internet restored");
        currentState = FULLY_CONNECTED;
        internetFailCount = 0;
        
        // Print success summary
        Serial.println("\n╔════════════════════════════════════════╗");
        Serial.println("║  CONNECTION FULLY ESTABLISHED  ✅     ║");
        Serial.println("╚════════════════════════════════════════╝");
        lteManager.printStatus();
        
    } else {
        internetFailCount++;
        Serial.printf("[ConnMgr] ❌ Internet still down (fail count: %u)\n", internetFailCount);
        Serial.println("[ConnMgr] Retrying in 10 seconds...");
    }
}

void ConnectionManager::handleConnected() {
    unsigned long now = millis();

    // Immediate sanity check - LTE status
    if (!lteManager.isConnected()) {
        Serial.println("\n[ConnMgr] ⚠️ LTE CONNECTION LOST! Returning to LTE_DOWN");
        currentState = LTE_DOWN;
        lastLTERetry = 0;
        return;
    }

    // Periodic internet validation (every 5 minutes)
    if (intervalElapsed(now, lastInternetTest, INTERNET_TEST_INTERVAL)) {
        Serial.println("\n[ConnMgr] Running periodic internet health check...");
        
        if (!testInternet()) {
            Serial.println("[ConnMgr] ⚠️ Internet degraded! Moving to diagnostics");
            currentState = LTE_UP_INTERNET_DOWN;
            lastInternetTest = 0;
            return;
        }
        
        Serial.println("[ConnMgr] ✅ Internet health check PASSED");
        lastInternetTest = now;
    }

    // Periodic health summary (every 5 minutes)
    if (intervalElapsed(now, lastHealthCheck, HEALTH_CHECK_INTERVAL)) {
        lastHealthCheck = now;
        Serial.println("\n╔════════════════════════════════════════╗");
        Serial.println("║  PERIODIC HEALTH CHECK                ║");
        Serial.println("╚════════════════════════════════════════╝");
        lteManager.printStatus();
        printStatus();
    }
}

// ============================================================================
// MAIN LOOP (State Machine)
// ============================================================================

void ConnectionManager::loop() {
    switch (currentState) {
        case LTE_DOWN:
            handleLTEDown();
            break;

        case LTE_UP_INTERNET_DOWN:
            handleInternetDown();
            break;

        case FULLY_CONNECTED:
            handleConnected();
            break;
    }
}

// ============================================================================
// STATUS CHECKS
// ============================================================================

bool ConnectionManager::isLTEReady() {
    return lteManager.isConnected();
}

bool ConnectionManager::isInternetReady() {
    return (currentState == FULLY_CONNECTED);
}

bool ConnectionManager::isFullyConnected() {
    return (currentState == FULLY_CONNECTED);
}

// ============================================================================
// GET STATE
// ============================================================================

ConnectionManager::State ConnectionManager::getState() {
    return currentState;
}

String ConnectionManager::getStateString() {
    switch (currentState) {
        case LTE_DOWN: return "LTE_DOWN";
        case LTE_UP_INTERNET_DOWN: return "LTE_UP_INTERNET_DOWN";
        case FULLY_CONNECTED: return "FULLY_CONNECTED";
        default: return "UNKNOWN";
    }
}

// ============================================================================
// PRINT STATUS
// ============================================================================

void ConnectionManager::printStatus() {
    Serial.println("\n========== CONNECTION MANAGER STATUS ==========");
    Serial.print("State: ");
    Serial.println(getStateString());
    Serial.println("───────────────────────────────────────────────");
    Serial.printf("LTE Status:         %s\n", isLTEReady() ? "✅ Connected" : "❌ Disconnected");
    Serial.printf("Internet Status:    %s\n", isInternetReady() ? "✅ Working" : "❌ Down");
    Serial.println("───────────────────────────────────────────────");
    Serial.println("Metrics:");
    Serial.printf("  LTE Reconnects:    %u attempts\n", lteReconnectAttempts);
    Serial.printf("  LTE Hard Reboots:  %u times\n", lteHardReboots);
    Serial.printf("  Internet Failures: %u times\n", internetFailCount);
    Serial.println("===============================================\n");
}
