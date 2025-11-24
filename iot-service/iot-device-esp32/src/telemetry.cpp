#define TINY_GSM_MODEM_SIM7600
#include "telemetry.h"
#include "config.h"
#include "mqtt_manager.h"
#include "connection_manager.h"
#include "time_manager.h"
#include "generic_io.h"
#include "rs485_config_manager.h"
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
}

// NEW: Build RS485 data separately
static void buildRS485Data(JsonDocument& doc) {
    JsonObject sensors = doc["sensors"].to<JsonObject>();
    
    if (!rs485ConfigMgr.hasConfig()) {
        // No config loaded - just report status
        JsonObject rs485Status = sensors["rs485_status"].to<JsonObject>();
        rs485Status["status"] = "no_config";
        rs485Status["online_devices"] = rs485ConfigMgr.getOnlineCount();
        rs485Status["message"] = "Waiting for configuration from server";
        Serial.println("[RS485] ⚠️ No config - skipping RS485 telemetry");
    } else {
        // Config loaded - read all configured devices
        Serial.println("[RS485] Reading configured devices...");
        
        const auto& devices = rs485ConfigMgr.getDevices();
        for (const auto& device : devices) {
            String deviceKey = "rs485_addr_" + String(device.modbus_address);
            JsonObject deviceObj = sensors[deviceKey].to<JsonObject>();
            
            deviceObj["type"] = "rs485_modbus";
            deviceObj["slave_id"] = device.modbus_address;
            deviceObj["device_type"] = device.device_type;
            
            if (!device.is_online) {
                deviceObj["status"] = "offline";
                Serial.printf("[RS485] Device %d: OFFLINE\n", device.modbus_address);
                continue;
            }
            
            Serial.printf("[RS485] Device %d: Reading %d registers...\n", 
                         device.modbus_address, device.registers.size());
            
            // Read all configured registers
            JsonObject dataObj = deviceObj["data"].to<JsonObject>();
            
            for (const auto& reg : device.registers) {
                String key = reg.label;
                key.replace(" ", "_");
                key.toLowerCase();
                
                if (reg.type == "float32") {
                    float value = readRS485Float32(device.modbus_address, reg.reg - 1);  // Modbus 1-based to 0-based
                    if (!isnan(value)) {
                        dataObj[key] = serialized(String(value, 2));
                        // Skip unit to save space (units known from config)
                    }
                    
                } else if (reg.type == "uint32") {
                    uint32_t value = readRS485Uint32(device.modbus_address, reg.reg - 1);
                    dataObj[key] = value;
                    // Skip unit to save space
                    
                } else if (reg.type == "uint16") {
                    uint16_t value = 0;
                    if (readRS485Register(device.modbus_address, reg.reg - 1, 1, &value)) {
                        dataObj[key] = value;
                        // Skip unit to save space
                    }
                    
                } else if (reg.type == "hex16") {
                    uint16_t value = 0;
                    if (readRS485Register(device.modbus_address, reg.reg - 1, 1, &value)) {
                        char hexStr[8];
                        sprintf(hexStr, "0x%04X", value);
                        dataObj[key] = hexStr;
                    }
                }
                
                delay(10);  // Small delay between reads
            }
            
            deviceObj["status"] = "ok";
            Serial.printf("[RS485] Device %d: ✅ Complete\n", device.modbus_address);
        }
    }
}

static void appendNodeInfo(JsonDocument& doc) {
    JsonObject node = doc["node"].to<JsonObject>();
    
    // LTE info (essential)
    JsonObject lte = node["lte"].to<JsonObject>();
    lte["ip"] = modem.localIP().toString();
    lte["csq"] = modem.getSignalQuality();
    lte["operator"] = modem.getOperator();
    
    // System info (minimal)
    node["uptime_s"] = millis() / 1000;
    node["free_heap"] = ESP.getFreeHeap();
    
    // Connection status (condensed - only critical metrics)
    JsonObject conn = node["connection"].to<JsonObject>();
    conn["state"] = connectionManager.getStateString();
    conn["lte_reconnects"] = connectionManager.getLteReconnectAttempts();
    conn["mqtt_reconnects"] = connectionManager.getMqttReconnectAttempts();
    conn["publish_fail"] = connectionManager.getPublishFailureCount();
}

// ============================================================================
// FULL TELEMETRY
// ============================================================================

void sendFullTelemetry() {
    if (!mqttManager.isConnected()) {
        Serial.println("[Telemetry] MQTT not ready. Skipping publish.");
        return;
    }

    // ========== MESSAGE 1: BASIC SENSORS + NODE INFO ==========
    JsonDocument doc1;
    doc1["device_id"] = DEVICE_ID;
    doc1["timestamp"] = timeManager.getTimestamp();
    doc1["firmware"] = "esp32s3-multisensor-v2.1";

    // Basic sensors (analog, adc16, i2c, digital)
    buildRealSensors(doc1);
    
    // Node info
    appendNodeInfo(doc1);

    Serial.println("\n========== BASIC SENSORS TELEMETRY ==========");
    serializeJsonPretty(doc1, Serial);
    Serial.println();

    String topic1 = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/telemetry";
    Serial.print("[Telemetry] Publishing basic sensors to ");
    Serial.println(topic1);

    bool publishOk1 = mqttManager.publish(topic1.c_str(), doc1);
    
    if (publishOk1) {
        Serial.println("[Telemetry] ✅ Basic sensors published");
    } else {
        Serial.println("[Telemetry] ❌ Basic sensors publish failed");
    }

    // ========== MESSAGE 2: RS485 DATA ==========
    if (rs485ConfigMgr.hasConfig() && rs485ConfigMgr.getOnlineCount() > 0) {
        JsonDocument doc2;
        doc2["device_id"] = DEVICE_ID;
        doc2["timestamp"] = timeManager.getTimestamp();
        
        // RS485 data only
        buildRS485Data(doc2);

        Serial.println("\n========== RS485 TELEMETRY ==========");
        serializeJsonPretty(doc2, Serial);
        Serial.println();

        String topic2 = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/rs485";
        Serial.print("[Telemetry] Publishing RS485 data to ");
        Serial.println(topic2);

        bool publishOk2 = mqttManager.publish(topic2.c_str(), doc2);
        connectionManager.notifyPublishResult(publishOk2);  // Only track RS485 publish
        
        if (publishOk2) {
            Serial.println("[Telemetry] ✅ RS485 data published");
        } else {
            Serial.println("[Telemetry] ❌ RS485 publish failed");
        }
    } else {
        Serial.println("[RS485] No online devices, skipping RS485 publish");
        connectionManager.notifyPublishResult(publishOk1);  // Track basic sensors publish instead
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
        
        // Subscribe to command topic for relay control
        String cmdTopic = String(MQTT_TOPIC) + "/" + DEVICE_ID + "/command";
        Serial.print("[Boot] Subscribing to ");
        Serial.println(cmdTopic);
        
        if (mqttManager.subscribe(cmdTopic.c_str())) {
            Serial.println("[Boot] ✅ Subscribed to command topic");
        } else {
            Serial.println("[Boot] ❌ Failed to subscribe");
        }
        
    } else {
        Serial.println("[Boot] ❌ Failed to send notification");
    }
}
