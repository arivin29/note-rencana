#ifndef TIME_MANAGER_H
#define TIME_MANAGER_H

#include <Arduino.h>
#include <time.h>

// ============================================================================
// TIME MANAGER - RTC + NTP/MQTT Sync
// ============================================================================
// Supports:
// 1. DS3231 RTC module (I2C, with battery backup CR2032)
// 2. MQTT time sync (request from server on boot)
// 3. NTP sync (optional, via 4G LTE)
// 4. ESP32 internal RTC (no battery backup, loses time on reboot)

// ============================================================================
// TIME SYNC MODES
// ============================================================================

enum TimeSyncMode {
    TIME_SYNC_NONE = 0,      // No time sync
    TIME_SYNC_MQTT,          // Sync via MQTT (default)
    TIME_SYNC_NTP,           // Sync via NTP over 4G
    TIME_SYNC_RTC            // Sync from DS3231 RTC
};

enum TimeSyncStatus {
    TIME_NOT_SYNCED = 0,     // Time not synced yet
    TIME_SYNCING,            // Waiting for sync
    TIME_SYNCED,             // Successfully synced
    TIME_SYNC_FAILED         // Sync failed
};

// ============================================================================
// TIME MANAGER CLASS
// ============================================================================

class TimeManager {
public:
    TimeManager();

    // ========================================
    // Initialization
    // ========================================

    // Initialize time manager
    bool begin();

    // Check if DS3231 RTC module is available
    bool hasRTC() { return rtcAvailable; }

    // Check if time is synced
    bool isSynced() { return syncStatus == TIME_SYNCED; }

    // Get sync status
    TimeSyncStatus getSyncStatus() { return syncStatus; }

    // ========================================
    // Time Sync Methods
    // ========================================

    // Request time sync via MQTT
    // Call this after MQTT connection established
    void requestMQTTTimeSync();

    // Set time from MQTT response
    // Format: Unix timestamp (seconds since 1970-01-01 00:00:00 UTC)
    bool setTimeFromMQTT(unsigned long timestamp);

    // Sync time from NTP (requires 4G LTE connection)
    bool syncFromNTP();

    // Sync time from DS3231 RTC (if available)
    bool syncFromRTC();

    // Sync ESP32 internal RTC to DS3231
    bool syncToRTC();

    // ========================================
    // Time Getters
    // ========================================

    // Get current Unix timestamp (seconds since 1970-01-01)
    unsigned long getUnixTime();

    // Get ISO 8601 timestamp string: "2025-11-21T10:30:45Z"
    String getISO8601();

    // Get human-readable timestamp: "2025-11-21 10:30:45"
    String getTimestamp();

    // Get date: "2025-11-21"
    String getDate();

    // Get time: "10:30:45"
    String getTime();

    // ========================================
    // Time Setters
    // ========================================

    // Set time manually (Unix timestamp)
    bool setUnixTime(unsigned long timestamp);

    // Set time manually (ISO 8601 string)
    bool setISO8601(const String& iso8601);

    // ========================================
    // Status & Debug
    // ========================================

    // Print time status
    void printStatus();

    // Get time source string
    String getTimeSource();

    // Check if RTC time is valid
    bool isRTCValid();

    // ========================================
    // MQTT Topics
    // ========================================

    // Get MQTT request topic: "cek_waktu"
    String getRequestTopic();

    // Get MQTT response topic: "cek_waktu/response"
    String getResponseTopic();

private:
    bool rtcAvailable;
    TimeSyncStatus syncStatus;
    TimeSyncMode syncMode;

    unsigned long lastSyncTime;      // millis() of last sync
    unsigned long syncInterval;      // Re-sync every 24 hours

    // Helper: Update ESP32 internal RTC
    void updateInternalRTC(unsigned long timestamp);

    // Helper: Read DS3231 RTC
    unsigned long readDS3231();

    // Helper: Write to DS3231 RTC
    bool writeDS3231(unsigned long timestamp);

    // Helper: Parse ISO 8601 string
    bool parseISO8601(const String& iso8601, struct tm* timeinfo);
};

#endif // TIME_MANAGER_H
