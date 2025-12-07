#include "data_buffer.h"
#include "config.h"

// ============================================================================
// DataBuffer Implementation
// ============================================================================

// Constructor
DataBuffer::DataBuffer(size_t size) 
    : maxSize(size)
    , totalAdded(0)
    , totalSent(0)
    , totalDropped(0)
    , sdFallbackEnabled(DATA_BUFFER_FALLBACK_SD) {
    buffer.reserve(size);
}

// Add telemetry to buffer
bool DataBuffer::add(const String& json, const String& timestamp) {
    // Check if buffer is full
    if (buffer.size() >= maxSize) {
        #if DEBUG_SENSORS
        Serial.println("[BUFFER] Buffer full! Data will be saved to SD if available.");
        #endif
        totalDropped++;
        return false;  // Buffer full - caller should save to SD
    }
    
    // Create buffer item
    TelemetryBuffer item;
    item.json = json;
    item.timestamp = timestamp.isEmpty() ? String(millis()) : timestamp;
    item.attempt = 0;
    item.sentToSD = false;
    
    // Add to buffer
    buffer.push_back(item);
    totalAdded++;
    
    #if DEBUG_SENSORS
    Serial.printf("[BUFFER] Added item #%u (size: %d/%d)\n", 
                  totalAdded, buffer.size(), maxSize);
    #endif
    
    return true;
}

// Get oldest item (FIFO)
bool DataBuffer::getOldest(TelemetryBuffer& item) {
    if (buffer.empty()) {
        return false;
    }
    
    item = buffer.front();
    return true;
}

// Remove oldest item
void DataBuffer::removeOldest() {
    if (!buffer.empty()) {
        buffer.erase(buffer.begin());
        
        #if DEBUG_SENSORS
        Serial.printf("[BUFFER] Removed oldest (remaining: %d)\n", buffer.size());
        #endif
    }
}

// Check if buffer has data
bool DataBuffer::hasData() const {
    return !buffer.empty();
}

// Get current size
size_t DataBuffer::size() const {
    return buffer.size();
}

// Get available slots
size_t DataBuffer::available() const {
    return maxSize - buffer.size();
}

// Get capacity
size_t DataBuffer::capacity() const {
    return maxSize;
}

// Check if full
bool DataBuffer::isFull() const {
    return buffer.size() >= maxSize;
}

// Check if empty
bool DataBuffer::isEmpty() const {
    return buffer.empty();
}

// Clear buffer
void DataBuffer::clear() {
    buffer.clear();
    
    #if DEBUG_SENSORS
    Serial.println("[BUFFER] Cleared all data");
    #endif
}

// Print buffer status
void DataBuffer::printStatus() const {
    Serial.println("\n========== DATA BUFFER STATUS ==========");
    Serial.printf("Current size: %d / %d\n", buffer.size(), maxSize);
    Serial.printf("Available:    %d slots\n", available());
    Serial.printf("Status:       %s\n", isFull() ? "FULL" : (isEmpty() ? "EMPTY" : "ACTIVE"));
    Serial.println("----------------------------------------");
    Serial.printf("Total added:   %u\n", totalAdded);
    Serial.printf("Total sent:    %u\n", totalSent);
    Serial.printf("Total dropped: %u\n", totalDropped);
    Serial.println("========================================\n");
}

// Global instance
DataBuffer dataBuffer(DATA_BUFFER_SIZE);
