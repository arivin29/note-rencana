#include "sd_logger.h"
#include "config.h"
#include <SPI.h>

// ============================================================================
// CONSTRUCTOR
// ============================================================================

SDLogger::SDLogger() {
    initialized = false;
}

// ============================================================================
// INITIALIZE SD CARD
// ============================================================================

bool SDLogger::begin() {
    #if DEBUG_SD
    Serial.println(F("[SD] Initializing SD card..."));
    Serial.print(F("[SD] Using SPI mode - CS:"));
    Serial.print(SD_CS_PIN);
    Serial.print(F(", MOSI:"));
    Serial.print(SD_MOSI_PIN);
    Serial.print(F(", SCK:"));
    Serial.print(SD_SCK_PIN);
    Serial.print(F(", MISO:"));
    Serial.println(SD_MISO_PIN);
    #endif

    // Initialize SPI for SD card with custom pins
    SPI.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
    
    // Initialize SD card with SPI mode
    if (!SD.begin(SD_CS_PIN, SPI)) {
        #if DEBUG_SD
        Serial.println(F("[SD] Card Mount Failed!"));
        #endif
        return false;
    }

    uint8_t cardType = SD.cardType();

    if (cardType == CARD_NONE) {
        #if DEBUG_SD
        Serial.println(F("[SD] No SD card attached!"));
        #endif
        return false;
    }

    initialized = true;

    #if DEBUG_SD
    Serial.print(F("[SD] Card Type: "));
    if (cardType == CARD_MMC) {
        Serial.println(F("MMC"));
    } else if (cardType == CARD_SD) {
        Serial.println(F("SDSC"));
    } else if (cardType == CARD_SDHC) {
        Serial.println(F("SDHC"));
    } else {
        Serial.println(F("UNKNOWN"));
    }

    uint64_t cardSize = SD.cardSize() / (1024 * 1024);
    Serial.print(F("[SD] Card Size: "));
    Serial.print(cardSize);
    Serial.println(F(" MB"));

    printInfo();
    #endif

    return true;
}

// ============================================================================
// QUEUE TELEMETRY
// ============================================================================

bool SDLogger::queueTelemetry(JsonDocument& doc) {
    if (!initialized) {
        return false;
    }

    #if DEBUG_SD
    Serial.println(F("[SD] Queueing telemetry to offline storage..."));
    #endif

    // Open file in append mode
    File file = SD.open(QUEUE_FILE, FILE_APPEND);
    if (!file) {
        #if DEBUG_SD
        Serial.println(F("[SD] Failed to open queue file!"));
        #endif
        return false;
    }

    // Write JSON as single line (JSON Lines format)
    serializeJson(doc, file);
    file.println(); // Newline separator
    file.close();

    #if DEBUG_SD
    Serial.print(F("[SD] Queued. Total records: "));
    Serial.println(getQueueSize());
    #endif

    return true;
}

// ============================================================================
// GET QUEUE SIZE
// ============================================================================

uint16_t SDLogger::getQueueSize() {
    if (!initialized) {
        return 0;
    }

    return countLines(QUEUE_FILE);
}

// ============================================================================
// DEQUEUE OLDEST RECORD
// ============================================================================

bool SDLogger::dequeueOldest(JsonDocument& doc) {
    if (!initialized) {
        return false;
    }

    if (getQueueSize() == 0) {
        return false;
    }

    // Read first line
    String line;
    if (!readLine(QUEUE_FILE, 0, line)) {
        return false;
    }

    // Parse JSON
    DeserializationError error = deserializeJson(doc, line);
    if (error) {
        #if DEBUG_SD
        Serial.print(F("[SD] Failed to parse queued JSON: "));
        Serial.println(error.c_str());
        #endif
        // Remove corrupted line
        removeFirstLine(QUEUE_FILE);
        return false;
    }

    // Remove the line from file
    removeFirstLine(QUEUE_FILE);

    #if DEBUG_SD
    Serial.print(F("[SD] Dequeued. Remaining: "));
    Serial.println(getQueueSize());
    #endif

    return true;
}

// ============================================================================
// CLEAR QUEUE
// ============================================================================

bool SDLogger::clearQueue() {
    if (!initialized) {
        return false;
    }

    if (SD.exists(QUEUE_FILE)) {
        SD.remove(QUEUE_FILE);

        #if DEBUG_SD
        Serial.println(F("[SD] Queue cleared"));
        #endif
    }

    return true;
}

// ============================================================================
// LOG MESSAGE
// ============================================================================

bool SDLogger::logMessage(const char* message) {
    if (!initialized) {
        return false;
    }

    File file = SD.open(LOG_FILE, FILE_APPEND);
    if (!file) {
        return false;
    }

    // Add timestamp (TODO: use RTC if available)
    file.print(F("["));
    file.print(millis());
    file.print(F("] "));
    file.println(message);
    file.close();

    return true;
}

// ============================================================================
// GET FREE SPACE
// ============================================================================

uint32_t SDLogger::getFreeSpaceMB() {
    if (!initialized) {
        return 0;
    }

    uint64_t totalBytes = SD.totalBytes();
    uint64_t usedBytes = SD.usedBytes();
    uint64_t freeBytes = totalBytes - usedBytes;

    return (uint32_t)(freeBytes / (1024 * 1024));
}

// ============================================================================
// PRINT INFO
// ============================================================================

void SDLogger::printInfo() {
    if (!initialized) {
        Serial.println(F("[SD] Not initialized"));
        return;
    }

    Serial.println(F("\n========== SD CARD INFO =========="));
    Serial.print(F("Total: "));
    Serial.print(SD.totalBytes() / (1024 * 1024));
    Serial.println(F(" MB"));
    Serial.print(F("Used: "));
    Serial.print(SD.usedBytes() / (1024 * 1024));
    Serial.println(F(" MB"));
    Serial.print(F("Free: "));
    Serial.print(getFreeSpaceMB());
    Serial.println(F(" MB"));
    Serial.print(F("Queued records: "));
    Serial.println(getQueueSize());
    Serial.println(F("==================================\n"));
}

// ============================================================================
// HELPER: COUNT LINES
// ============================================================================

uint16_t SDLogger::countLines(const char* filename) {
    if (!SD.exists(filename)) {
        return 0;
    }

    File file = SD.open(filename, FILE_READ);
    if (!file) {
        return 0;
    }

    uint16_t lines = 0;
    while (file.available()) {
        String line = file.readStringUntil('\n');
        if (line.length() > 0) {
            lines++;
        }
    }

    file.close();
    return lines;
}

// ============================================================================
// HELPER: READ LINE
// ============================================================================

bool SDLogger::readLine(const char* filename, uint16_t lineNumber, String& output) {
    if (!SD.exists(filename)) {
        return false;
    }

    File file = SD.open(filename, FILE_READ);
    if (!file) {
        return false;
    }

    uint16_t currentLine = 0;
    while (file.available()) {
        String line = file.readStringUntil('\n');
        if (currentLine == lineNumber) {
            output = line;
            file.close();
            return true;
        }
        currentLine++;
    }

    file.close();
    return false;
}

// ============================================================================
// HELPER: REMOVE FIRST LINE
// ============================================================================

bool SDLogger::removeFirstLine(const char* filename) {
    if (!SD.exists(filename)) {
        return false;
    }

    // Create temporary file
    const char* tempFile = "/temp.tmp";

    File source = SD.open(filename, FILE_READ);
    if (!source) {
        return false;
    }

    File dest = SD.open(tempFile, FILE_WRITE);
    if (!dest) {
        source.close();
        return false;
    }

    // Skip first line
    if (source.available()) {
        source.readStringUntil('\n');
    }

    // Copy remaining lines
    while (source.available()) {
        String line = source.readStringUntil('\n');
        dest.println(line);
    }

    source.close();
    dest.close();

    // Replace original file
    SD.remove(filename);
    SD.rename(tempFile, filename);

    return true;
}
