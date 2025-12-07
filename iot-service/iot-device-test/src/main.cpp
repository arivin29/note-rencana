#include <Arduino.h>
#include <SPI.h>
#include <SD.h>

// SD Card SPI Pins (KhursLabs ESP32-S3)
constexpr int SD_CS   = 10;  // SS/CS
constexpr int SD_MOSI = 11;  // MOSI
constexpr int SD_SCK  = 12;  // SCK
constexpr int SD_MISO = 13;  // MISO

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n╔════════════════════════════════════╗");
    Serial.println("║     SD Card Test (4GB)             ║");
    Serial.println("╚════════════════════════════════════╝\n");
    
    Serial.println("📌 Pin Configuration:");
    Serial.printf("   CS/SS : GPIO %d\n", SD_CS);
    Serial.printf("   MOSI  : GPIO %d\n", SD_MOSI);
    Serial.printf("   SCK   : GPIO %d\n", SD_SCK);
    Serial.printf("   MISO  : GPIO %d\n\n", SD_MISO);
    
    // Initialize SPI with custom pins
    SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
    
    Serial.println("🔍 Initializing SD card...");
    
    if (!SD.begin(SD_CS)) {
        Serial.println("❌ SD Card initialization FAILED!");
        Serial.println("\nPossible issues:");
        Serial.println("  • SD card not inserted");
        Serial.println("  • Wrong pin configuration");
        Serial.println("  • SD card damaged");
        Serial.println("  • Format not supported (use FAT32)\n");
        while (1) delay(1000);
    }
    
    Serial.println("✅ SD Card initialized successfully!\n");
    
    // Get card info
    uint8_t cardType = SD.cardType();
    Serial.print("📇 Card Type: ");
    
    if (cardType == CARD_NONE) {
        Serial.println("No SD card attached");
        while (1) delay(1000);
    } else if (cardType == CARD_MMC) {
        Serial.println("MMC");
    } else if (cardType == CARD_SD) {
        Serial.println("SDSC");
    } else if (cardType == CARD_SDHC) {
        Serial.println("SDHC");
    } else {
        Serial.println("UNKNOWN");
    }
    
    // Get card size
    uint64_t cardSize = SD.cardSize() / (1024 * 1024);
    Serial.printf("💾 SD Card Size: %llu MB\n", cardSize);
    
    uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
    uint64_t usedBytes = SD.usedBytes() / (1024 * 1024);
    Serial.printf("📊 Total space: %llu MB\n", totalBytes);
    Serial.printf("📊 Used space:  %llu MB\n", usedBytes);
    Serial.printf("📊 Free space:  %llu MB\n\n", totalBytes - usedBytes);
    
    // List root directory
    Serial.println("📁 Files in root directory:");
    Serial.println("─────────────────────────────────");
    
    File root = SD.open("/");
    if (!root) {
        Serial.println("Failed to open directory");
        return;
    }
    
    if (!root.isDirectory()) {
        Serial.println("Not a directory");
        return;
    }
    
    File file = root.openNextFile();
    int fileCount = 0;
    
    while (file) {
        if (file.isDirectory()) {
            Serial.printf("  📁 %s/\n", file.name());
        } else {
            Serial.printf("  📄 %-20s  %8d bytes\n", file.name(), file.size());
        }
        fileCount++;
        file = root.openNextFile();
    }
    
    if (fileCount == 0) {
        Serial.println("  (empty)");
    }
    
    Serial.println("─────────────────────────────────\n");
    
    // Test write
    Serial.println("✍️  Testing write...");
    File testFile = SD.open("/test.txt", FILE_WRITE);
    
    if (testFile) {
        testFile.println("Hello from ESP32-S3!");
        testFile.printf("Timestamp: %lu ms\n", millis());
        testFile.close();
        Serial.println("✅ Write test OK!\n");
    } else {
        Serial.println("❌ Write test FAILED!\n");
    }
    
    // Test read
    Serial.println("📖 Testing read...");
    testFile = SD.open("/test.txt");
    
    if (testFile) {
        Serial.println("─── Content of test.txt ───");
        while (testFile.available()) {
            Serial.write(testFile.read());
        }
        Serial.println("───────────────────────────");
        testFile.close();
        Serial.println("✅ Read test OK!\n");
    } else {
        Serial.println("❌ Read test FAILED!\n");
    }
    
    Serial.println("╔════════════════════════════════════╗");
    Serial.println("║   SD Card Test COMPLETED! ✅       ║");
    Serial.println("╚════════════════════════════════════╝\n");
}

void loop() {
    // Nothing to do here
    delay(1000);
}

