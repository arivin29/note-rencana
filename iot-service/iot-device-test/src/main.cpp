#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// I2C Pins
constexpr int I2C_SDA = 8;
constexpr int I2C_SCL = 9;

// ADS1115 object
Adafruit_ADS1115 ads;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n=== ADS1115 RAW Reading ===\n");
    
    // Init I2C
    Wire.begin(I2C_SDA, I2C_SCL);
    
    // Init ADS1115
    if (!ads.begin(0x48)) {
        Serial.println("ERROR: ADS1115 not found!");
        while (1);
    }
    
    Serial.println("ADS1115 OK!\n");
    ads.setGain(GAIN_TWOTHIRDS);  // +/-6.144V range
}

void loop() {
    for (int ch = 0; ch < 4; ch++) {
        int16_t raw = ads.readADC_SingleEnded(ch);
        float volt = ads.computeVolts(raw);
        
        Serial.printf("A%d: %6d raw | %.4fV\n", ch, raw, volt);
    }
    
    Serial.println("─────────────────────────────\n");
    delay(1000);
}

