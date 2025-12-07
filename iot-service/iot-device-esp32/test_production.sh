#!/bin/bash

# ============================================================================
# ESP32 IoT Device - Production Readiness Test Script
# ============================================================================
# This script monitors the device and checks production readiness criteria
# 
# Usage:
#   ./test_production.sh <device_id> <duration_hours>
#
# Example:
#   ./test_production.sh DEMO1-00D42390A994 168  # 7 days test
# ============================================================================

set -e

DEVICE_ID=${1:-"DEMO1-00D42390A994"}
DURATION_HOURS=${2:-168}  # Default 7 days
MQTT_BROKER=${MQTT_BROKER:-"109.105.194.174"}
MQTT_PORT=${MQTT_PORT:-8366}
MQTT_TOPIC=${MQTT_TOPIC:-"sensor"}
CHECK_INTERVAL=300  # 5 minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
UPTIME_CHECKS=0
MEMORY_WARNINGS=0
DISCONNECTS=0
PUBLISH_FAILURES=0
LAST_FREE_HEAP=0

LOG_FILE="production_test_${DEVICE_ID}_$(date +%Y%m%d_%H%M%S).log"

echo "============================================================================"
echo "ESP32 Production Readiness Test"
echo "============================================================================"
echo "Device ID: $DEVICE_ID"
echo "Duration: $DURATION_HOURS hours ($(($DURATION_HOURS / 24)) days)"
echo "Check Interval: ${CHECK_INTERVAL}s"
echo "MQTT Broker: $MQTT_BROKER:$MQTT_PORT"
echo "MQTT Topic: $MQTT_TOPIC"
echo "Log File: $LOG_FILE"
echo "============================================================================"
echo ""

# Check if mosquitto_sub is installed
if ! command -v mosquitto_sub &> /dev/null; then
    echo -e "${RED}ERROR: mosquitto_sub not found. Please install mosquitto-clients${NC}"
    echo "  macOS: brew install mosquitto"
    echo "  Linux: sudo apt-get install mosquitto-clients"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq not found. Please install jq${NC}"
    echo "  macOS: brew install jq"
    echo "  Linux: sudo apt-get install jq"
    exit 1
fi

echo "Starting monitoring... Press Ctrl+C to stop"
echo ""

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_HOURS * 3600))

# Function to check device status
check_device_status() {
    local TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Subscribe to telemetry topic with timeout
    local TELEMETRY=$(timeout 10 mosquitto_sub -h $MQTT_BROKER -p $MQTT_PORT \
        -t "${MQTT_TOPIC}/${DEVICE_ID}/telemetry" -C 1 2>/dev/null || echo "{}")
    
    if [ "$TELEMETRY" = "{}" ] || [ -z "$TELEMETRY" ]; then
        echo -e "${RED}[${TIMESTAMP}] ❌ Device offline or no data received${NC}" | tee -a "$LOG_FILE"
        DISCONNECTS=$((DISCONNECTS + 1))
        return 1
    fi
    
    # Parse JSON
    local UPTIME=$(echo "$TELEMETRY" | jq -r '.node.uptime_s // 0')
    local FREE_HEAP=$(echo "$TELEMETRY" | jq -r '.node.free_heap // 0')
    local LTE_IP=$(echo "$TELEMETRY" | jq -r '.node.lte.ip // "N/A"')
    local CSQ=$(echo "$TELEMETRY" | jq -r '.node.lte.csq // 0')
    local STATE=$(echo "$TELEMETRY" | jq -r '.node.connection.state // "UNKNOWN"')
    local LTE_RECONNECTS=$(echo "$TELEMETRY" | jq -r '.node.connection.lte_reconnects // 0')
    local MQTT_RECONNECTS=$(echo "$TELEMETRY" | jq -r '.node.connection.mqtt_reconnects // 0')
    local PUBLISH_FAIL=$(echo "$TELEMETRY" | jq -r '.node.connection.publish_fail // 0')
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    # Check memory
    local MEM_STATUS="${GREEN}OK${NC}"
    if [ $FREE_HEAP -lt 150000 ]; then
        MEM_STATUS="${RED}CRITICAL${NC}"
        MEMORY_WARNINGS=$((MEMORY_WARNINGS + 1))
    elif [ $FREE_HEAP -lt 200000 ]; then
        MEM_STATUS="${YELLOW}LOW${NC}"
        MEMORY_WARNINGS=$((MEMORY_WARNINGS + 1))
    fi
    
    # Check signal quality
    local CSQ_STATUS="${GREEN}GOOD${NC}"
    if [ $CSQ -lt 10 ]; then
        CSQ_STATUS="${RED}POOR${NC}"
    elif [ $CSQ -lt 15 ]; then
        CSQ_STATUS="${YELLOW}FAIR${NC}"
    fi
    
    # Check connection state
    local CONN_STATUS="${GREEN}${STATE}${NC}"
    if [ "$STATE" != "FULLY_CONNECTED" ]; then
        CONN_STATUS="${YELLOW}${STATE}${NC}"
    fi
    
    # Memory leak detection
    local MEM_TREND=""
    if [ $LAST_FREE_HEAP -gt 0 ]; then
        local MEM_DIFF=$((FREE_HEAP - LAST_FREE_HEAP))
        if [ $MEM_DIFF -lt -10000 ]; then
            MEM_TREND=" ${RED}(↓ $(($MEM_DIFF / 1024))KB)${NC}"
        elif [ $MEM_DIFF -lt 0 ]; then
            MEM_TREND=" ${YELLOW}(↓ $(($MEM_DIFF / 1024))KB)${NC}"
        fi
    fi
    LAST_FREE_HEAP=$FREE_HEAP
    
    # Print status
    printf "[%s] ✅ " "$TIMESTAMP"
    printf "Uptime: %dd %dh | " $((UPTIME / 86400)) $(((UPTIME % 86400) / 3600))
    printf "Heap: %dKB %b | " $((FREE_HEAP / 1024)) "$MEM_STATUS"
    printf "CSQ: %d %b | " $CSQ "$CSQ_STATUS"
    printf "State: %b" "$CONN_STATUS"
    printf "%b\n" "$MEM_TREND"
    
    # Log to file
    echo "[$TIMESTAMP] Uptime=${UPTIME}s, FreeHeap=${FREE_HEAP}, CSQ=${CSQ}, State=${STATE}, LTE_Reconnects=${LTE_RECONNECTS}, MQTT_Reconnects=${MQTT_RECONNECTS}, PublishFail=${PUBLISH_FAIL}" >> "$LOG_FILE"
    
    # Update counters
    if [ $UPTIME -gt 3600 ]; then
        UPTIME_CHECKS=$((UPTIME_CHECKS + 1))
    fi
    
    PUBLISH_FAILURES=$PUBLISH_FAIL
    
    return 0
}

# Function to print summary
print_summary() {
    echo ""
    echo "============================================================================"
    echo "TEST SUMMARY"
    echo "============================================================================"
    
    local RUNTIME=$(($(date +%s) - START_TIME))
    local RUNTIME_HOURS=$((RUNTIME / 3600))
    local RUNTIME_DAYS=$((RUNTIME_HOURS / 24))
    
    echo "Runtime: ${RUNTIME_HOURS}h (${RUNTIME_DAYS}d)"
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Successful Checks: $((TOTAL_CHECKS - DISCONNECTS))"
    echo "Disconnects Detected: $DISCONNECTS"
    echo "Memory Warnings: $MEMORY_WARNINGS"
    echo "Publish Failures: $PUBLISH_FAILURES"
    
    if [ $TOTAL_CHECKS -gt 0 ]; then
        local SUCCESS_RATE=$((100 * (TOTAL_CHECKS - DISCONNECTS) / TOTAL_CHECKS))
        echo "Success Rate: ${SUCCESS_RATE}%"
        
        echo ""
        echo "PRODUCTION READINESS CRITERIA:"
        echo "============================================================================"
        
        # Check uptime requirement (>99%)
        if [ $SUCCESS_RATE -ge 99 ]; then
            echo -e "${GREEN}✅${NC} Uptime > 99%: PASS (${SUCCESS_RATE}%)"
        else
            echo -e "${RED}❌${NC} Uptime > 99%: FAIL (${SUCCESS_RATE}%)"
        fi
        
        # Check memory leak (max 3 warnings for long test)
        if [ $MEMORY_WARNINGS -le 3 ]; then
            echo -e "${GREEN}✅${NC} Memory Stable: PASS (${MEMORY_WARNINGS} warnings)"
        else
            echo -e "${RED}❌${NC} Memory Stable: FAIL (${MEMORY_WARNINGS} warnings)"
        fi
        
        # Check disconnects (max 1% of checks)
        local MAX_DISCONNECTS=$((TOTAL_CHECKS / 100))
        if [ $DISCONNECTS -le $MAX_DISCONNECTS ]; then
            echo -e "${GREEN}✅${NC} Auto Recovery: PASS (${DISCONNECTS} disconnects)"
        else
            echo -e "${RED}❌${NC} Auto Recovery: FAIL (${DISCONNECTS} disconnects)"
        fi
        
        echo ""
        if [ $SUCCESS_RATE -ge 99 ] && [ $MEMORY_WARNINGS -le 3 ] && [ $DISCONNECTS -le $MAX_DISCONNECTS ]; then
            echo -e "${GREEN}🎉 DEVICE IS PRODUCTION READY!${NC}"
        else
            echo -e "${YELLOW}⚠️  DEVICE NEEDS MORE TESTING OR FIXES${NC}"
        fi
    fi
    
    echo "============================================================================"
    echo "Full log saved to: $LOG_FILE"
    echo "============================================================================"
}

# Trap Ctrl+C to show summary
trap print_summary EXIT

# Main monitoring loop
while [ $(date +%s) -lt $END_TIME ]; do
    check_device_status
    
    # Show progress
    local ELAPSED=$(($(date +%s) - START_TIME))
    local REMAINING=$((END_TIME - $(date +%s)))
    local PROGRESS=$((100 * ELAPSED / (DURATION_HOURS * 3600)))
    
    echo "Progress: ${PROGRESS}% | Remaining: $((REMAINING / 3600))h $((REMAINING % 3600 / 60))m"
    echo ""
    
    sleep $CHECK_INTERVAL
done

echo ""
echo -e "${GREEN}Test completed!${NC}"
