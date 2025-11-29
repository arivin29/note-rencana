/**
 * lte_manager.h
 * 
 * Full-featured LTE Manager for SIM7600E
 * Copied from working main project
 */

#ifndef LTE_MANAGER_H
#define LTE_MANAGER_H

#ifndef TINY_GSM_MODEM_SIM7600
#define TINY_GSM_MODEM_SIM7600
#endif

#include <Arduino.h>
#include <TinyGsmClient.h>

// ============================================================================
// SIM7600 PIN CONFIGURATION
// ============================================================================
// ⚠️ IMPORTANT: These pins are for the actual hardware board
// DO NOT CHANGE unless you know the correct pins for your board

#define SIM7600_TX_PIN          6       // ESP32 GPIO6 -> SIM7600 RX
#define SIM7600_RX_PIN          7       // ESP32 GPIO7 -> SIM7600 TX
#define SIM7600_PWRKEY_PIN      21      // GPIO21 (Power Key)
#define SIM7600_RESET_PIN       47      // GPIO47 (Reset Pin)

// ============================================================================
// APN CONFIGURATION
// ============================================================================
#define APN_NAME                "internet"  // Default APN (adjust for your provider)
#define APN_USER                ""          // Leave empty if not required
#define APN_PASS                ""          // Leave empty if not required

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
