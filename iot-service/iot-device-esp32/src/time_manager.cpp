#include "time_manager.h"
#include "config.h"
#include <RTClib.h>
#include <sys/time.h>

// DS3231 RTC instance
RTC_DS3231 rtc;

// ============================================================================
// TIME MANAGER IMPLEMENTATION
// ============================================================================

TimeManager::TimeManager() {
    rtcAvailable = false;
    syncStatus = TIME_NOT_SYNCED;
    syncMode = TIME_SYNC_MQTT;
    lastSyncTime = 0;
    syncInterval = 86400000;  // 24 hours in milliseconds
}

// ========================================
// Initialization
// ========================================

bool TimeManager::begin() {
    Serial.println(F("[TimeManager] Initializing..."));

    // Try to initialize DS3231 RTC
    if (rtc.begin()) {
        rtcAvailable = true;
        Serial.println(F("[TimeManager] DS3231 RTC detected"));

        // Check if RTC has valid time
        if (isRTCValid()) {
            Serial.println(F("[TimeManager] RTC has valid time, syncing from RTC..."));
            if (syncFromRTC()) {
                Serial.println(F("[TimeManager] Successfully synced from RTC"));
                return true;
            }
        } else {
            Serial.println(F("[TimeManager] RTC time invalid (needs battery or first sync)"));
        }
    } else {
        Serial.println(F("[TimeManager] DS3231 RTC not found (will use MQTT/NTP sync)"));
    }

    // If RTC not available or invalid, wait for MQTT sync
    Serial.println(F("[TimeManager] Waiting for time sync via MQTT..."));
    syncStatus = TIME_NOT_SYNCED;

    return true;
}

bool TimeManager::isRTCValid() {
    if (!rtcAvailable) {
        return false;
    }

    DateTime now = rtc.now();

    // Check if RTC time is reasonable
    // Year should be >= 2025 (current year)
    if (now.year() < 2025) {
        return false;
    }

    // Check if RTC lost power
    if (rtc.lostPower()) {
        Serial.println(F("[TimeManager] RTC lost power, time invalid"));
        return false;
    }

    return true;
}

// ========================================
// Time Sync Methods
// ========================================

void TimeManager::requestMQTTTimeSync() {
    Serial.println(F("[TimeManager] Requesting time sync via MQTT..."));
    syncStatus = TIME_SYNCING;
    // Note: Actual MQTT publish is done by caller
}

bool TimeManager::setTimeFromMQTT(unsigned long timestamp) {
    Serial.print(F("[TimeManager] Setting time from MQTT: "));
    Serial.println(timestamp);

    if (timestamp == 0) {
        Serial.println(F("[TimeManager] Invalid timestamp (0)"));
        syncStatus = TIME_SYNC_FAILED;
        return false;
    }

    // Update ESP32 internal RTC
    updateInternalRTC(timestamp);

    // If DS3231 available, update it too
    if (rtcAvailable) {
        writeDS3231(timestamp);
        Serial.println(F("[TimeManager] Updated DS3231 RTC"));
    }

    syncStatus = TIME_SYNCED;
    syncMode = TIME_SYNC_MQTT;
    lastSyncTime = millis();

    Serial.println(F("[TimeManager] Time synced successfully via MQTT"));
    Serial.print(F("[TimeManager] Current time: "));
    Serial.println(getISO8601());

    return true;
}

bool TimeManager::syncFromNTP() {
    Serial.println(F("[TimeManager] Syncing from NTP..."));

    // NTP server (Google)
    configTime(0, 0, "time.google.com", "pool.ntp.org");

    // Wait for NTP sync (max 10 seconds)
    int timeout = 100;  // 10 seconds (100 * 100ms)
    while (timeout > 0) {
        time_t now = time(nullptr);
        if (now > 1609459200) {  // 2021-01-01 00:00:00 UTC
            Serial.println(F("[TimeManager] NTP sync successful"));

            // Update DS3231 if available
            if (rtcAvailable) {
                writeDS3231(now);
                Serial.println(F("[TimeManager] Updated DS3231 RTC from NTP"));
            }

            syncStatus = TIME_SYNCED;
            syncMode = TIME_SYNC_NTP;
            lastSyncTime = millis();

            Serial.print(F("[TimeManager] Current time: "));
            Serial.println(getISO8601());

            return true;
        }

        delay(100);
        timeout--;
    }

    Serial.println(F("[TimeManager] NTP sync timeout"));
    syncStatus = TIME_SYNC_FAILED;
    return false;
}

bool TimeManager::syncFromRTC() {
    if (!rtcAvailable) {
        Serial.println(F("[TimeManager] DS3231 RTC not available"));
        return false;
    }

    if (!isRTCValid()) {
        Serial.println(F("[TimeManager] RTC time invalid"));
        return false;
    }

    unsigned long timestamp = readDS3231();
    updateInternalRTC(timestamp);

    syncStatus = TIME_SYNCED;
    syncMode = TIME_SYNC_RTC;
    lastSyncTime = millis();

    Serial.println(F("[TimeManager] Time synced from DS3231 RTC"));
    Serial.print(F("[TimeManager] Current time: "));
    Serial.println(getISO8601());

    return true;
}

bool TimeManager::syncToRTC() {
    if (!rtcAvailable) {
        Serial.println(F("[TimeManager] DS3231 RTC not available"));
        return false;
    }

    unsigned long timestamp = getUnixTime();
    return writeDS3231(timestamp);
}

// ========================================
// Time Getters
// ========================================

unsigned long TimeManager::getUnixTime() {
    time_t now;
    time(&now);
    return (unsigned long)now;
}

String TimeManager::getISO8601() {
    time_t now = getUnixTime();
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);

    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);

    return String(buffer);
}

String TimeManager::getTimestamp() {
    time_t now = getUnixTime();
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    char buffer[20];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);

    return String(buffer);
}

String TimeManager::getDate() {
    time_t now = getUnixTime();
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    char buffer[11];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d", &timeinfo);

    return String(buffer);
}

String TimeManager::getTime() {
    time_t now = getUnixTime();
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    char buffer[9];
    strftime(buffer, sizeof(buffer), "%H:%M:%S", &timeinfo);

    return String(buffer);
}

// ========================================
// Time Setters
// ========================================

bool TimeManager::setUnixTime(unsigned long timestamp) {
    updateInternalRTC(timestamp);

    if (rtcAvailable) {
        writeDS3231(timestamp);
    }

    syncStatus = TIME_SYNCED;
    lastSyncTime = millis();

    return true;
}

bool TimeManager::setISO8601(const String& iso8601) {
    struct tm timeinfo;
    if (!parseISO8601(iso8601, &timeinfo)) {
        Serial.println(F("[TimeManager] Failed to parse ISO8601 timestamp"));
        return false;
    }

    time_t timestamp = mktime(&timeinfo);
    return setUnixTime((unsigned long)timestamp);
}

// ========================================
// Status & Debug
// ========================================

void TimeManager::printStatus() {
    Serial.println(F("\n========== TIME MANAGER STATUS =========="));

    Serial.print(F("RTC Available: "));
    Serial.println(rtcAvailable ? "YES (DS3231)" : "NO");

    Serial.print(F("Sync Status: "));
    switch (syncStatus) {
        case TIME_NOT_SYNCED:
            Serial.println(F("NOT SYNCED"));
            break;
        case TIME_SYNCING:
            Serial.println(F("SYNCING..."));
            break;
        case TIME_SYNCED:
            Serial.println(F("SYNCED"));
            break;
        case TIME_SYNC_FAILED:
            Serial.println(F("FAILED"));
            break;
    }

    Serial.print(F("Time Source: "));
    Serial.println(getTimeSource());

    Serial.print(F("Current Time: "));
    Serial.println(getISO8601());

    Serial.print(F("Unix Timestamp: "));
    Serial.println(getUnixTime());

    if (syncStatus == TIME_SYNCED) {
        unsigned long elapsed = (millis() - lastSyncTime) / 1000;
        Serial.print(F("Last Sync: "));
        Serial.print(elapsed);
        Serial.println(F(" seconds ago"));
    }

    Serial.println(F("=========================================\n"));
}

String TimeManager::getTimeSource() {
    switch (syncMode) {
        case TIME_SYNC_MQTT:
            return "MQTT";
        case TIME_SYNC_NTP:
            return "NTP";
        case TIME_SYNC_RTC:
            return "DS3231 RTC";
        default:
            return "None";
    }
}

// ========================================
// MQTT Topics
// ========================================

String TimeManager::getRequestTopic() {
    // Simple shared topic for all devices
    return "cek_waktu";
}

String TimeManager::getResponseTopic() {
    // Server responds to this topic
    return "cek_waktu/response";
}

// ========================================
// Private Helpers
// ========================================

void TimeManager::updateInternalRTC(unsigned long timestamp) {
    struct timeval tv;
    tv.tv_sec = timestamp;
    tv.tv_usec = 0;
    settimeofday(&tv, nullptr);

    Serial.print(F("[TimeManager] ESP32 internal RTC updated: "));
    Serial.println(timestamp);
}

unsigned long TimeManager::readDS3231() {
    DateTime now = rtc.now();
    return now.unixtime();
}

bool TimeManager::writeDS3231(unsigned long timestamp) {
    DateTime dt(timestamp);
    rtc.adjust(dt);

    Serial.print(F("[TimeManager] DS3231 RTC updated: "));
    Serial.println(timestamp);

    return true;
}

bool TimeManager::parseISO8601(const String& iso8601, struct tm* timeinfo) {
    // Parse ISO 8601: "2025-11-21T10:30:45Z"
    int year, month, day, hour, minute, second;

    int parsed = sscanf(iso8601.c_str(), "%d-%d-%dT%d:%d:%dZ",
                        &year, &month, &day, &hour, &minute, &second);

    if (parsed != 6) {
        return false;
    }

    timeinfo->tm_year = year - 1900;  // Years since 1900
    timeinfo->tm_mon = month - 1;     // Months since January (0-11)
    timeinfo->tm_mday = day;
    timeinfo->tm_hour = hour;
    timeinfo->tm_min = minute;
    timeinfo->tm_sec = second;
    timeinfo->tm_isdst = 0;

    return true;
}
