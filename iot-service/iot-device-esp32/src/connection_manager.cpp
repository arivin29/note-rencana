#include "connection_manager.h"
#include "config.h"

// Timing constants (from our design)
#define LTE_RECONNECT_INTERVAL 30000          // 30s between LTE retries
#define INTERNET_TEST_INTERVAL 300000         // 5min periodic internet test
#define INTERNET_DOWN_RETRY_INTERVAL 10000    // 10s retry cadence when internet is down
#define MQTT_RECONNECT_INTERVAL 10000         // 10s between MQTT retries
#define MQTT_MAX_RETRIES 3                    // Max MQTT retries before checking internet
#define HEALTH_CHECK_INTERVAL 300000          // 5min full health check
#define LTE_REBOOT_RETRY_THRESHOLD 3          // Hard reboot after consecutive LTE failures
#define MQTT_HARD_RESET_THRESHOLD 9           // Total failed MQTT reconnects before reboot
#define CONNECTION_WATCHDOG_TIMEOUT 600000    // 10 min without successful publish triggers restart

namespace {
    inline bool intervalElapsed(unsigned long now, unsigned long last, unsigned long intervalMs) {
        return last == 0 || now - last >= intervalMs;
    }
}

// ============================================================================
// CONSTRUCTOR
// ============================================================================

ConnectionManager::ConnectionManager(LTEManager& lte, MQTTManager& mqtt)
    : lteManager(lte), mqttManager(mqtt) {
    currentState = LTE_DOWN;
    lastLTERetry = 0;
    lastInternetTest = 0;
    lastMQTTRetry = 0;
    lastHealthCheck = 0;
    lastPublishSuccess = 0;
    mqttFailCount = 0;
    lteFailCount = 0;
    lteReconnectAttempts = 0;
    lteHardReboots = 0;
    internetFailCount = 0;
    mqttReconnectAttempts = 0;
    mqttTotalFailures = 0;
    mqttPublishFailures = 0;
}

// ============================================================================
// BEGIN
// ============================================================================

void ConnectionManager::begin() {
    if (lteManager.isConnected()) {
        currentState = LTE_UP_INTERNET_DOWN;
        lastInternetTest = 0; // trigger immediate HTTP validation
        Serial.println("\n[ConnMgr] LTE ready. Validating internet next...");
    } else {
        currentState = LTE_DOWN;
        lastLTERetry = 0; // trigger immediate reconnect attempt
        Serial.println("\n[ConnMgr] LTE offline. Starting reconnection loop...");
    }

    Serial.print("[ConnMgr] Initial State: ");
    Serial.println(getStateString());
    lastPublishSuccess = millis();
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
    Serial.println("\n[ConnMgr] Attempting LTE reconnection...");

    if (lteManager.connect()) {
        Serial.println("[ConnMgr] ✅ LTE reconnected");
        currentState = LTE_UP_INTERNET_DOWN;
        lastInternetTest = 0;  // force immediate internet test
        lastMQTTRetry = 0;
        lteFailCount = 0;
    } else {
        lteFailCount++;
        Serial.print("[ConnMgr] ❌ LTE reconnection failed (");
        Serial.print(lteFailCount);
        Serial.println(" consecutive failures)");

        if (lteFailCount >= LTE_REBOOT_RETRY_THRESHOLD) {
            Serial.println("[ConnMgr] LTE not recovering. Performing modem hard reboot...");
            if (lteManager.rebootModem()) {
                Serial.println("[ConnMgr] ✅ Modem reboot complete");
                currentState = LTE_UP_INTERNET_DOWN;
                lastInternetTest = 0;
                lastMQTTRetry = 0;
                lteFailCount = 0;
                lteHardReboots++;
                return;
            } else {
                Serial.println("[ConnMgr] ❌ Modem reboot failed, will retry later");
            }
        }

        Serial.println("[ConnMgr] Waiting before next LTE retry...");
    }
}

void ConnectionManager::handleInternetDown() {
    unsigned long now = millis();

    if (!lteManager.isConnected()) {
        Serial.println("[ConnMgr] LTE dropped while checking internet. Returning to LTE_DOWN");
        currentState = LTE_DOWN;
        lastLTERetry = 0;
        return;
    }

    if (!intervalElapsed(now, lastInternetTest, INTERNET_DOWN_RETRY_INTERVAL)) {
        return;
    }

    lastInternetTest = now;
    Serial.println("[ConnMgr] Testing internet via HTTP...");

    if (testInternet()) {
        Serial.println("[ConnMgr] ✅ Internet restored");
        currentState = LTE_UP_INTERNET_UP_MQTT_DOWN;
        lastMQTTRetry = 0;
        mqttFailCount = 0;
    } else {
        Serial.println("[ConnMgr] ❌ Internet still down, retrying in 10s");
        internetFailCount++;
    }
}

void ConnectionManager::handleMQTTDown() {
    unsigned long now = millis();

    if (!lteManager.isConnected()) {
        Serial.println("[ConnMgr] LTE dropped during MQTT recovery. Returning to LTE_DOWN");
        currentState = LTE_DOWN;
        lastLTERetry = 0;
        return;
    }

    if (!intervalElapsed(now, lastMQTTRetry, MQTT_RECONNECT_INTERVAL)) {
        return;
    }

    lastMQTTRetry = now;
    mqttReconnectAttempts++;
    Serial.println("\n[ConnMgr] Attempting MQTT reconnection...");

    if (mqttManager.connect()) {
        Serial.println("[ConnMgr] ✅ MQTT reconnected");
        currentState = FULLY_CONNECTED;
        mqttFailCount = 0;
        return;
    }

    mqttFailCount++;
    mqttTotalFailures++;
    Serial.print("[ConnMgr] ❌ MQTT reconnection failed (");
    Serial.print(mqttFailCount);
    Serial.print("/");
    Serial.print(MQTT_MAX_RETRIES);
    Serial.println(")");

    if (mqttFailCount >= MQTT_MAX_RETRIES) {
        Serial.println("[ConnMgr] Escalating to internet diagnostics after MQTT failures");
        currentState = LTE_UP_INTERNET_DOWN;
        lastInternetTest = 0;
        mqttFailCount = 0;
    }

    if (mqttTotalFailures >= MQTT_HARD_RESET_THRESHOLD) {
        Serial.println("[ConnMgr] MQTT failures exceeded threshold. Rebooting MCU...");
        delay(200);
        ESP.restart();
    }
}

void ConnectionManager::handleConnected() {
    unsigned long now = millis();

    // Immediate sanity checks
    if (!lteManager.isConnected()) {
        Serial.println("[ConnMgr] LTE lost while connected. Returning to LTE_DOWN");
        currentState = LTE_DOWN;
        lastLTERetry = 0;
        return;
    }

    if (!mqttManager.isConnected()) {
        Serial.println("[ConnMgr] MQTT disconnected! State → MQTT_DOWN");
        currentState = LTE_UP_INTERNET_UP_MQTT_DOWN;
        lastMQTTRetry = 0;
        mqttFailCount = 0;
        return;
    }

    // Periodic internet validation (every 5 minutes)
    if (intervalElapsed(now, lastInternetTest, INTERNET_TEST_INTERVAL)) {
        Serial.println("[ConnMgr] Running periodic internet diagnostics...");
        if (!testInternet()) {
            Serial.println("[ConnMgr] Internet degraded, moving back to diagnostics");
            currentState = LTE_UP_INTERNET_DOWN;
            lastInternetTest = 0;
            return;
        }
        lastInternetTest = now;
    }

    // Connection watchdog - ensure successful publish within timeout
    if (intervalElapsed(now, lastPublishSuccess, CONNECTION_WATCHDOG_TIMEOUT)) {
        Serial.println("[ConnMgr] Publish watchdog triggered! Rebooting MCU...");
        delay(200);
        ESP.restart();
    }

    // Periodic health summary
    if (intervalElapsed(now, lastHealthCheck, HEALTH_CHECK_INTERVAL)) {
        lastHealthCheck = now;
        Serial.println("\n[ConnMgr] === PERIODIC HEALTH CHECK ===");
        lteManager.printStatus();
        mqttManager.printStatus();
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

        case LTE_UP_INTERNET_UP_MQTT_DOWN:
            handleMQTTDown();
            break;

        case FULLY_CONNECTED:
            handleConnected();
            break;
    }

    mqttManager.loop();
}

// ============================================================================
// STATUS CHECKS
// ============================================================================

bool ConnectionManager::isLTEReady() {
    return lteManager.isConnected();
}

bool ConnectionManager::isInternetReady() {
    return (currentState == LTE_UP_INTERNET_UP_MQTT_DOWN || currentState == FULLY_CONNECTED);
}

bool ConnectionManager::isMQTTReady() {
    return (currentState == FULLY_CONNECTED && mqttManager.isConnected());
}

bool ConnectionManager::isFullyConnected() {
    return (currentState == FULLY_CONNECTED);
}

void ConnectionManager::notifyPublishResult(bool success) {
    if (success) {
        lastPublishSuccess = millis();
    } else {
        mqttPublishFailures++;
    }
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
        case LTE_UP_INTERNET_UP_MQTT_DOWN: return "LTE_UP_INTERNET_UP_MQTT_DOWN";
        case FULLY_CONNECTED: return "FULLY_CONNECTED";
        default: return "UNKNOWN";
    }
}

// ============================================================================
// PRINT STATUS
// ============================================================================

void ConnectionManager::printStatus() {
    Serial.println("\n========== CONNECTION STATUS ==========");
    Serial.print("State: ");
    Serial.println(getStateString());
    Serial.print("LTE: ");
    Serial.println(isLTEReady() ? "✅" : "❌");
    Serial.print("Internet: ");
    Serial.println(isInternetReady() ? "✅" : "❌");
    Serial.print("MQTT: ");
    Serial.println(isMQTTReady() ? "✅" : "❌");
    Serial.println("=======================================\n");
}
