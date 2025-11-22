#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <SD.h>
#include <FS.h>
#include <LittleFS.h>

// ============================================================================
// STORAGE MANAGER - Unified Storage with Fallback
// ============================================================================
// Provides automatic fallback:
// 1. SD Card (primary, large capacity)
// 2. LittleFS (fallback, ESP32 internal flash ~4MB)
// 3. RAM buffer (last resort, lost on restart)

#define SD_QUEUE_FILE "/sd_queue.jsonl"
#define LITTLEFS_QUEUE_FILE "/lfs_queue.jsonl"
#define MAX_RAM_QUEUE_SIZE 10  // Max records in RAM

enum StorageType {
    STORAGE_SD_CARD,
    STORAGE_LITTLEFS,
    STORAGE_RAM,
    STORAGE_NONE
};

class StorageManager {
public:
    StorageManager();

    // Initialize storage (tries SD first, then LittleFS)
    bool begin();

    // Check if any storage is available
    bool isAvailable();

    // Get current active storage type
    StorageType getActiveStorage() { return activeStorage; }

    // Queue telemetry data when offline
    bool queueTelemetry(JsonDocument& doc);

    // Get total number of queued records (across all storage)
    uint16_t getQueueSize();

    // Read and remove oldest queued record
    bool dequeueOldest(JsonDocument& doc);

    // Clear all queued records
    bool clearQueue();

    // Get free space (MB) of active storage
    uint32_t getFreeSpaceMB();

    // Print storage info
    void printInfo();

    // Get storage type name
    String getStorageTypeName();

private:
    bool sdAvailable;
    bool littlefsAvailable;
    StorageType activeStorage;

    // RAM queue (fallback when no filesystem available)
    String ramQueue[MAX_RAM_QUEUE_SIZE];
    uint8_t ramQueueCount;
    uint8_t ramQueueHead;  // Index for dequeue
    uint8_t ramQueueTail;  // Index for enqueue

    // Helper: Try to initialize SD card
    bool initSD();

    // Helper: Try to initialize LittleFS
    bool initLittleFS();

    // Helper: Queue to SD card
    bool queueToSD(JsonDocument& doc);

    // Helper: Queue to LittleFS
    bool queueToLittleFS(JsonDocument& doc);

    // Helper: Queue to RAM
    bool queueToRAM(JsonDocument& doc);

    // Helper: Dequeue from SD card
    bool dequeueFromSD(JsonDocument& doc);

    // Helper: Dequeue from LittleFS
    bool dequeueFromLittleFS(JsonDocument& doc);

    // Helper: Dequeue from RAM
    bool dequeueFromRAM(JsonDocument& doc);

    // Helper: Get queue size from file
    uint16_t getFileQueueSize(const char* filename, fs::FS& filesystem);

    // Helper: Remove first line from file
    bool removeFirstLine(const char* filename, fs::FS& filesystem);
};

#endif // STORAGE_MANAGER_H
