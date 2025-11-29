/**
 * lte_simple.h
 * 
 * Simple LTE manager for SIM7600
 * Minimal code - just connect to network
 */

#pragma once

#include <Arduino.h>

// IMPORTANT: Define modem model BEFORE including TinyGsmClient.h
#define TINY_GSM_MODEM_SIM7600
#include <TinyGsmClient.h>

// SIM7600 Configuration
#define SIM7600_UART_NUM        1           // Hardware UART 1
#define SIM7600_TX_PIN          17          // GPIO17 (TXD1)
#define SIM7600_RX_PIN          18          // GPIO18 (RXD1)
#define SIM7600_BAUD            115200      // Standard baud rate
#define SIM7600_PWR_PIN         4           // GPIO4 (Power control)

// APN Configuration
#define APN_NAME                "internet"  // Default APN (adjust for your provider)
#define APN_USER                ""          // Usually empty
#define APN_PASS                ""          // Usually empty

class LTESimple {
public:
    LTESimple(HardwareSerial* serial);
    
    // Initialize LTE modem
    bool begin();
    
    // Power control
    void powerOn();
    void powerOff();
    
    // Network operations
    bool connectNetwork();
    bool isNetworkConnected();
    
    // Get modem info
    String getModemInfo();
    String getIMEI();
    String getOperator();
    String getIPAddress();
    int getSignalQuality();
    
    // Access to TinyGsm modem
    TinyGsm* getModem() { return modem; }
    
private:
    HardwareSerial* serial;
    TinyGsm* modem;
    
    bool testModemResponse(int maxAttempts = 5);
    void waitForNetwork();
};
