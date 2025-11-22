/*
 * HYBRID TEST - LTE + Sensors + MQTT (No wrappers)
 * Step by step integration
 */

#define TINY_GSM_MODEM_SIM7600

#include <Arduino.h>
#include <ModbusMaster.h>
#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include "config.h"
#include "generic_io.h"
#include "time_manager.h"
#include <ArduinoJson.h>

// SIM7600 Pins
#define SIM_TX      6
#define SIM_RX      7
#define SIM_PWRKEY  21
#define SIM_RESET   47

HardwareSerial simSerial(1);
TinyGsm modem(simSerial);
TinyGsmClient gsmClient(modem);
PubSubClient mqtt(gsmClient);

GenericIOManager ioManager;
TimeManager timeManager;
ModbusMaster modbusNode;  // Required by generic_io.cpp

bool lteReady = false;
bool mqttReady = false;
String deviceID;

void powerOnSIM() {
  pinMode(SIM_PWRKEY, OUTPUT);
  digitalWrite(SIM_PWRKEY, LOW);
  delay(300);

  // pulse 1.2 sec
  digitalWrite(SIM_PWRKEY, HIGH);
  delay(1200);
  digitalWrite(SIM_PWRKEY, LOW);

  Serial.println("[SIM7600] Booting...");
  delay(12000); // tunggu full boot
}

bool initLTE() {
  Serial.println("\n[LTE] Initializing...");
  
  // Init serial ke SIM7600
  simSerial.begin(115200, SERIAL_8N1, SIM_RX, SIM_TX);
  
  // Power on module
  Serial.println("[LTE] Powering ON...");
  powerOnSIM();
  
  // Test AT
  Serial.println("[LTE] Testing modem...");
  
  if (!modem.testAT()) {
    Serial.println("[LTE] ❌ Modem not responding");
    return false;
  }
  
  Serial.println("[LTE] ✅ Modem OK!");
  
  // Get modem info
  String modemInfo = modem.getModemInfo();
  Serial.print("[LTE] Modem: ");
  Serial.println(modemInfo);
  
  // Connect to network
  Serial.println("[LTE] Connecting to network...");
  Serial.print("[LTE] Waiting for network...");
  
  if (!modem.waitForNetwork(60000)) {
    Serial.println(" FAILED");
    return false;
  }
  Serial.println(" OK");
  
  // Connect GPRS
  Serial.print("[LTE] Connecting GPRS (APN: ");
  Serial.print(APN_NAME);
  Serial.print(")...");
  
  if (!modem.gprsConnect(APN_NAME, APN_USER, APN_PASS)) {
    Serial.println(" FAILED");
    return false;
  }
  Serial.println(" OK");
  
  // Check connection
  if (!modem.isGprsConnected()) {
    Serial.println("[LTE] ❌ GPRS not connected");
    return false;
  }
  
  // Get IP
  String ip = modem.getLocalIP();
  Serial.print("[LTE] ✅ Connected! IP: ");
  Serial.println(ip);
  
  // Get signal quality
  int csq = modem.getSignalQuality();
  Serial.print("[LTE] Signal: CSQ ");
  Serial.println(csq);
  
  return true;
}

bool connectMQTT() {
  Serial.println("\n[MQTT] Connecting...");
  Serial.print("[MQTT] Broker: ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setKeepAlive(60);
  
  String clientID = deviceID + "-" + String(random(10000, 99999));
  Serial.print("[MQTT] Client ID: ");
  Serial.println(clientID);
  
  if (mqtt.connect(clientID.c_str())) {
    Serial.println("[MQTT] ✅ Connected!");
    return true;
  } else {
    Serial.print("[MQTT] ❌ Failed, rc=");
    Serial.println(mqtt.state());
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n========================================");
  Serial.println("  HYBRID TEST - LTE + SENSORS + MQTT");
  Serial.println("  Full integration test");
  Serial.println("========================================\n");

  // Generate Device ID
  deviceID = String(OWNER_CODE) + "-" + String(ESP.getEfuseMac(), HEX);
  Serial.print("[Device] ID: ");
  Serial.println(deviceID);

  // Step 1: Init Time Manager
  Serial.println("\n[1/4] Initializing Time Manager...");
  timeManager.begin();
  timeManager.printStatus();
  
  // Step 2: Init Sensors
  Serial.println("\n[2/4] Initializing Sensors...");
  if (ioManager.begin()) {
    Serial.println("[Sensors] ✅ Initialized");
    ioManager.scanAllBuses();
    ioManager.printDeviceSummary();
  } else {
    Serial.println("[Sensors] ❌ Failed");
  }
  
  // Step 3: Init LTE
  Serial.println("\n[3/4] Initializing LTE...");
  lteReady = initLTE();
  
  // Step 4: Connect MQTT
  if (lteReady) {
    Serial.println("\n[4/4] Connecting MQTT...");
    mqttReady = connectMQTT();
  } else {
    Serial.println("\n[4/4] Skipping MQTT (no LTE)");
  }
  
  Serial.println("\n========================================");
  Serial.println("  INITIALIZATION COMPLETE");
  Serial.println("========================================");
  Serial.print("Time: "); Serial.println(timeManager.isSynced() ? "✅" : "⏭️");
  Serial.print("Sensors: ✅\n");
  Serial.print("LTE: "); Serial.println(lteReady ? "✅" : "❌");
  Serial.print("MQTT: "); Serial.println(mqttReady ? "✅" : "❌");
  Serial.println("========================================\n");
}

void loop() {
  static unsigned long lastRead = 0;
  static unsigned long lastMqttCheck = 0;
  
  // MQTT keepalive
  if (mqttReady) {
    if (!mqtt.connected()) {
      if (millis() - lastMqttCheck >= 5000) {
        lastMqttCheck = millis();
        Serial.println("[MQTT] Reconnecting...");
        mqttReady = connectMQTT();
      }
    } else {
      mqtt.loop();
    }
  }
  
  // Telemetry
  if (millis() - lastRead >= 10000) {  // 10 detik
    lastRead = millis();
    
    Serial.println("\n========== TELEMETRY ==========");
    Serial.print("Timestamp: ");
    Serial.println(timeManager.getTimestamp());
    
    if (mqttReady && mqtt.connected()) {
      // Build JSON
      JsonDocument doc;
      doc["device_id"] = deviceID;
      doc["timestamp"] = timeManager.getTimestamp();
      doc["test"] = "hybrid-mqtt";
      
      // Add simple sensor data
      JsonArray adc16 = doc["adc16"].to<JsonArray>();
      ADC16ChannelData ch0 = ioManager.getADC16().readChannel(0);
      ADC16ChannelData ch1 = ioManager.getADC16().readChannel(1);
      
      JsonObject a0 = adc16.add<JsonObject>();
      a0["ch"] = "A0";
      a0["raw"] = ch0.rawADC;
      a0["volt"] = ch0.voltage;
      a0["connected"] = ch0.connected;
      
      JsonObject a1 = adc16.add<JsonObject>();
      a1["ch"] = "A1";
      a1["raw"] = ch1.rawADC;
      a1["volt"] = ch1.voltage;
      a1["connected"] = ch1.connected;
      
      // Publish
      String topic = String(MQTT_TOPIC) + "/" + deviceID + "/telemetry";
      String payload;
      serializeJson(doc, payload);
      
      Serial.print("[MQTT] Publishing to: ");
      Serial.println(topic);
      Serial.print("Payload: ");
      Serial.println(payload);
      
      if (mqtt.publish(topic.c_str(), payload.c_str())) {
        Serial.println("[MQTT] ✅ Published!");
      } else {
        Serial.println("[MQTT] ❌ Publish failed");
      }
    } else {
      Serial.println("[MQTT] Not connected - skipping");
    }
    
    Serial.println("===============================\n");
  }
}
