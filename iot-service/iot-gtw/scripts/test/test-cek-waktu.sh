#!/bin/bash

# Test script for cek_waktu MQTT topic
# This script tests the ping/pong functionality with Indonesia timestamp

echo "🧪 Testing cek_waktu MQTT Topic"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# MQTT Configuration
BROKER_HOST=${MQTT_BROKER_HOST:-"localhost"}
BROKER_PORT=${MQTT_BROKER_PORT:-1883}

echo -e "${BLUE}📡 MQTT Broker: ${BROKER_HOST}:${BROKER_PORT}${NC}"
echo ""

# Check if mosquitto clients are installed
if ! command -v mosquitto_pub &> /dev/null; then
    echo "❌ mosquitto_pub not found. Please install mosquitto-clients:"
    echo "   brew install mosquitto  # macOS"
    echo "   apt install mosquitto-clients  # Ubuntu/Debian"
    exit 1
fi

echo -e "${GREEN}✅ mosquitto clients found${NC}"
echo ""

# Function to test ping
test_ping() {
    local test_name=$1
    local message=$2
    
    echo -e "${YELLOW}Test: ${test_name}${NC}"
    echo "Request: ${message}"
    
    # Subscribe to response in background
    timeout 3 mosquitto_sub -h ${BROKER_HOST} -p ${BROKER_PORT} -t "cek_waktu/response" -C 1 > /tmp/cek_waktu_response.txt 2>&1 &
    local sub_pid=$!
    
    # Wait a bit for subscription to establish
    sleep 0.5
    
    # Publish request
    mosquitto_pub -h ${BROKER_HOST} -p ${BROKER_PORT} -t "cek_waktu" -m "${message}"
    
    # Wait for response
    sleep 2
    
    # Check response
    if [ -f /tmp/cek_waktu_response.txt ]; then
        echo -e "${GREEN}Response:${NC}"
        cat /tmp/cek_waktu_response.txt | jq '.' 2>/dev/null || cat /tmp/cek_waktu_response.txt
        rm /tmp/cek_waktu_response.txt
    else
        echo "❌ No response received"
    fi
    
    echo ""
    echo "---"
    echo ""
}

# Test 1: Plain text ping
test_ping "Plain Text Ping" "ping"

# Test 2: Empty message
test_ping "Empty Message" ""

# Test 3: JSON request
test_ping "JSON Request" '{"device_id":"ESP32-001","action":"time_sync"}'

# Test 4: JSON with timestamp
current_unix=$(date +%s)
test_ping "JSON with Timestamp" "{\"device_id\":\"ESP32-001\",\"sent_at\":${current_unix},\"action\":\"latency_check\"}"

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "💡 Tips:"
echo "   - Check gateway logs for detailed processing info"
echo "   - Response published to 'cek_waktu/response' topic"
echo "   - Server time in Indonesia timezone (UTC+7)"
echo ""
echo "🔍 Monitor response continuously:"
echo "   mosquitto_sub -h ${BROKER_HOST} -t 'cek_waktu/response' -v"
echo ""
