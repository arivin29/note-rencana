#define TINY_GSM_MODEM_SIM7600
#include "telemetry.h"
#include "config.h"
#include "mqtt_manager.h"
#include "connection_manager.h"
#include "time_manager.h"
#include "generic_io.h"
#include <ArduinoJson.h>
#include <TinyGsmClient.h>

// External references
extern String DEVICE_ID;
extern TinyGsm modem;
extern MQTTManager mqttManager;
extern TimeManager timeManager;
extern ConnectionManager connectionManager;
extern GenericIOManager ioManager;

// RS485 functions from main.cpp
extern bool readRS485Register(uint8_t slaveId, uint16_t regAddr, uint16_t count, uint16_t* output);
extern float readRS485Float32(uint8_t slaveId, uint16_t regAddr);
extern uint32_t readRS485Uint32(uint8_t slaveId, uint16_t regAddr);

// ============================================================================
// HELPERS
// ============================================================================

static void transformArrayToObject(JsonDocument& rawDoc, JsonObject& sensors) {
    // Transform analog array to object with keys: analog_A2, analog_A3
    if (rawDoc.containsKey("analog")) {
        JsonArray analogArray = rawDoc["analog"];
        for (JsonVariant item : analogArray) {
            JsonObject analogItem = item.as<JsonObject>();
            String channel = analogItem["ch"].as<String>();
            String key = "analog_" + channel;
            
            JsonObject sensorObj = sensors[key].to<JsonObject>();
            sensorObj["type"] = "analog_4_20ma";
            sensorObj["channel"] = channel;
            sensorObj["raw"] = analogItem["adc"];
            sensorObj["volt"] = analogItem["volt"];
            sensorObj["ma"] = analogItem["ma"];
            sensorObj["status"] = "ok";
        }
    }
    
    // Transform adc16 array to object with keys: adc16_A0, adc16_A1
    if (rawDoc.containsKey("adc16")) {
        JsonArray adc16Array = rawDoc["adc16"];
        for (JsonVariant item : adc16Array) {
            JsonObject adc16Item = item.as<JsonObject>();
            String channel = adc16Item["ch"].as<String>();
            String key = "adc16_" + channel;
            
            JsonObject sensorObj = sensors[key].to<JsonObject>();
            sensorObj["type"] = "adc16";
            sensorObj["channel"] = channel;
            sensorObj["raw"] = adc16Item["raw"];
            sensorObj["volt"] = adc16Item["volt"];
            sensorObj["connected"] = adc16Item["connected"];
            sensorObj["status"] = adc16Item["connected"] ? "ok" : "disconnected";
        }
    }
    
    // Transform i2c array to object with keys: i2c_0x48, i2c_0x68
    if (rawDoc.containsKey("i2c")) {
        JsonArray i2cArray = rawDoc["i2c"];
        for (JsonVariant item : i2cArray) {
            JsonObject i2cItem = item.as<JsonObject>();
            uint8_t addr = i2cItem["addr"];
            String type = i2cItem["type"].as<String>();
            
            char keyBuf[16];
            snprintf(keyBuf, sizeof(keyBuf), "i2c_0x%02X", addr);
            String key = String(keyBuf);
            
            JsonObject sensorObj = sensors[key].to<JsonObject>();
            sensorObj["type"] = "i2c";
            sensorObj["addr"] = addr;
            sensorObj["label"] = type;
            sensorObj["data"] = i2cItem["data"];
            
            // Check if data has error/unknown status
            if (i2cItem["data"]["status"] == "unknown") {
                sensorObj["status"] = "error";
            } else {
                sensorObj["status"] = "ok";
            }
        }
    }
    
    // Transform digital to object with key: digital_in_14
    if (rawDoc.containsKey("digital")) {
        JsonObject digitalObj = rawDoc["digital"];
        if (digitalObj.containsKey("pump_status")) {
            bool pumpState = digitalObj["pump_status"];
            uint8_t pumpPin = digitalObj["pump_pin"];
            
            char keyBuf[16];
            snprintf(keyBuf, sizeof(keyBuf), "digital_in_%d", pumpPin);
            String key = String(keyBuf);
            
            JsonObject sensorObj = sensors[key].to<JsonObject>();
            sensorObj["type"] = "digital";
            sensorObj["pin"] = pumpPin;
            sensorObj["state"] = pumpState ? 1 : 0;
            sensorObj["status"] = "ok";
        }
    }
    
    // RS485 slaves (if any) - keep as nested objects
    if (rawDoc.containsKey("rs485")) {
        JsonArray rs485Array = rawDoc["rs485"];
        for (JsonVariant item : rs485Array) {
            JsonObject rs485Item = item.as<JsonObject>();
            uint8_t slaveId = rs485Item["slave_id"];
            
            char keyBuf[16];
            snprintf(keyBuf, sizeof(keyBuf), "rs485_slave_%d", slaveId);
            String key = String(keyBuf);
            
            JsonObject sensorObj = sensors[key].to<JsonObject>();
            sensorObj["type"] = "rs485_modbus";
            sensorObj["slave_id"] = slaveId;
            sensorObj["registers"] = rs485Item["registers"];
            sensorObj["status"] = "ok";
        }
    }
}

static void buildRealSensors(JsonDocument& doc) {
    // Generate RAW I/O telemetry first (array format)
    JsonDocument rawDoc;
    ioManager.generateRawTelemetry(rawDoc);
    
    // Transform to sensors object (key-value format)
    JsonObject sensors = doc["sensors"].to<JsonObject>();
    transformArrayToObject(rawDoc, sensors);
    
    // Add RS485 direct reading (TUF-2000M flowmeter at slave ID 1)
    Serial.println("[RS485] Attempting to read flowmeter...");
    uint8_t rs485SlaveId = 1;  // TUF-2000M default address
    
    // Try to read register 0 to check if device is responding
    uint16_t testReg;
    bool deviceResponding = readRS485Register(rs485SlaveId, 0, 1, &testReg);
    
    Serial.print("[RS485] Device response: ");
    Serial.println(deviceResponding ? "YES" : "NO");
    
    if (deviceResponding) {
        Serial.println("[RS485] ✅ Device online, reading data...");
        
        // Device is responding! Read key registers
        JsonObject rs485Obj = sensors["rs485_flowmeter"].to<JsonObject>();
        rs485Obj["type"] = "rs485_modbus";
        rs485Obj["slave_id"] = rs485SlaveId;
        rs485Obj["device"] = "TUF-2000M";
        
        // Flow rate (Register 1-2, Float32)
        Serial.print("[RS485] Reading flow rate... ");
        float flowRate = readRS485Float32(rs485SlaveId, 0);  // Register 1 = address 0 (0-based)
        if (!isnan(flowRate)) {
            rs485Obj["flow_rate_m3h"] = flowRate;
            Serial.print(flowRate);
            Serial.println(" m³/h");
        } else {
            Serial.println("FAILED");
        }
        
        // Flow velocity (Register 5-6, Float32)
        Serial.print("[RS485] Reading velocity... ");
        float flowVelocity = readRS485Float32(rs485SlaveId, 4);  // Register 5 = address 4
        if (!isnan(flowVelocity)) {
            rs485Obj["flow_velocity_ms"] = flowVelocity;
            Serial.print(flowVelocity);
            Serial.println(" m/s");
        } else {
            Serial.println("FAILED");
        }
        
        // Positive totalizer (Register 9-10, Uint32)
        Serial.print("[RS485] Reading totalizer... ");
        uint32_t posTotalizer = readRS485Uint32(rs485SlaveId, 8);  // Register 9 = address 8
        rs485Obj["positive_totalizer_m3"] = posTotalizer;
        Serial.print(posTotalizer);
        Serial.println(" m³");
        
        // Signal quality (Register 92, Uint16)
        Serial.print("[RS485] Reading signal quality... ");
        uint16_t signalQuality;
        if (readRS485Register(rs485SlaveId, 91, 1, &signalQuality)) {  // Register 92 = address 91
            rs485Obj["signal_quality_pct"] = signalQuality;
            Serial.print(signalQuality);
            Serial.println("%");
        } else {
            Serial.println("FAILED");
        }
        
        rs485Obj["status"] = "ok";
        Serial.println("[RS485] ✅ Data read complete");
    } else {
        Serial.println("[RS485] ⚠️ Device not responding - adding offline status");
        
        // Device not responding - add stub
        JsonObject rs485Obj = sensors["rs485_flowmeter"].to<JsonObject>();
        rs485Obj["type"] = "rs485_modbus";
        rs485Obj["slave_id"] = rs485SlaveId;
        rs485Obj["device"] = "TUF-2000M";
        rs485Obj["status"] = "offline";
    }
}

static void appendNodeInfo(JsonDocument& doc) {
    JsonObject node = doc["node"].to<JsonObject>();
    
    // LTE info
    JsonObject lte = node["lte"].to<JsonObject>();
    lte["ip"] = modem.localIP().toString();
    lte["csq"] = modem.getSignalQuality();
    lte["operator"] = modem.getOperator();
    
    // System info
    node["uptime_s"] = millis() / 1000;
    node["free_heap"] = ESP.getFreeHeap();
    node["reset_reason"] = esp_reset_reason();
    
    // Connection status
    JsonObject conn = node["connection"].to<JsonObject>();
    conn["state"] = connectionManager.getStateString();
    conn["lte_reconnects"] = connectionManager.getLteReconnectAttempts();
    conn["lte_reboots"] = connectionManager.getLteHardRebootCount();
    conn["internet_fail"] = connectionManager.getInternetFailCount();
    conn["mqtt_reconnects"] = connectionManager.getMqttReconnectAttempts();
    conn["mqtt_fail"] = connectionManager.getMqttTotalFailures();
    conn["publish_fail"] = connectionManager.getPublishFailureCount();
    unsigned long lastOk = connectionManager.getLastPublishSuccess();
    conn["seconds_since_ok"] = lastOk ? (millis() - lastOk) / 1000 : 0;
    
    // MQTT status
    JsonObject mqtt = node["mqtt"].to<JsonObject>();
    mqtt["connected"] = mqttManager.isConnected();
    mqtt["failed"] = connectionManager.getMqttTotalFailures();
    // Note: publish success count not available in ConnectionManager
}

// ============================================================================
// FULL TELEMETRY
// ============================================================================

void sendFullTelemetry() {
    JsonDocument doc;

    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = timeManager.getTimestamp();
    doc["firmware"] = "esp32s3-multisensor-v2.1";

    // === SENSORS (transformed from arrays to objects) ===
    buildRealSensors(doc);

    // === NODE INFO (LTE, System, Connection, MQTT) ===
    appendNodeInfo(doc);

    Serial.println("\n========== REAL I/O TELEMETRY ==========");
    serializeJsonPretty(doc, Serial);
    Serial.println();

    if (!mqttManager.isConnected()) {
        Serial.println("[Telemetry] MQTT not ready. Skipping publish.");
        return;
    }

    String topic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/telemetry";
    Serial.print("[Telemetry] Publishing to ");
    Serial.println(topic);

    bool publishOk = mqttManager.publish(topic.c_str(), doc);
    connectionManager.notifyPublishResult(publishOk);

    if (publishOk) {
        Serial.println("[Telemetry] ✅ Published");
    } else {
        Serial.println("[Telemetry] ❌ Publish failed");
    }

    Serial.println("======================================\n");
}

// ============================================================================
// BOOT NOTIFICATION
// ============================================================================

void sendBootNotification() {
    if (!mqttManager.isConnected()) {
        Serial.println("[Boot] MQTT not ready. Boot notification skipped.");
        return;
    }

    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = timeManager.getTimestamp();
    doc["event"] = "boot";
    doc["firmware"] = "esp32s3-multisensor-v2.1";

    // Add node info
    appendNodeInfo(doc);

    String topic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/boot";
    Serial.print("[Boot] Publishing boot event to ");
    Serial.println(topic);

    bool ok = mqttManager.publish(topic.c_str(), doc);
    connectionManager.notifyPublishResult(ok);

    if (ok) {
        Serial.println("[Boot] ✅ Notification sent");
    } else {
        Serial.println("[Boot] ❌ Failed to send notification");
    }
}
