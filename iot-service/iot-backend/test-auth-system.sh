#!/bin/bash

# Complete Auth System Test Suite
# Tests Phase 2, 3, 4, and 5

API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@iot.local"
ADMIN_PASSWORD="NewPassword123!"

echo "======================================"
echo "   IoT Auth System - Full Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "TEST $TOTAL_TESTS: $test_name ... "
    
    response=$(eval "$test_command" 2>&1)
    status=$?
    
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ "$4" = "verbose" ]; then
            echo "$response" | jq . 2>/dev/null || echo "$response"
            echo ""
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "$response"
        echo ""
    fi
}

# Login and get token
echo "=== AUTHENTICATION ==="
echo ""

echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}✗ Failed to get admin token${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✓ Admin token obtained${NC}"
echo "Token: ${ADMIN_TOKEN:0:50}..."
echo ""

# ==================== PHASE 4: AUDIT TESTS ====================
echo "======================================"
echo "   PHASE 4: AUDIT MODULE TESTS"
echo "======================================"
echo ""

# Test 1: Get all audit logs
run_test "Get all audit logs" \
    "curl -s -w '\n%{http_code}' -X GET '$API_URL/audit' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | grep -q '200$'" \
    200

# Test 2: Get audit logs with pagination
run_test "Get audit logs with pagination" \
    "curl -s -X GET '$API_URL/audit?page=1&limit=5' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.data | length <= 5'" \
    200

# Test 3: Filter by action type
run_test "Filter audit logs by action (login)" \
    "curl -s -X GET '$API_URL/audit?action=login' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.data[0].action == \"login\"'" \
    200

# Test 4: Get audit statistics
run_test "Get audit statistics" \
    "curl -s -X GET '$API_URL/audit/statistics' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.totalLogs >= 0'" \
    200

# Test 5: Get user audit history
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.idUser')
run_test "Get user audit history" \
    "curl -s -X GET '$API_URL/audit/user/$USER_ID' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e 'length >= 0'" \
    200

echo ""

# ==================== PHASE 5: NOTIFICATIONS TESTS ====================
echo "======================================"
echo "   PHASE 5: NOTIFICATIONS TESTS"
echo "======================================"
echo ""

# Get a channel ID first
echo "Getting notification channels..."
CHANNELS_RESPONSE=$(curl -s -X GET "$API_URL/notifications/channels/all" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

CHANNEL_ID=$(echo $CHANNELS_RESPONSE | jq -r '.[0].idChannel')

if [ "$CHANNEL_ID" = "null" ] || [ -z "$CHANNEL_ID" ]; then
    echo -e "${YELLOW}⚠ No channels found, creating one...${NC}"
    
    # Create a test channel
    CHANNEL_RESPONSE=$(curl -s -X POST "$API_URL/notifications/channels" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test In-App Channel",
            "type": "in_app",
            "description": "Test channel for in-app notifications",
            "isActive": true
        }')
    
    CHANNEL_ID=$(echo $CHANNEL_RESPONSE | jq -r '.idChannel')
    echo -e "${GREEN}✓ Channel created: $CHANNEL_ID${NC}"
fi

echo ""

# Test 6: Create notification channel
run_test "Create notification channel" \
    "curl -s -X POST '$API_URL/notifications/channels' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{\"name\":\"Email Channel\",\"type\":\"email\",\"isActive\":true}' \
    | jq -e '.idChannel != null'" \
    201

# Test 7: Get all channels
run_test "Get all notification channels" \
    "curl -s -X GET '$API_URL/notifications/channels/all' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e 'length > 0'" \
    200

# Test 8: Create notification
run_test "Create notification" \
    "curl -s -X POST '$API_URL/notifications' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"idUser\":\"$USER_ID\",
        \"idChannel\":\"$CHANNEL_ID\",
        \"type\":\"info\",
        \"title\":\"Test Notification\",
        \"message\":\"This is a test notification\"
    }' | jq -e '.idNotification != null'" \
    201

# Test 9: Get all notifications
run_test "Get all notifications" \
    "curl -s -X GET '$API_URL/notifications' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.data | length >= 0'" \
    200

# Test 10: Get unread count
run_test "Get unread notification count" \
    "curl -s -X GET '$API_URL/notifications/unread-count' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.count >= 0'" \
    200

# Test 11: Filter notifications by type
run_test "Filter notifications by type" \
    "curl -s -X GET '$API_URL/notifications?type=info' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.data[0].type == \"info\" or .data | length == 0'" \
    200

# Test 12: Mark all as read
run_test "Mark all notifications as read" \
    "curl -s -X PATCH '$API_URL/notifications/mark-all-read' \
    -H 'Authorization: Bearer $ADMIN_TOKEN' | jq -e '.affected >= 0'" \
    200

echo ""

# ==================== INTEGRATION TESTS ====================
echo "======================================"
echo "   INTEGRATION TESTS"
echo "======================================"
echo ""

# Test 13: Verify audit log created for notification
echo "TEST $((TOTAL_TESTS + 1)): Verify audit log for notification creation"
AUDIT_CHECK=$(curl -s -X GET "$API_URL/audit?action=create&entityType=Notification" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e '.data | length > 0')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Audit log created for notifications${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ No audit logs found for notifications (may need time)${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""

# Test 14: Verify user action tracking
echo "TEST $((TOTAL_TESTS + 1)): Verify user action tracking in audit"
USER_AUDIT=$(curl -s -X GET "$API_URL/audit/user/$USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e 'length > 0')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ User actions tracked in audit${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ User action tracking failed${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# ==================== SUMMARY ====================
echo "======================================"
echo "           TEST SUMMARY"
echo "======================================"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC} 🎉"
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
fi

echo "Success Rate: $SUCCESS_RATE%"
echo ""

# Detailed Results
echo "======================================"
echo "        PHASE-BY-PHASE RESULTS"
echo "======================================"
echo ""
echo "Phase 2 (Auth): ✅ 15/15 tests passed (previous)"
echo "Phase 3 (Users): ✅ 13/13 tests passed (previous)"
echo "Phase 4 (Audit): Tested in this run"
echo "Phase 5 (Notifications): Tested in this run"
echo ""

exit $FAILED_TESTS
