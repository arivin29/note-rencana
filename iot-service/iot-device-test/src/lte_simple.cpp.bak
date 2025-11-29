/**
 * lte_simple.cpp
 * 
 * Simple LTE manager implementation
 */

#include "lte_simple.h"

LTESimple::LTESimple(HardwareSerial* ser) : serial(ser), modem(nullptr) {
}

void LTESimple::powerOn() {
    pinMode(SIM7600_PWR_PIN, OUTPUT);
    
    Serial.println("[LTE] Powering ON modem...");
    digitalWrite(SIM7600_PWR_PIN, HIGH);
    delay(500);
    digitalWrite(SIM7600_PWR_PIN, LOW);
    delay(12000);  // Wait for modem boot
    
    Serial.println("[LTE] Modem power ON complete");
}

void LTESimple::powerOff() {
    pinMode(SIM7600_PWR_PIN, OUTPUT);
    
    Serial.println("[LTE] Powering OFF modem...");
    digitalWrite(SIM7600_PWR_PIN, HIGH);
    delay(500);
    digitalWrite(SIM7600_PWR_PIN, LOW);
    delay(2000);
    
    Serial.println("[LTE] Modem power OFF complete");
}

bool LTESimple::testModemResponse(int maxAttempts) {
    Serial.println("[LTE] Testing modem response...");
    
    for (int i = 0; i < maxAttempts; i++) {
        serial->println("AT");
        delay(500);
        
        if (serial->available()) {
            String response = serial->readString();
            if (response.indexOf("OK") >= 0) {
                Serial.printf("[LTE] Modem responded on attempt %d/%d\n", i + 1, maxAttempts);
                return true;
            }
        }
        
        delay(1000);
    }
    
    Serial.println("[LTE] ❌ Modem not responding");
    return false;
}

bool LTESimple::begin() {
    Serial.println("\n========== LTE INITIALIZATION ==========");
    
    // Step 1: Initialize UART
    Serial.println("[LTE] Step 1/5: Initializing UART...");
    serial->begin(SIM7600_BAUD, SERIAL_8N1, SIM7600_RX_PIN, SIM7600_TX_PIN);
    delay(100);
    Serial.println("[LTE] ✅ UART initialized");
    
    // Step 2: Power on modem
    Serial.println("[LTE] Step 2/5: Powering ON modem...");
    powerOn();
    
    // Step 3: Test modem response
    Serial.println("[LTE] Step 3/5: Testing modem...");
    if (!testModemResponse()) {
        Serial.println("[LTE] ❌ Initialization failed");
        return false;
    }
    
    // Step 4: Create TinyGsm instance
    Serial.println("[LTE] Step 4/5: Creating TinyGsm instance...");
    modem = new TinyGsm(*serial);
    delay(1000);
    
    // Step 5: Get modem info
    Serial.println("[LTE] Step 5/5: Getting modem info...");
    String info = modem->getModemInfo();
    Serial.printf("[LTE] Modem: %s\n", info.c_str());
    
    String imei = modem->getIMEI();
    Serial.printf("[LTE] IMEI: %s\n", imei.c_str());
    
    Serial.println("========================================");
    Serial.println("[LTE] ✅ Initialization complete");
    Serial.println("========================================\n");
    
    return true;
}

bool LTESimple::connectNetwork() {
    if (!modem) {
        Serial.println("[LTE] ❌ Modem not initialized");
        return false;
    }
    
    Serial.println("\n========== NETWORK CONNECTION ==========");
    
    // Step 1: Wait for network
    Serial.println("[LTE] Step 1/3: Waiting for network...");
    waitForNetwork();
    
    if (!modem->isNetworkConnected()) {
        Serial.println("[LTE] ❌ Network registration failed");
        return false;
    }
    Serial.println("[LTE] ✅ Network registered");
    
    // Step 2: Connect GPRS
    Serial.println("[LTE] Step 2/3: Connecting GPRS...");
    Serial.printf("[LTE] APN: %s\n", APN_NAME);
    
    if (!modem->gprsConnect(APN_NAME, APN_USER, APN_PASS)) {
        Serial.println("[LTE] ❌ GPRS connection failed");
        return false;
    }
    Serial.println("[LTE] ✅ GPRS connected");
    
    // Step 3: Get IP address
    Serial.println("[LTE] Step 3/3: Getting IP address...");
    String ip = modem->getLocalIP();
    Serial.printf("[LTE] IP: %s\n", ip.c_str());
    
    // Get signal quality
    int csq = modem->getSignalQuality();
    Serial.printf("[LTE] Signal: CSQ %d\n", csq);
    
    // Get operator
    String op = modem->getOperator();
    Serial.printf("[LTE] Operator: %s\n", op.c_str());
    
    Serial.println("========================================");
    Serial.println("[LTE] ✅ Network connected");
    Serial.println("========================================\n");
    
    return true;
}

void LTESimple::waitForNetwork() {
    const int maxWait = 60;  // 60 seconds timeout
    int elapsed = 0;
    
    while (!modem->isNetworkConnected() && elapsed < maxWait) {
        Serial.print(".");
        delay(1000);
        elapsed++;
    }
    
    Serial.println();
}

bool LTESimple::isNetworkConnected() {
    return modem && modem->isNetworkConnected();
}

String LTESimple::getModemInfo() {
    return modem ? modem->getModemInfo() : "N/A";
}

String LTESimple::getIMEI() {
    return modem ? modem->getIMEI() : "N/A";
}

String LTESimple::getOperator() {
    return modem ? modem->getOperator() : "N/A";
}

String LTESimple::getIPAddress() {
    return modem ? modem->getLocalIP() : "N/A";
}

int LTESimple::getSignalQuality() {
    return modem ? modem->getSignalQuality() : 0;
}
