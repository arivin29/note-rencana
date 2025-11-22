#ifndef SD_LOGGER_H
#define SD_LOGGER_H

#include <Arduino.h>
#include <SD.h>
#include <FS.h>
#include <ArduinoJson.h>

// ============================================================================
// SD CARD LOGGER
// ============================================================================
// Handles offline data storage when MQTT connection is lost

#define QUEUE_FILE "/offline_queue.jsonl"  // JSON Lines format
#define LOG_FILE "/device_log.txt"

class SDLogger {
public:
    SDLogger();

    // Initialize SD card
    bool begin();

    // Check if SD card is available
    bool isAvailable() { return initialized; }

    // Queue telemetry data when offline
    bool queueTelemetry(JsonDocument& doc);

    // Get number of queued records
    uint16_t getQueueSize();

    // Read and remove oldest queued record
    bool dequeueOldest(JsonDocument& doc);

    // Clear all queued records
    bool clearQueue();

    // Log text message to file
    bool logMessage(const char* message);

    // Get free space (MB)
    uint32_t getFreeSpaceMB();

    // Print SD card info
    void printInfo();

private:
    bool initialized;

    // Helper: count lines in file
    uint16_t countLines(const char* filename);

    // Helper: read specific line from file
    bool readLine(const char* filename, uint16_t lineNumber, String& output);

    // Helper: remove first line from file
    bool removeFirstLine(const char* filename);
};

#endif // SD_LOGGER_H
