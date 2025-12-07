#ifndef DATA_BUFFER_H
#define DATA_BUFFER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

// ============================================================================
// DATA BUFFER - In-Memory Queue for Telemetry Data
// ============================================================================
// Purpose: Decouple sensor reading from network transmission
// - Sensors write to buffer (always, regardless of network)
// - Network service reads from buffer (when connected)
// - SD card is backup when buffer full or ESP restart
// ============================================================================

// Buffer configuration
#define DATA_BUFFER_SIZE        50      // Max telemetry records in memory (RAM)
#define DATA_BUFFER_FALLBACK_SD true    // Save to SD when buffer full

// Data buffer item structure
struct TelemetryBuffer {
    String timestamp;           // ISO8601 timestamp
    String json;                // Telemetry JSON string
    uint32_t attempt;           // Send attempt counter
    bool sentToSD;              // Saved to SD as backup
};

// ============================================================================
// DataBuffer Class - Ring Buffer for Telemetry
// ============================================================================
class DataBuffer {
private:
    std::vector<TelemetryBuffer> buffer;
    size_t maxSize;
    uint32_t totalAdded;
    uint32_t totalSent;
    uint32_t totalDropped;
    bool sdFallbackEnabled;

public:
    DataBuffer(size_t size = DATA_BUFFER_SIZE);
    
    // Add telemetry to buffer
    // Returns: true if added, false if buffer full
    bool add(const String& json, const String& timestamp = "");
    
    // Get oldest item (FIFO)
    // Returns: true if item available, false if empty
    bool getOldest(TelemetryBuffer& item);
    
    // Remove oldest item after successful send
    void removeOldest();
    
    // Check if buffer has data
    bool hasData() const;
    
    // Get buffer statistics
    size_t size() const;           // Current items in buffer
    size_t available() const;       // Available slots
    size_t capacity() const;        // Max capacity
    bool isFull() const;
    bool isEmpty() const;
    
    // Get counters
    uint32_t getTotalAdded() const { return totalAdded; }
    uint32_t getTotalSent() const { return totalSent; }
    uint32_t getTotalDropped() const { return totalDropped; }
    
    // Clear all data (use with caution)
    void clear();
    
    // Increment sent counter
    void markAsSent() { totalSent++; }
    
    // Debug: Print buffer status
    void printStatus() const;
};

// Global instance (declared in data_buffer.cpp)
extern DataBuffer dataBuffer;

#endif // DATA_BUFFER_H
