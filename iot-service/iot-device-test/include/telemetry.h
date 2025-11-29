#ifndef TELEMETRY_H
#define TELEMETRY_H

#ifndef TINY_GSM_MODEM_SIM7600
#define TINY_GSM_MODEM_SIM7600
#endif

#include <Arduino.h>
#include <ArduinoJson.h>
#include <TinyGsmClient.h>
#include "generic_io.h"
#include "lte_manager.h"

// ============================================================================
// TELEMETRY MANAGER
// ============================================================================
// Collect, format, dan send data ke server

class TelemetryManager {
public:
    TelemetryManager(GenericIOManager& io, LTEManager& lte, TinyGsmClient& client);

    // Initialize
    bool begin();

    // Generate full telemetry JSON
    void generateTelemetry(JsonDocument& doc);

    // Send telemetry via HTTP POST
    bool sendTelemetry();

    // Send boot notification
    bool sendBootNotification();

    // Set telemetry interval
    void setInterval(unsigned long intervalMs) { telemetryInterval = intervalMs; }

    // Check if it's time to send
    bool shouldSendNow();

    // Configuration
    void setServerURL(const String& url) { serverURL = url; }
    void setDeviceID(const String& id) { deviceID = id; }

    // Get statistics
    unsigned long getLastSendTime() { return lastSendTime; }
    unsigned long getSendCount() { return sendCount; }
    unsigned long getFailCount() { return failCount; }

private:
    GenericIOManager& ioManager;
    LTEManager& lteManager;
    TinyGsmClient& gsmClient;

    String serverURL;
    String deviceID;

    unsigned long telemetryInterval;  // Default: 60000 (1 menit)
    unsigned long lastSendTime;

    unsigned long sendCount;
    unsigned long failCount;

    bool initialized;

    // Send HTTP POST with JSON payload
    bool httpPost(const String& url, const String& jsonPayload);
};

#endif // TELEMETRY_H
