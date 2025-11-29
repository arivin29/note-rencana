#include "telemetry.h"
#include "config.h"

// ============================================================================
// TELEMETRY MANAGER IMPLEMENTATION
// ============================================================================

TelemetryManager::TelemetryManager(GenericIOManager& io, LTEManager& lte, TinyGsmClient& client)
    : ioManager(io),
      lteManager(lte),
      gsmClient(client),
      serverURL(""),
      deviceID(""),
      telemetryInterval(60000),  // Default: 1 minute
      lastSendTime(0),
      sendCount(0),
      failCount(0),
      initialized(false) {
}

bool TelemetryManager::begin() {
    Serial.println(F("\n========== TELEMETRY MANAGER =========="));

    // Set default values
    if (deviceID.isEmpty()) {
        // Generate device ID from MAC address
        uint8_t mac[6];
        esp_read_mac(mac, ESP_MAC_WIFI_STA);
        deviceID = String(mac[0], HEX) + String(mac[1], HEX) + 
                   String(mac[2], HEX) + String(mac[3], HEX) + 
                   String(mac[4], HEX) + String(mac[5], HEX);
        deviceID.toUpperCase();
    }

    Serial.printf("[Telemetry] Device ID: %s\n", deviceID.c_str());
    Serial.printf("[Telemetry] Interval: %lu ms (%lu seconds)\n", 
                  telemetryInterval, telemetryInterval / 1000);

    if (!serverURL.isEmpty()) {
        Serial.printf("[Telemetry] Server URL: %s\n", serverURL.c_str());
    } else {
        Serial.println(F("[Telemetry] ⚠️ Server URL not set"));
    }

    initialized = true;
    Serial.println(F("[Telemetry] ✅ Telemetry Manager initialized"));
    Serial.println(F("=======================================\n"));

    return true;
}

void TelemetryManager::generateTelemetry(JsonDocument& doc) {
    if (!initialized) {
        Serial.println(F("[Telemetry] ⚠️ Not initialized"));
        return;
    }

    // Clear document
    doc.clear();

    // Add device metadata
    doc["device_id"] = deviceID;
    doc["device_type"] = "ESP32-GenericIO";
    doc["firmware_version"] = "2.0.0-dynamic";
    doc["timestamp"] = millis();

    // Generate I/O data (delegated to GenericIOManager)
    ioManager.generateRawTelemetry(doc);

    // Add LTE info
    if (lteManager.isConnected()) {
        JsonObject lte = doc["lte"].to<JsonObject>();
        lte["connected"] = true;
        lte["operator"] = lteManager.getOperator();
        lte["signal_quality"] = lteManager.getSignalQuality();
        lte["ip_address"] = lteManager.getIPAddress();
    }

    // Add statistics
    JsonObject stats = doc["statistics"].to<JsonObject>();
    stats["send_count"] = sendCount;
    stats["fail_count"] = failCount;
    stats["last_send_ms"] = lastSendTime;
}

bool TelemetryManager::sendTelemetry() {
    if (!initialized) {
        Serial.println(F("[Telemetry] ⚠️ Not initialized"));
        return false;
    }

    if (!lteManager.isConnected()) {
        Serial.println(F("[Telemetry] ⚠️ LTE not connected, skipping send"));
        failCount++;
        return false;
    }

    if (serverURL.isEmpty()) {
        Serial.println(F("[Telemetry] ⚠️ Server URL not configured"));
        failCount++;
        return false;
    }

    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  SENDING TELEMETRY                    ║"));
    Serial.println(F("╚════════════════════════════════════════╝\n"));

    // Generate telemetry JSON
    JsonDocument doc;
    generateTelemetry(doc);

    // Serialize to string
    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println(F("[Telemetry] Payload preview:"));
    Serial.println(jsonPayload.substring(0, min(200, (int)jsonPayload.length())));
    if (jsonPayload.length() > 200) {
        Serial.println(F("... (truncated)"));
    }
    Serial.printf("[Telemetry] Payload size: %d bytes\n\n", jsonPayload.length());

    // Send HTTP POST
    bool success = httpPost(serverURL, jsonPayload);

    if (success) {
        sendCount++;
        lastSendTime = millis();
        Serial.println(F("[Telemetry] ✅ Telemetry sent successfully"));
        Serial.printf("[Telemetry] Total sent: %lu, Failed: %lu\n", sendCount, failCount);
    } else {
        failCount++;
        Serial.println(F("[Telemetry] ❌ Failed to send telemetry"));
        Serial.printf("[Telemetry] Total sent: %lu, Failed: %lu\n", sendCount, failCount);
    }

    Serial.println();
    return success;
}

bool TelemetryManager::sendBootNotification() {
    if (!initialized) {
        Serial.println(F("[Telemetry] ⚠️ Not initialized"));
        return false;
    }

    if (!lteManager.isConnected()) {
        Serial.println(F("[Telemetry] ⚠️ LTE not connected, skipping boot notification"));
        return false;
    }

    if (serverURL.isEmpty()) {
        Serial.println(F("[Telemetry] ⚠️ Server URL not configured"));
        return false;
    }

    Serial.println(F("\n╔════════════════════════════════════════╗"));
    Serial.println(F("║  BOOT NOTIFICATION                    ║"));
    Serial.println(F("╚════════════════════════════════════════╝\n"));

    // Create boot notification JSON
    JsonDocument doc;
    doc["device_id"] = deviceID;
    doc["event"] = "boot";
    doc["timestamp"] = millis();
    doc["firmware_version"] = "2.0.0-dynamic";
    doc["reset_reason"] = esp_reset_reason();

    // Add LTE info
    JsonObject lte = doc["lte"].to<JsonObject>();
    lte["operator"] = lteManager.getOperator();
    lte["signal_quality"] = lteManager.getSignalQuality();
    lte["ip_address"] = lteManager.getIPAddress();

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println(F("[Telemetry] Boot notification payload:"));
    Serial.println(jsonPayload);
    Serial.println();

    // Send to /boot endpoint
    String bootURL = serverURL;
    bootURL.replace("/telemetry", "/boot");  // Replace endpoint if needed

    bool success = httpPost(bootURL, jsonPayload);

    if (success) {
        Serial.println(F("[Telemetry] ✅ Boot notification sent"));
    } else {
        Serial.println(F("[Telemetry] ❌ Failed to send boot notification"));
    }

    Serial.println();
    return success;
}

bool TelemetryManager::shouldSendNow() {
    if (lastSendTime == 0) {
        return true;  // First send
    }

    return (millis() - lastSendTime) >= telemetryInterval;
}

bool TelemetryManager::httpPost(const String& url, const String& jsonPayload) {
    Serial.printf("[Telemetry] POST %s\n", url.c_str());

    // Use passed GSM client reference
    TinyGsmClient& client = gsmClient;

    // Parse URL
    String host;
    int port = 80;
    String path = "/";

    int protocolEnd = url.indexOf("://");
    if (protocolEnd > 0) {
        int hostStart = protocolEnd + 3;
        int portStart = url.indexOf(':', hostStart);
        int pathStart = url.indexOf('/', hostStart);

        if (portStart > 0 && portStart < pathStart) {
            host = url.substring(hostStart, portStart);
            port = url.substring(portStart + 1, pathStart).toInt();
            path = url.substring(pathStart);
        } else if (pathStart > 0) {
            host = url.substring(hostStart, pathStart);
            path = url.substring(pathStart);
        } else {
            host = url.substring(hostStart);
        }
    } else {
        // No protocol, assume just host/path
        int pathStart = url.indexOf('/');
        if (pathStart > 0) {
            host = url.substring(0, pathStart);
            path = url.substring(pathStart);
        } else {
            host = url;
        }
    }

    Serial.printf("[Telemetry] Host: %s, Port: %d, Path: %s\n", host.c_str(), port, path.c_str());

    // Connect to server
    if (!client.connect(host.c_str(), port)) {
        Serial.println(F("[Telemetry] ❌ Connection failed"));
        return false;
    }

    Serial.println(F("[Telemetry] Connected to server"));

    // Send HTTP POST request
    client.print(String("POST ") + path + " HTTP/1.1\r\n");
    client.print(String("Host: ") + host + "\r\n");
    client.print("Content-Type: application/json\r\n");
    client.print(String("Content-Length: ") + jsonPayload.length() + "\r\n");
    client.print("Connection: close\r\n");
    client.print("\r\n");
    client.print(jsonPayload);

    Serial.println(F("[Telemetry] Request sent, waiting for response..."));

    // Wait for response
    unsigned long timeout = millis();
    while (!client.available() && millis() - timeout < 5000) {
        delay(10);
    }

    // Read response
    String response;
    while (client.available()) {
        char c = client.read();
        response += c;
        if (response.length() > 500) break;  // Limit response size
    }

    client.stop();

    if (response.length() == 0) {
        Serial.println(F("[Telemetry] ❌ No response from server"));
        return false;
    }

    // Check status code
    int statusCodeStart = response.indexOf(' ') + 1;
    int statusCodeEnd = response.indexOf(' ', statusCodeStart);
    String statusCode = response.substring(statusCodeStart, statusCodeEnd);

    Serial.printf("[Telemetry] Response: HTTP %s\n", statusCode.c_str());

    if (response.length() < 500) {
        Serial.println(F("[Telemetry] Response body:"));
        int bodyStart = response.indexOf("\r\n\r\n");
        if (bodyStart > 0) {
            Serial.println(response.substring(bodyStart + 4));
        }
    }

    // Success if 2xx status code
    return statusCode.startsWith("2");
}

