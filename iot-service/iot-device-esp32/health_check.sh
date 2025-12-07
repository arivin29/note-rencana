#!/bin/bash

# Quick Device Health Check
# Simple script to verify device is working before running full tests

DEVICE_ID="DEMO1-00D42390A994"
BROKER="109.105.194.174"
PORT="8366"
TOPIC="sensor"

echo "============================================================================"
echo "🏥 ESP32 Device Health Check"
echo "============================================================================"
echo "Device: $DEVICE_ID"
echo "Broker: $BROKER:$PORT"
echo "Topic: $TOPIC"
echo "============================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣  Checking MQTT broker connectivity..."
if timeout 5 mosquitto_sub -h $BROKER -p $PORT -t "\$SYS/#" -C 1 &>/dev/null; then
    echo -e "${GREEN}✅ MQTT broker is reachable${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot reach broker (might need auth or broker is down)${NC}"
fi
echo ""

echo "2️⃣  Listening for device telemetry (30 seconds)..."
echo "   Waiting for messages on: $TOPIC/${DEVICE_ID}/telemetry"
echo "   Press Ctrl+C to stop early"
echo ""

# Use gtimeout on macOS if available, otherwise use perl
if command -v gtimeout &>/dev/null; then
    TELEMETRY=$(gtimeout 30 mosquitto_sub -h $BROKER -p $PORT -t "$TOPIC/${DEVICE_ID}/telemetry" -C 1 2>&1)
else
    TELEMETRY=$(perl -e 'alarm 30; exec @ARGV' mosquitto_sub -h $BROKER -p $PORT -t "$TOPIC/${DEVICE_ID}/telemetry" -C 1 2>&1 || echo "Timed out")
fi

if [ -n "$TELEMETRY" ] && [ "$TELEMETRY" != "Timed out" ]; then
    echo -e "${GREEN}✅ Device is publishing!${NC}"
    echo ""
    echo "📊 Latest telemetry:"
    echo "$TELEMETRY" | jq '.' 2>/dev/null || echo "$TELEMETRY"
    echo ""
    
    # Extract key metrics
    if command -v jq &>/dev/null; then
        echo "📈 Key Metrics:"
        FREE_HEAP=$(echo "$TELEMETRY" | jq -r '.node.free_heap // "N/A"')
        UPTIME=$(echo "$TELEMETRY" | jq -r '.node.uptime_s // "N/A"')
        CSQ=$(echo "$TELEMETRY" | jq -r '.node.lte.csq // "N/A"')
        STATE=$(echo "$TELEMETRY" | jq -r '.node.connection.state // "N/A"')
        
        echo "   Free Heap: $FREE_HEAP bytes ($(($FREE_HEAP / 1024)) KB)"
        echo "   Uptime: $UPTIME seconds ($((UPTIME / 3600)) hours)"
        echo "   Signal: CSQ $CSQ"
        echo "   State: $STATE"
        echo ""
        
        # Health assessment
        ISSUES=0
        
        if [ "$FREE_HEAP" != "N/A" ] && [ $FREE_HEAP -lt 200000 ]; then
            echo -e "${YELLOW}⚠️  Low memory: ${FREE_HEAP} bytes${NC}"
            ISSUES=$((ISSUES + 1))
        fi
        
        if [ "$CSQ" != "N/A" ] && [ $CSQ -lt 10 ]; then
            echo -e "${YELLOW}⚠️  Poor signal: CSQ ${CSQ}${NC}"
            ISSUES=$((ISSUES + 1))
        fi
        
        if [ "$STATE" != "FULLY_CONNECTED" ] && [ "$STATE" != "N/A" ]; then
            echo -e "${YELLOW}⚠️  Not fully connected: ${STATE}${NC}"
            ISSUES=$((ISSUES + 1))
        fi
        
        if [ $ISSUES -eq 0 ]; then
            echo -e "${GREEN}✅ All metrics look good!${NC}"
        fi
    fi
    
    echo ""
    echo "============================================================================"
    echo -e "${GREEN}✅ DEVICE IS HEALTHY - Ready for stability testing${NC}"
    echo "============================================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Run 4-hour test: ./test_production.sh $DEVICE_ID 4"
    echo "  2. Or run 7-day test: ./test_production.sh $DEVICE_ID 168"
    echo ""
    
else
    echo -e "${RED}❌ No telemetry received in 30 seconds${NC}"
    echo ""
    echo "Possible issues:"
    echo "  - Device is offline or not publishing"
    echo "  - Wrong topic or device ID"
    echo "  - Network/firewall blocking connection"
    echo "  - MQTT broker requires authentication"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check device serial output: pio device monitor --baud 115200"
    echo "  2. Verify device is powered on and connected"
    echo "  3. Check MQTT broker is accessible from your network"
    echo "  4. Try manual subscribe: mosquitto_sub -h $BROKER -p $PORT -t '$TOPIC/#' -v"
    echo ""
fi

echo "============================================================================"
