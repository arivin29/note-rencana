#ifndef LTE_MANAGER_H
#define LTE_MANAGER_H

#ifndef TINY_GSM_MODEM_SIM7600
#define TINY_GSM_MODEM_SIM7600
#endif

#include <Arduino.h>
#include <TinyGsmClient.h>

// ============================================================================
// LTE MANAGER - Clean SIM7600 LTE Management
// ============================================================================

class LTEManager {
public:
    LTEManager();

    // Initialize LTE modem
    bool begin();

    // Connect to network and GPRS
    bool connect();

    // Disconnect from network
    bool disconnect();

    // Check if GPRS connected
    bool isConnected();

    // Test internet connectivity (HTTP to Google)
    bool testInternet();

    // Perform a full modem power cycle + reinitialization
    bool rebootModem();

    // Get signal quality (CSQ)
    int getSignalQuality();

    // Get operator name
    String getOperator();

    // Get IP address
    String getIPAddress();

    // Print status
    void printStatus();

private:
    bool gprsConnected;
    unsigned long lastCheck;

    // Internal helpers
    bool powerOnModem();
    void powerOffModem();
    void pulsePowerKey(uint32_t durationMs);
    void hardwareReset();
    bool initModem();
    bool connectGPRS();
};

#endif // LTE_MANAGER_H
