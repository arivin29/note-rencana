#include "sd_manager.h"
#include <time.h>

// ============================================================================
// SDManager Implementation
// ============================================================================

// Constructor
SDManager::SDManager() 
    : _mounted(false)
    , _available(false)
    , _spi(nullptr)
    , _totalWrites(0)
    , _totalReads(0)
    , _totalDeletes(0)
    , _errors(0) {
}

// Destructor
SDManager::~SDManager() {
    if (_mounted) {
        SD.end();
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

bool SDManager::begin() {
    #if DEBUG_SD
    Serial.println("[SD] Initializing SD card...");
    #endif
    
    // Initialize SPI for SD card
    SPI.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
    
    // Try to mount SD card
    if (!SD.begin(SD_CS_PIN)) {
        #if DEBUG_SD
        Serial.println("[SD] ⚠️ SD card not found or mount failed");
        Serial.println("[SD] Device will continue without SD card (graceful degradation)");
        #endif
        _mounted = false;
        _available = false;
        return false;
    }
    
    _mounted = true;
    
    // Get card type
    uint8_t cardType = SD.cardType();
    if (cardType == CARD_NONE) {
        #if DEBUG_SD
        Serial.println("[SD] ⚠️ No SD card detected");
        #endif
        _mounted = false;
        _available = false;
        return false;
    }
    
    #if DEBUG_SD
    Serial.print("[SD] ✅ SD card mounted successfully - Type: ");
    switch(cardType) {
        case CARD_MMC:  Serial.println("MMC"); break;
        case CARD_SD:   Serial.println("SDSC"); break;
        case CARD_SDHC: Serial.println("SDHC"); break;
        default:        Serial.println("UNKNOWN"); break;
    }
    
    // Print card size
    uint64_t cardSize = SD.cardSize() / (1024 * 1024);
    Serial.printf("[SD] Card Size: %llu MB\n", cardSize);
    #endif
    
    // Create folder structure
    if (!createFolderStructure()) {
        #if DEBUG_SD
        Serial.println("[SD] ⚠️ Failed to create folder structure");
        #endif
        _errors++;
    }
    
    _available = true;
    
    #if DEBUG_SD
    Serial.println("[SD] SD Manager ready");
    printStatus();
    #endif
    
    return true;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

bool SDManager::writeTelemetry(const String& jsonData, const String& timestamp) {
    if (!_available) {
        return false; // SD not available, skip silently
    }
    
    // Generate filename
    String filename = generateFilename(timestamp);
    String fullPath = String(SD_DATA_FOLDER) + "/" + getDateFolder() + "/" + filename;
    
    // Ensure date folder exists
    String dateFolder = String(SD_DATA_FOLDER) + "/" + getDateFolder();
    if (!ensureFolderExists(dateFolder)) {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Failed to create folder: %s\n", dateFolder.c_str());
        #endif
        _errors++;
        return false;
    }
    
    // Write to file
    File file = SD.open(fullPath, FILE_WRITE);
    if (!file) {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Failed to open file: %s\n", fullPath.c_str());
        #endif
        _errors++;
        return false;
    }
    
    size_t written = file.print(jsonData);
    file.close();
    
    if (written == jsonData.length()) {
        _totalWrites++;
        
        #if DEBUG_SD
        Serial.printf("[SD] ✅ Saved: %s (%d bytes)\n", fullPath.c_str(), written);
        #endif
        
        return true;
    } else {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Write failed: %s\n", fullPath.c_str());
        #endif
        _errors++;
        return false;
    }
}

bool SDManager::writeLog(const String& message, const String& level) {
    if (!_available) {
        return false;
    }
    
    // Generate log filename (one per day)
    String dateStr = getDateFolder();
    String filename = String(SD_LOGS_FOLDER) + "/" + dateStr + ".log";
    
    // Ensure logs folder exists
    if (!ensureFolderExists(SD_LOGS_FOLDER)) {
        return false;
    }
    
    // Append to log file
    File file = SD.open(filename, FILE_APPEND);
    if (!file) {
        _errors++;
        return false;
    }
    
    // Format: [TIMESTAMP] [LEVEL] Message
    char timeStr[20];
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);
    strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", timeinfo);
    
    String logEntry = "[" + String(timeStr) + "] [" + level + "] " + message + "\n";
    
    file.print(logEntry);
    file.close();
    
    _totalWrites++;
    return true;
}

bool SDManager::writeSystemState(const String& jsonData) {
    if (!_available) {
        return false;
    }
    
    String filename = String(SD_SYSTEM_FOLDER) + "/state.json";
    
    // Ensure system folder exists
    if (!ensureFolderExists(SD_SYSTEM_FOLDER)) {
        return false;
    }
    
    // Write state file
    File file = SD.open(filename, FILE_WRITE);
    if (!file) {
        _errors++;
        return false;
    }
    
    file.print(jsonData);
    file.close();
    
    _totalWrites++;
    return true;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

bool SDManager::hasPendingData() {
    if (!_available) {
        return false;
    }
    
    return getPendingFileCount() > 0;
}

std::vector<String> SDManager::getPendingFiles() {
    std::vector<String> files;
    
    if (!_available) {
        return files;
    }
    
    // Open data folder
    File root = SD.open(SD_DATA_FOLDER);
    if (!root || !root.isDirectory()) {
        return files;
    }
    
    // Iterate through date folders
    File dateFolder = root.openNextFile();
    while (dateFolder) {
        if (dateFolder.isDirectory()) {
            String datePath = String(SD_DATA_FOLDER) + "/" + String(dateFolder.name());
            
            // Open date folder
            File df = SD.open(datePath);
            if (df && df.isDirectory()) {
                // Iterate through files in date folder
                File file = df.openNextFile();
                while (file) {
                    if (!file.isDirectory()) {
                        String fullPath = datePath + "/" + String(file.name());
                        files.push_back(fullPath);
                    }
                    file = df.openNextFile();
                }
                df.close();
            }
        }
        dateFolder = root.openNextFile();
    }
    root.close();
    
    // Sort files by name (timestamp-based filenames ensure chronological order)
    std::sort(files.begin(), files.end());
    
    return files;
}

String SDManager::getOldestFile() {
    std::vector<String> files = getPendingFiles();
    
    if (files.empty()) {
        return "";
    }
    
    return files[0]; // First file is oldest (sorted)
}

String SDManager::readFile(const String& filePath) {
    if (!_available) {
        return "";
    }
    
    File file = SD.open(filePath, FILE_READ);
    if (!file) {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Failed to open file: %s\n", filePath.c_str());
        #endif
        _errors++;
        return "";
    }
    
    String content = "";
    while (file.available()) {
        content += (char)file.read();
    }
    file.close();
    
    _totalReads++;
    
    #if DEBUG_SD
    Serial.printf("[SD] ✅ Read: %s (%d bytes)\n", filePath.c_str(), content.length());
    #endif
    
    return content;
}

uint32_t SDManager::getPendingFileCount() {
    return getPendingFiles().size();
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

bool SDManager::deleteFile(const String& filePath) {
    if (!_available) {
        return false;
    }
    
    if (!SD.exists(filePath)) {
        #if DEBUG_SD
        Serial.printf("[SD] ⚠️ File not found: %s\n", filePath.c_str());
        #endif
        return false;
    }
    
    if (SD.remove(filePath)) {
        _totalDeletes++;
        
        #if DEBUG_SD
        Serial.printf("[SD] ✅ Deleted: %s\n", filePath.c_str());
        #endif
        
        return true;
    } else {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Failed to delete: %s\n", filePath.c_str());
        #endif
        _errors++;
        return false;
    }
}

bool SDManager::deleteOldest() {
    String oldest = getOldestFile();
    if (oldest.isEmpty()) {
        return false;
    }
    
    return deleteFile(oldest);
}

uint32_t SDManager::autoCleanup() {
    if (!_available || !SD_CARD_AUTO_CLEANUP) {
        return 0;
    }
    
    SDCardStats stats = getStats();
    
    // Check if cleanup needed
    if (stats.usagePercent < SD_CARD_MAX_USAGE_PERCENT) {
        return 0; // No cleanup needed
    }
    
    #if DEBUG_SD
    Serial.printf("[SD] 🧹 Auto cleanup triggered (%.1f%% usage)\n", stats.usagePercent);
    #endif
    
    uint32_t deleted = 0;
    
    // Delete oldest files until usage drops below threshold
    while (stats.usagePercent >= SD_CARD_MAX_USAGE_PERCENT && hasPendingData()) {
        if (deleteOldest()) {
            deleted++;
            stats = getStats(); // Update stats
        } else {
            break; // Stop if deletion fails
        }
    }
    
    #if DEBUG_SD
    Serial.printf("[SD] 🧹 Cleanup complete: %d files deleted\n", deleted);
    #endif
    
    return deleted;
}

uint32_t SDManager::deleteOlderThan(uint32_t days) {
    if (!_available) {
        return 0;
    }
    
    uint32_t deleted = 0;
    time_t currentTime = time(nullptr);
    time_t threshold = days * 24 * 60 * 60; // Convert days to seconds
    
    std::vector<String> files = getPendingFiles();
    
    for (const String& file : files) {
        // Get file modification time
        File f = SD.open(file);
        if (f) {
            time_t fileTime = f.getLastWrite();
            f.close();
            
            // Check if file is older than threshold
            if (currentTime - fileTime > threshold) {
                if (deleteFile(file)) {
                    deleted++;
                }
            }
        }
    }
    
    #if DEBUG_SD
    if (deleted > 0) {
        Serial.printf("[SD] 🧹 Deleted %d files older than %d days\n", deleted, days);
    }
    #endif
    
    return deleted;
}

// ============================================================================
// STATISTICS & MONITORING
// ============================================================================

SDCardStats SDManager::getStats() {
    SDCardStats stats;
    stats.mounted = _mounted;
    stats.available = _available;
    stats.totalWrites = _totalWrites;
    stats.totalReads = _totalReads;
    stats.totalDeletes = _totalDeletes;
    stats.errors = _errors;
    
    if (!_available) {
        stats.totalBytes = 0;
        stats.usedBytes = 0;
        stats.freeBytes = 0;
        stats.usagePercent = 0.0;
        stats.pendingFiles = 0;
        stats.oldestFile = "";
        stats.oldestTimestamp = "";
        return stats;
    }
    
    // Get SD card size info
    stats.totalBytes = SD.totalBytes();
    stats.usedBytes = SD.usedBytes();
    stats.freeBytes = stats.totalBytes - stats.usedBytes;
    stats.usagePercent = (float)stats.usedBytes / (float)stats.totalBytes * 100.0;
    
    // Get pending files info
    std::vector<String> files = getPendingFiles();
    stats.pendingFiles = files.size();
    
    if (!files.empty()) {
        stats.oldestFile = files[0];
        // Extract timestamp from filename
        int lastSlash = files[0].lastIndexOf('/');
        if (lastSlash >= 0) {
            stats.oldestTimestamp = files[0].substring(lastSlash + 1);
        }
    } else {
        stats.oldestFile = "";
        stats.oldestTimestamp = "";
    }
    
    return stats;
}

bool SDManager::needsCleanup() {
    if (!_available) {
        return false;
    }
    
    SDCardStats stats = getStats();
    return stats.usagePercent >= SD_CARD_MAX_USAGE_PERCENT;
}

void SDManager::printStatus() {
    SDCardStats stats = getStats();
    
    Serial.println("\n========== SD CARD STATUS ==========");
    Serial.printf("Mounted:      %s\n", stats.mounted ? "YES" : "NO");
    Serial.printf("Available:    %s\n", stats.available ? "YES" : "NO");
    
    if (stats.available) {
        Serial.printf("Total Size:   %.2f MB\n", stats.totalBytes / (1024.0 * 1024.0));
        Serial.printf("Used:         %.2f MB\n", stats.usedBytes / (1024.0 * 1024.0));
        Serial.printf("Free:         %.2f MB\n", stats.freeBytes / (1024.0 * 1024.0));
        Serial.printf("Usage:        %.1f%%\n", stats.usagePercent);
        Serial.println("------------------------------------");
        Serial.printf("Pending:      %u files\n", stats.pendingFiles);
        Serial.printf("Oldest:       %s\n", stats.oldestTimestamp.c_str());
        Serial.println("------------------------------------");
        Serial.printf("Total Writes: %u\n", stats.totalWrites);
        Serial.printf("Total Reads:  %u\n", stats.totalReads);
        Serial.printf("Total Deletes:%u\n", stats.totalDeletes);
        Serial.printf("Errors:       %u\n", stats.errors);
    } else {
        Serial.println("SD card not available - operating in degraded mode");
    }
    
    Serial.println("====================================\n");
}

void SDManager::resetStats() {
    _totalWrites = 0;
    _totalReads = 0;
    _totalDeletes = 0;
    _errors = 0;
    
    #if DEBUG_SD
    Serial.println("[SD] Statistics reset");
    #endif
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

String SDManager::generateFilename(const String& timestamp) {
    String filename;
    
    if (timestamp.isEmpty()) {
        // Use current time (HHMMSS format)
        char timeStr[7];
        time_t now = time(nullptr);
        struct tm* timeinfo = localtime(&now);
        strftime(timeStr, sizeof(timeStr), "%H%M%S", timeinfo);
        filename = String(timeStr);
    } else {
        // Use provided timestamp
        filename = timestamp;
    }
    
    filename += "_telemetry.json";
    return filename;
}

String SDManager::getDateFolder() {
    // Return date in YYYYMMDD format
    char dateStr[9];
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);
    strftime(dateStr, sizeof(dateStr), "%Y%m%d", timeinfo);
    return String(dateStr);
}

bool SDManager::createFolderStructure() {
    bool success = true;
    
    // Create main folders
    if (!ensureFolderExists(SD_DATA_FOLDER)) {
        success = false;
    }
    if (!ensureFolderExists(SD_LOGS_FOLDER)) {
        success = false;
    }
    if (!ensureFolderExists(SD_SYSTEM_FOLDER)) {
        success = false;
    }
    
    return success;
}

bool SDManager::ensureFolderExists(const String& path) {
    if (SD.exists(path)) {
        return true; // Folder already exists
    }
    
    // Create folder
    if (SD.mkdir(path)) {
        #if DEBUG_SD
        Serial.printf("[SD] ✅ Created folder: %s\n", path.c_str());
        #endif
        return true;
    } else {
        #if DEBUG_SD
        Serial.printf("[SD] ❌ Failed to create folder: %s\n", path.c_str());
        #endif
        return false;
    }
}

uint64_t SDManager::getFolderSize(const String& path) {
    // Not implemented - would need recursive file scanning
    // For now, use SD.usedBytes() for total usage
    return 0;
}

void SDManager::deleteOldestFiles(uint32_t count) {
    for (uint32_t i = 0; i < count && hasPendingData(); i++) {
        deleteOldest();
    }
}

// Global instance
SDManager sdManager;
