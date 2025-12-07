// ============================================================================
// SD MANAGER TEST SKETCH
// ============================================================================
// Simple test to verify SD card operations without full firmware
// Upload this to test SD card independently

#include <Arduino.h>
#include "sd_manager.h"
#include "config.h"

void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("\n========================================");
    Serial.println(" SD MANAGER TEST");
    Serial.println("========================================\n");
    
    // Test 1: Initialize SD card
    Serial.println("[TEST 1] Initializing SD card...");
    bool sdOK = sdManager.begin();
    if (sdOK) {
        Serial.println("✅ SD card mounted successfully\n");
    } else {
        Serial.println("⚠️ SD card not found - graceful degradation test\n");
    }
    
    // Test 2: Print status
    Serial.println("[TEST 2] SD Card Status:");
    sdManager.printStatus();
    
    if (!sdOK) {
        Serial.println("❌ SD card not available - stopping tests");
        Serial.println("Device should continue operating (graceful degradation)");
        return;
    }
    
    // Test 3: Write telemetry
    Serial.println("[TEST 3] Writing telemetry data...");
    String testData1 = "{\"device_id\":\"TEST-001\",\"temp\":25.5,\"hum\":60.2}";
    String testData2 = "{\"device_id\":\"TEST-001\",\"temp\":26.1,\"hum\":59.8}";
    String testData3 = "{\"device_id\":\"TEST-001\",\"temp\":24.9,\"hum\":61.5}";
    
    if (sdManager.writeTelemetry(testData1)) {
        Serial.println("✅ Telemetry 1 saved");
    }
    delay(1000);
    
    if (sdManager.writeTelemetry(testData2)) {
        Serial.println("✅ Telemetry 2 saved");
    }
    delay(1000);
    
    if (sdManager.writeTelemetry(testData3)) {
        Serial.println("✅ Telemetry 3 saved");
    }
    Serial.println();
    
    // Test 4: Check pending files
    Serial.println("[TEST 4] Checking pending files...");
    uint32_t count = sdManager.getPendingFileCount();
    Serial.printf("Pending files: %u\n", count);
    
    if (count > 0) {
        Serial.println("✅ Files found\n");
    } else {
        Serial.println("⚠️ No files found\n");
    }
    
    // Test 5: Read oldest file
    if (count > 0) {
        Serial.println("[TEST 5] Reading oldest file...");
        String oldest = sdManager.getOldestFile();
        Serial.printf("Oldest file: %s\n", oldest.c_str());
        
        String content = sdManager.readFile(oldest);
        if (!content.isEmpty()) {
            Serial.printf("Content: %s\n", content.c_str());
            Serial.println("✅ File read successfully\n");
        } else {
            Serial.println("❌ Failed to read file\n");
        }
    }
    
    // Test 6: List all files
    Serial.println("[TEST 6] Listing all pending files...");
    std::vector<String> files = sdManager.getPendingFiles();
    for (size_t i = 0; i < files.size(); i++) {
        Serial.printf("  [%d] %s\n", i+1, files[i].c_str());
    }
    Serial.println();
    
    // Test 7: Delete oldest file
    Serial.println("[TEST 7] Deleting oldest file...");
    if (sdManager.deleteOldest()) {
        Serial.println("✅ File deleted");
    } else {
        Serial.println("❌ Delete failed");
    }
    Serial.println();
    
    // Test 8: Final status
    Serial.println("[TEST 8] Final SD card status:");
    sdManager.printStatus();
    
    Serial.println("\n========================================");
    Serial.println(" SD MANAGER TEST COMPLETE");
    Serial.println("========================================");
}

void loop() {
    // Nothing to do
    delay(1000);
}
