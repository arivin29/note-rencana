/*
 * LTE TEST - Simple SIM7600 Test
 * Test untuk pastikan module power on dan LED nyala
 */

#include <Arduino.h>

// SIM7600 Pins
#define SIM_TX      6
#define SIM_RX      7
#define SIM_PWRKEY  21
#define SIM_RESET   47

HardwareSerial simSerial(1);

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

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=================================");
  Serial.println("   LTE TEST - SIM7600 Simple");
  Serial.println("=================================\n");

  // Init serial ke SIM7600
  simSerial.begin(115200, SERIAL_8N1, SIM_RX, SIM_TX);
  
  // Power on module
  Serial.println("[1] Powering ON SIM7600...");
  Serial.println("    LED should blink after ~12 seconds");
  powerOnSIM();
  
  // Test AT
  Serial.println("\n[2] Testing AT commands...");
  
  for (int i = 0; i < 5; i++) {
    Serial.print("    Attempt ");
    Serial.print(i + 1);
    Serial.println("/5");
    
    // Clear buffer
    while(simSerial.available()) simSerial.read();
    
    // Send AT
    simSerial.println("AT");
    delay(1000);
    
    // Read response
    if (simSerial.available()) {
      String resp = simSerial.readString();
      Serial.print("    Response: ");
      Serial.println(resp);
      
      if (resp.indexOf("OK") >= 0) {
        Serial.println("\n✅ SUCCESS! Module is alive!");
        Serial.println("   LED should be blinking now");
        break;
      }
    } else {
      Serial.println("    No response");
    }
    
    delay(2000);
  }
  
  Serial.println("\n[3] Checking SIM status...");
  simSerial.println("AT+CPIN?");
  delay(2000);
  while(simSerial.available()) {
    Serial.write(simSerial.read());
  }
  
  Serial.println("\n[4] Checking network signal...");
  simSerial.println("AT+CSQ");
  delay(2000);
  while(simSerial.available()) {
    Serial.write(simSerial.read());
  }
  
  Serial.println("\n=================================");
  Serial.println("Test selesai. LED kedip-kedip?");
  Serial.println("=================================\n");
}

void loop() {
  // Forward serial communication
  if (simSerial.available()) {
    Serial.write(simSerial.read());
  }
  if (Serial.available()) {
    simSerial.write(Serial.read());
  }
}
