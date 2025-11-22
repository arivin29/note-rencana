#!/bin/bash

# ========================================
# Test Device Commands API
# ========================================

API_URL="http://localhost:3000/api/device-commands"
DEVICE_ID="A1B2C3D4E5F6"

echo "=========================================="
echo "Testing Device Commands API"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Check MQTT Status
echo -e "${BLUE}Test 1: Check MQTT Status${NC}"
echo "GET $API_URL/status"
echo ""
curl -s "$API_URL/status" | jq .
echo ""
echo ""

# Test 2: Turn ON Relay 1
echo -e "${BLUE}Test 2: Turn ON Relay 1${NC}"
echo "POST $API_URL/relay"
echo ""
curl -s -X POST "$API_URL/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"action\": \"on\",
    \"target\": \"out1\"
  }" | jq .
echo ""
echo ""

# Test 3: Turn OFF Relay 1
echo -e "${BLUE}Test 3: Turn OFF Relay 1${NC}"
echo "POST $API_URL/relay"
echo ""
curl -s -X POST "$API_URL/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"action\": \"off\",
    \"target\": \"out1\"
  }" | jq .
echo ""
echo ""

# Test 4: Pulse Relay 2 (5 seconds)
echo -e "${BLUE}Test 4: Pulse Relay 2 (5 seconds)${NC}"
echo "POST $API_URL/relay"
echo ""
curl -s -X POST "$API_URL/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"action\": \"pulse\",
    \"target\": \"out2\",
    \"duration\": 5000
  }" | jq .
echo ""
echo ""

# Test 5: Invalid action (should fail)
echo -e "${BLUE}Test 5: Invalid Action (Expected to Fail)${NC}"
echo "POST $API_URL/relay"
echo ""
curl -s -X POST "$API_URL/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"action\": \"invalid\",
    \"target\": \"out1\"
  }" | jq .
echo ""
echo ""

# Test 6: Missing duration for pulse (should fail)
echo -e "${BLUE}Test 6: Missing Duration for Pulse (Expected to Fail)${NC}"
echo "POST $API_URL/relay"
echo ""
curl -s -X POST "$API_URL/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"action\": \"pulse\",
    \"target\": \"out1\"
  }" | jq .
echo ""
echo ""

echo "=========================================="
echo -e "${GREEN}Tests completed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check backend logs: npm run start:dev (in iot-backend)"
echo "2. Monitor MQTT: mosquitto_sub -h 109.105.194.174 -p 8366 -t 'sensor/#' -v"
echo "3. Check iot-gtw logs for event acknowledgments"
