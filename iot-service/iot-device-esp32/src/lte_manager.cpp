#define TINY_GSM_MODEM_SIM7600
#include "lte_manager.h"
#include "config.h"

// External references
extern HardwareSerial simSerial;
extern TinyGsm modem;
extern TinyGsmClient diagClient;

// ============================================================================
// CONSTRUCTOR
// ============================================================================

LTEManager::LTEManager() {
    gprsConnected = false;
    lastCheck = 0;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

void LTEManager::pulsePowerKey(uint32_t durationMs) {
    pinMode(SIM7600_PWRKEY_PIN, OUTPUT);
    digitalWrite(SIM7600_PWRKEY_PIN, LOW);
    delay(100);
    digitalWrite(SIM7600_PWRKEY_PIN, HIGH);
    delay(durationMs);
    digitalWrite(SIM7600_PWRKEY_PIN, LOW);
}

void LTEManager::powerOffModem() {
    Serial.println("[LTE] Powering OFF modem...");
    pulsePowerKey(1500); // Hold longer to trigger shutdown
    delay(2000);         // Allow modem to settle
    Serial.println("[LTE] Power OFF sequence complete");
}

void LTEManager::hardwareReset() {
    #if SIM7600_RESET_PIN >= 0
    Serial.println("[LTE] Toggling hardware RESET pin...");
    pinMode(SIM7600_RESET_PIN, OUTPUT);
    digitalWrite(SIM7600_RESET_PIN, LOW);
    delay(200);
    digitalWrite(SIM7600_RESET_PIN, HIGH);
    delay(200);
    digitalWrite(SIM7600_RESET_PIN, LOW);
    delay(2000);
    #endif
}

// ============================================================================
// POWER ON MODEM
// ============================================================================

bool LTEManager::powerOnModem() {
    Serial.println("[LTE] Step 1/6: Powering ON modem...");

    pulsePowerKey(1000);

    Serial.println("[LTE] Waiting 12s for modem boot...");
    delay(12000);

    // Extra delay for stability
    Serial.println("[LTE] Extra 3s delay for stability...");
    delay(3000);

    Serial.println("[LTE] ✅ Power ON complete");
    return true;
}

// ============================================================================
// INIT MODEM
// ============================================================================

bool LTEManager::initModem() {
    Serial.println("[LTE] Step 2/6: Testing modem response...");

    for (int i = 0; i < 5; i++) {
        Serial.print("[LTE] Attempt ");
        Serial.print(i + 1);
        Serial.print("/5... ");

        if (modem.testAT(1000)) {
            Serial.println("✅ OK");
            Serial.println("[LTE] Step 3/6: Getting modem info...");

            String modemInfo = modem.getModemInfo();
            Serial.print("[LTE] Modem: ");
            Serial.println(modemInfo);

            return true;
        }

        Serial.println("❌ No response");
        delay(1000);
    }

    Serial.println("[LTE] ❌ Modem not responding!");
    return false;
}

// ============================================================================
// CONNECT GPRS
// ============================================================================

bool LTEManager::connectGPRS() {
    Serial.println("[LTE] Step 4/6: Connecting to network...");

    if (!modem.waitForNetwork(30000)) {
        Serial.println("[LTE] ❌ Network registration failed!");
        return false;
    }

    Serial.println("[LTE] ✅ Network registered");

    Serial.println("[LTE] Step 5/6: Connecting GPRS...");

    // Try to connect GPRS with retry
    for (int i = 0; i < 3; i++) {
        Serial.print("[LTE] GPRS Attempt ");
        Serial.print(i + 1);
        Serial.print("/3... ");

        if (modem.gprsConnect(APN_NAME, APN_USER, APN_PASS)) {
            Serial.println("✅ Connected");

            Serial.println("[LTE] Step 6/6: Verifying IP address...");
            String ip = modem.localIP().toString();

            if (ip != "0.0.0.0") {
                Serial.print("[LTE] IP Address: ");
                Serial.println(ip);
                gprsConnected = true;
                return true;
            } else {
                Serial.println("[LTE] ⚠️ Invalid IP, retrying...");
            }
        } else {
            Serial.println("❌ Failed");
        }

        delay(2000);
    }

    Serial.println("[LTE] ❌ GPRS connection failed!");
    return false;
}

// ============================================================================
// BEGIN (Full initialization)
// ============================================================================

bool LTEManager::begin() {
    Serial.println("\n========== LTE INITIALIZATION ==========");

    // Init serial BEFORE power on (CRITICAL!)
    Serial.println("[LTE] Initializing serial...");
    simSerial.begin(115200, SERIAL_8N1, SIM7600_RX_PIN, SIM7600_TX_PIN);
    delay(1000);

    // Power on modem
    if (!powerOnModem()) {
        return false;
    }

    // Test modem
    if (!initModem()) {
        return false;
    }

    // Connect GPRS
    if (!connectGPRS()) {
        return false;
    }

    Serial.println("========================================");
    Serial.println("[LTE] ✅ LTE Ready!");
    Serial.println("========================================\n");

    return true;
}

// ============================================================================
// CONNECT (Reconnect if disconnected)
// ============================================================================

bool LTEManager::connect() {
    Serial.println("[LTE] Reconnecting...");

    // Check network first
    if (!modem.isNetworkConnected()) {
        Serial.println("[LTE] Network lost, waiting for registration...");
        if (!modem.waitForNetwork(30000)) {
            Serial.println("[LTE] ❌ Network registration failed!");
            return false;
        }
    }

    // Reconnect GPRS
    return connectGPRS();
}

// ============================================================================
// DISCONNECT
// ============================================================================

bool LTEManager::disconnect() {
    Serial.println("[LTE] Disconnecting GPRS...");
    modem.gprsDisconnect();
    gprsConnected = false;
    Serial.println("[LTE] Disconnected");
    return true;
}

// ============================================================================
// IS CONNECTED
// ============================================================================

bool LTEManager::isConnected() {
    // Check GPRS connection status
    bool connected = modem.isGprsConnected();
    gprsConnected = connected;
    return connected;
}

// ============================================================================
// TEST INTERNET (HTTP to Google)
// ============================================================================

bool LTEManager::testInternet() {
    Serial.println("\n========== INTERNET TEST ==========");

    // Check GPRS
    Serial.print("[Test] GPRS Status: ");
    if (!isConnected()) {
        Serial.println("❌ NOT CONNECTED");
        Serial.println("===================================\n");
        return false;
    }
    Serial.println("✅ Connected");

    // Get IP
    Serial.print("[Test] IP Address: ");
    Serial.println(getIPAddress());

    // Get signal quality
    Serial.print("[Test] Signal Quality: CSQ ");
    Serial.println(getSignalQuality());

    // HTTP test to Google using dedicated diagnostic client (mux 1)
    Serial.print("[Test] HTTP Test (http://google.com): ");
    if (diagClient.connected()) {
        diagClient.stop();
    }

    if (diagClient.connect("google.com", 80)) {
        Serial.println("✅ SUCCESS");
        diagClient.stop();
        Serial.println("===================================\n");
        return true;
    } else {
        Serial.println("❌ FAILED");
        diagClient.stop();
        Serial.println("===================================\n");
        return false;
    }
}

// ============================================================================
// HARD REBOOT
// ============================================================================

bool LTEManager::rebootModem() {
    Serial.println("\n========== LTE HARD REBOOT ==========");

    gprsConnected = false;

    // Attempt graceful disconnect
    modem.gprsDisconnect();

    // Power cycle the module
    powerOffModem();
    hardwareReset();

    // Power back on
    if (!powerOnModem()) {
        Serial.println("[LTE] ❌ Failed to power modem back on");
        return false;
    }

    // Re-run initialization
    if (!initModem()) {
        Serial.println("[LTE] ❌ Modem not responding after reboot");
        return false;
    }

    if (!connectGPRS()) {
        Serial.println("[LTE] ❌ Failed to attach GPRS after reboot");
        return false;
    }

    Serial.println("[LTE] ✅ Hard reboot successful");
    Serial.println("====================================\n");
    return true;
}

// ============================================================================
// GET SIGNAL QUALITY
// ============================================================================

int LTEManager::getSignalQuality() {
    return modem.getSignalQuality();
}

// ============================================================================
// GET OPERATOR
// ============================================================================

String LTEManager::getOperator() {
    return modem.getOperator();
}

// ============================================================================
// GET IP ADDRESS
// ============================================================================

String LTEManager::getIPAddress() {
    return modem.localIP().toString();
}

// ============================================================================
// PRINT STATUS
// ============================================================================

void LTEManager::printStatus() {
    Serial.println("\n========== LTE STATUS ==========");
    Serial.print("GPRS: ");
    Serial.println(isConnected() ? "Connected" : "Disconnected");
    Serial.print("IP: ");
    Serial.println(getIPAddress());
    Serial.print("Operator: ");
    Serial.println(getOperator());
    Serial.print("Signal: CSQ ");
    Serial.println(getSignalQuality());
    Serial.println("================================\n");
}
