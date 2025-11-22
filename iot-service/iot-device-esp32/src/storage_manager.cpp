#include "storage_manager.h"
#include "config.h"

// ============================================================================
// STORAGE MANAGER IMPLEMENTATION
// ============================================================================

StorageManager::StorageManager() {
    sdAvailable = false;
    littlefsAvailable = false;
    activeStorage = STORAGE_NONE;
    ramQueueCount = 0;
    ramQueueHead = 0;
    ramQueueTail = 0;
}

// ========================================
// Initialization
// ========================================

bool StorageManager::begin() {
    Serial.println(F("[Storage] Initializing storage..."));

    // Try SD card first (primary)
    if (initSD()) {
        activeStorage = STORAGE_SD_CARD;
        Serial.println(F("[Storage] ✅ Using SD Card (primary)"));
        return true;
    }

    // Try LittleFS (fallback)
    if (initLittleFS()) {
        activeStorage = STORAGE_LITTLEFS;
        Serial.println(F("[Storage] ⚠️  SD Card failed, using LittleFS (fallback)"));
        return true;
    }

    // Last resort: RAM queue
    activeStorage = STORAGE_RAM;
    Serial.println(F("[Storage] ⚠️  No filesystem available, using RAM queue (limited)"));
    return true;
}

bool StorageManager::initSD() {
    #if DEBUG_SD
    Serial.println(F("[Storage] Trying SD Card..."));
    #endif

    if (!SD.begin()) {
        #if DEBUG_SD
        Serial.println(F("[Storage] SD Card init failed"));
        #endif
        return false;
    }

    sdAvailable = true;
    #if DEBUG_SD
    Serial.println(F("[Storage] SD Card initialized"));
    #endif
    return true;
}

bool StorageManager::initLittleFS() {
    #if DEBUG_SD
    Serial.println(F("[Storage] Trying LittleFS..."));
    #endif

    if (!LittleFS.begin(true)) {  // format if mount failed
        #if DEBUG_SD
        Serial.println(F("[Storage] LittleFS init failed"));
        #endif
        return false;
    }

    littlefsAvailable = true;
    #if DEBUG_SD
    Serial.println(F("[Storage] LittleFS initialized"));
    #endif
    return true;
}

bool StorageManager::isAvailable() {
    return activeStorage != STORAGE_NONE;
}

// ========================================
// Queue Management
// ========================================

bool StorageManager::queueTelemetry(JsonDocument& doc) {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            return queueToSD(doc);

        case STORAGE_LITTLEFS:
            return queueToLittleFS(doc);

        case STORAGE_RAM:
            return queueToRAM(doc);

        default:
            Serial.println(F("[Storage] ❌ No storage available!"));
            return false;
    }
}

bool StorageManager::queueToSD(JsonDocument& doc) {
    File file = SD.open(SD_QUEUE_FILE, FILE_APPEND);
    if (!file) {
        Serial.println(F("[Storage] ❌ Failed to open SD queue file"));
        return false;
    }

    String jsonLine;
    serializeJson(doc, jsonLine);
    file.println(jsonLine);
    file.close();

    #if DEBUG_SD
    Serial.println(F("[Storage] ✅ Queued to SD Card"));
    #endif

    return true;
}

bool StorageManager::queueToLittleFS(JsonDocument& doc) {
    File file = LittleFS.open(LITTLEFS_QUEUE_FILE, "a");
    if (!file) {
        Serial.println(F("[Storage] ❌ Failed to open LittleFS queue file"));
        return false;
    }

    String jsonLine;
    serializeJson(doc, jsonLine);
    file.println(jsonLine);
    file.close();

    #if DEBUG_SD
    Serial.println(F("[Storage] ✅ Queued to LittleFS"));
    #endif

    return true;
}

bool StorageManager::queueToRAM(JsonDocument& doc) {
    if (ramQueueCount >= MAX_RAM_QUEUE_SIZE) {
        Serial.println(F("[Storage] ⚠️  RAM queue full! Dropping oldest..."));
        // Drop oldest to make room
        ramQueueHead = (ramQueueHead + 1) % MAX_RAM_QUEUE_SIZE;
        ramQueueCount--;
    }

    String jsonLine;
    serializeJson(doc, jsonLine);
    ramQueue[ramQueueTail] = jsonLine;
    ramQueueTail = (ramQueueTail + 1) % MAX_RAM_QUEUE_SIZE;
    ramQueueCount++;

    #if DEBUG_SD
    Serial.print(F("[Storage] ✅ Queued to RAM ("));
    Serial.print(ramQueueCount);
    Serial.print(F("/"));
    Serial.print(MAX_RAM_QUEUE_SIZE);
    Serial.println(F(")"));
    #endif

    return true;
}

// ========================================
// Dequeue
// ========================================

bool StorageManager::dequeueOldest(JsonDocument& doc) {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            return dequeueFromSD(doc);

        case STORAGE_LITTLEFS:
            return dequeueFromLittleFS(doc);

        case STORAGE_RAM:
            return dequeueFromRAM(doc);

        default:
            return false;
    }
}

bool StorageManager::dequeueFromSD(JsonDocument& doc) {
    File file = SD.open(SD_QUEUE_FILE, FILE_READ);
    if (!file || file.size() == 0) {
        return false;
    }

    // Read first line
    String line = file.readStringUntil('\n');
    file.close();

    // Parse JSON
    DeserializationError error = deserializeJson(doc, line);
    if (error) {
        Serial.println(F("[Storage] ❌ Failed to parse queued JSON"));
        return false;
    }

    // Remove first line
    removeFirstLine(SD_QUEUE_FILE, SD);

    return true;
}

bool StorageManager::dequeueFromLittleFS(JsonDocument& doc) {
    File file = LittleFS.open(LITTLEFS_QUEUE_FILE, "r");
    if (!file || file.size() == 0) {
        return false;
    }

    // Read first line
    String line = file.readStringUntil('\n');
    file.close();

    // Parse JSON
    DeserializationError error = deserializeJson(doc, line);
    if (error) {
        Serial.println(F("[Storage] ❌ Failed to parse queued JSON"));
        return false;
    }

    // Remove first line
    removeFirstLine(LITTLEFS_QUEUE_FILE, LittleFS);

    return true;
}

bool StorageManager::dequeueFromRAM(JsonDocument& doc) {
    if (ramQueueCount == 0) {
        return false;
    }

    String line = ramQueue[ramQueueHead];
    ramQueueHead = (ramQueueHead + 1) % MAX_RAM_QUEUE_SIZE;
    ramQueueCount--;

    // Parse JSON
    DeserializationError error = deserializeJson(doc, line);
    if (error) {
        Serial.println(F("[Storage] ❌ Failed to parse queued JSON"));
        return false;
    }

    return true;
}

// ========================================
// Queue Size
// ========================================

uint16_t StorageManager::getQueueSize() {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            return getFileQueueSize(SD_QUEUE_FILE, SD);

        case STORAGE_LITTLEFS:
            return getFileQueueSize(LITTLEFS_QUEUE_FILE, LittleFS);

        case STORAGE_RAM:
            return ramQueueCount;

        default:
            return 0;
    }
}

uint16_t StorageManager::getFileQueueSize(const char* filename, fs::FS& filesystem) {
    File file = filesystem.open(filename, FILE_READ);
    if (!file) {
        return 0;
    }

    uint16_t count = 0;
    while (file.available()) {
        file.readStringUntil('\n');
        count++;
    }

    file.close();
    return count;
}

// ========================================
// Clear Queue
// ========================================

bool StorageManager::clearQueue() {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            if (SD.exists(SD_QUEUE_FILE)) {
                SD.remove(SD_QUEUE_FILE);
            }
            return true;

        case STORAGE_LITTLEFS:
            if (LittleFS.exists(LITTLEFS_QUEUE_FILE)) {
                LittleFS.remove(LITTLEFS_QUEUE_FILE);
            }
            return true;

        case STORAGE_RAM:
            ramQueueHead = 0;
            ramQueueTail = 0;
            ramQueueCount = 0;
            return true;

        default:
            return false;
    }
}

// ========================================
// Storage Info
// ========================================

uint32_t StorageManager::getFreeSpaceMB() {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            return (SD.totalBytes() - SD.usedBytes()) / (1024 * 1024);

        case STORAGE_LITTLEFS:
            return (LittleFS.totalBytes() - LittleFS.usedBytes()) / (1024 * 1024);

        case STORAGE_RAM:
            return 0;  // RAM has no persistent storage

        default:
            return 0;
    }
}

String StorageManager::getStorageTypeName() {
    switch (activeStorage) {
        case STORAGE_SD_CARD:
            return "SD Card";
        case STORAGE_LITTLEFS:
            return "LittleFS (Internal Flash)";
        case STORAGE_RAM:
            return "RAM (Volatile)";
        default:
            return "None";
    }
}

void StorageManager::printInfo() {
    Serial.println(F("\n========== STORAGE INFO =========="));

    Serial.print(F("Active Storage: "));
    Serial.println(getStorageTypeName());

    Serial.print(F("Queue Size: "));
    Serial.println(getQueueSize());

    if (activeStorage != STORAGE_RAM) {
        Serial.print(F("Free Space: "));
        Serial.print(getFreeSpaceMB());
        Serial.println(F(" MB"));
    }

    if (activeStorage == STORAGE_RAM) {
        Serial.print(F("RAM Queue: "));
        Serial.print(ramQueueCount);
        Serial.print(F("/"));
        Serial.print(MAX_RAM_QUEUE_SIZE);
        Serial.println(F(" slots"));
        Serial.println(F("⚠️  WARNING: RAM queue is volatile (lost on restart)"));
    }

    Serial.println(F("==================================\n"));
}

// ========================================
// Helpers
// ========================================

bool StorageManager::removeFirstLine(const char* filename, fs::FS& filesystem) {
    // Read all lines except first
    File file = filesystem.open(filename, FILE_READ);
    if (!file) {
        return false;
    }

    String tempContent = "";
    bool firstLine = true;

    while (file.available()) {
        String line = file.readStringUntil('\n');
        if (firstLine) {
            firstLine = false;
            continue;  // Skip first line
        }
        tempContent += line + "\n";
    }

    file.close();

    // Write back
    file = filesystem.open(filename, FILE_WRITE);
    if (!file) {
        return false;
    }

    file.print(tempContent);
    file.close();

    return true;
}
