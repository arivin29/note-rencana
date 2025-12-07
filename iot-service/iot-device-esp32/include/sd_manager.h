#ifndef SD_MANAGER_H
#define SD_MANAGER_H

#include <Arduino.h>
#include <SD.h>
#include <SPI.h>
#include <vector>
#include "config.h"

// ============================================================================
// SD CARD MANAGER - Persistent Storage for Telemetry Data
// ============================================================================
// Purpose: Manage SD card operations for offline data buffering
// - Initialize SD card (graceful degradation if not present)
// - Save telemetry data to timestamped files
// - Scan for pending data (oldest first)
// - Delete files after successful send
// - Auto cleanup when storage limit reached
// ============================================================================

// SD Card Statistics
struct SDCardStats {
    bool mounted;               // SD card successfully mounted
    bool available;             // SD card available for operations
    uint64_t totalBytes;        // Total SD card size (bytes)
    uint64_t usedBytes;         // Used space (bytes)
    uint64_t freeBytes;         // Free space (bytes)
    float usagePercent;         // Usage percentage (0-100)
    uint32_t pendingFiles;      // Number of pending telemetry files
    String oldestFile;          // Path to oldest pending file
    String oldestTimestamp;     // Timestamp of oldest file
    uint32_t totalWrites;       // Total write operations
    uint32_t totalReads;        // Total read operations
    uint32_t totalDeletes;      // Total delete operations
    uint32_t errors;            // Total error count
};

// ============================================================================
// SDManager Class
// ============================================================================
class SDManager {
private:
    bool _mounted;              // SD card mount status
    bool _available;            // SD card available for use
    SPIClass* _spi;             // SPI instance for SD card
    
    // Statistics
    uint32_t _totalWrites;
    uint32_t _totalReads;
    uint32_t _totalDeletes;
    uint32_t _errors;
    
    // Helper functions
    String generateFilename(const String& timestamp = "");
    String getDateFolder();
    bool createFolderStructure();
    bool ensureFolderExists(const String& path);
    uint64_t getFolderSize(const String& path);
    void deleteOldestFiles(uint32_t count);

public:
    SDManager();
    ~SDManager();
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    /**
     * Initialize SD card
     * @return true if mounted successfully, false if failed (graceful degradation)
     */
    bool begin();
    
    /**
     * Check if SD card is mounted and available
     * @return true if available, false otherwise
     */
    bool isAvailable() const { return _available; }
    
    /**
     * Check if SD card is mounted
     * @return true if mounted, false otherwise
     */
    bool isMounted() const { return _mounted; }
    
    // ========================================================================
    // WRITE OPERATIONS
    // ========================================================================
    
    /**
     * Save telemetry data to SD card
     * @param jsonData Telemetry JSON string
     * @param timestamp Optional timestamp (ISO8601 or Unix timestamp string)
     * @return true if saved successfully, false on error
     */
    bool writeTelemetry(const String& jsonData, const String& timestamp = "");
    
    /**
     * Write log entry to SD card
     * @param message Log message
     * @param level Log level (INFO, WARN, ERROR)
     * @return true if saved successfully
     */
    bool writeLog(const String& message, const String& level = "INFO");
    
    /**
     * Write system state to SD card
     * @param jsonData State data as JSON string
     * @return true if saved successfully
     */
    bool writeSystemState(const String& jsonData);
    
    // ========================================================================
    // READ OPERATIONS
    // ========================================================================
    
    /**
     * Check if there are pending telemetry files
     * @return true if pending files exist
     */
    bool hasPendingData();
    
    /**
     * Get list of all pending telemetry files (sorted oldest first)
     * @return Vector of file paths
     */
    std::vector<String> getPendingFiles();
    
    /**
     * Get oldest telemetry file path
     * @return Full path to oldest file, empty string if none
     */
    String getOldestFile();
    
    /**
     * Read file content
     * @param filePath Full path to file
     * @return File content as string, empty if error
     */
    String readFile(const String& filePath);
    
    /**
     * Get count of pending files
     * @return Number of pending telemetry files
     */
    uint32_t getPendingFileCount();
    
    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================
    
    /**
     * Delete file from SD card
     * @param filePath Full path to file
     * @return true if deleted successfully
     */
    bool deleteFile(const String& filePath);
    
    /**
     * Delete oldest telemetry file
     * @return true if deleted successfully
     */
    bool deleteOldest();
    
    /**
     * Auto cleanup - delete old files if usage exceeds threshold
     * @return Number of files deleted
     */
    uint32_t autoCleanup();
    
    /**
     * Delete files older than specified days
     * @param days Age threshold in days
     * @return Number of files deleted
     */
    uint32_t deleteOlderThan(uint32_t days);
    
    // ========================================================================
    // STATISTICS & MONITORING
    // ========================================================================
    
    /**
     * Get SD card statistics
     * @return SDCardStats structure with all info
     */
    SDCardStats getStats();
    
    /**
     * Check if SD card usage exceeds threshold
     * @return true if cleanup needed
     */
    bool needsCleanup();
    
    /**
     * Print SD card status to Serial
     */
    void printStatus();
    
    /**
     * Reset statistics counters
     */
    void resetStats();
};

// Global instance (declared in sd_manager.cpp)
extern SDManager sdManager;

#endif // SD_MANAGER_H
