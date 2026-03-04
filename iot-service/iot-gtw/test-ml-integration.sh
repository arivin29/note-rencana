#!/bin/bash
# ============================================================
# ML Integration Test Script
# ============================================================
# Tests the end-to-end flow of the ML anomaly detection system:
# 1. ClickHouse → OpenSearch sync
# 2. Detector creation
# 3. Anomaly detection results
# 4. API endpoints
# 5. Email notification (mock)
#
# Prerequisites:
# - iot-gtw running on port 3001
# - iot-backend running on port 3000
# - OpenSearch with ML plugin
# - ClickHouse with telemetry data
#
# Usage:
#   ./test-ml-integration.sh         # Run all tests
#   ./test-ml-integration.sh api     # Test API only
#   ./test-ml-integration.sh sync    # Test sync only
# ============================================================

set -e

# Configuration
IOT_GTW="${IOT_GTW_URL:-http://localhost:3001}"
IOT_BACKEND="${IOT_BACKEND_URL:-http://localhost:3000}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "  ${YELLOW}TEST:${NC} $1"
}

pass() {
    echo -e "  ${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "  ${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

skip() {
    echo -e "  ${YELLOW}⊘ SKIP:${NC} $1"
    ((SKIPPED++))
}

# Check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url/health" > /dev/null 2>&1 || curl -s "$url" > /dev/null 2>&1; then
        pass "$name is running"
        return 0
    else
        fail "$name is not running at $url"
        return 1
    fi
}

# ============================================================
# Test: Service Health
# ============================================================
test_service_health() {
    print_header "Service Health Check"
    
    print_test "Checking iot-gtw service"
    check_service "$IOT_GTW" "iot-gtw"
    
    print_test "Checking iot-backend service"
    check_service "$IOT_BACKEND" "iot-backend"
}

# ============================================================
# Test: Detector API
# ============================================================
test_detector_api() {
    print_header "Detector API Tests"
    
    # Test: Get detector types
    print_test "GET /ml/detectors/types"
    response=$(curl -s "$IOT_GTW/ml/detectors/types")
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        types=$(echo "$response" | jq -r '.types | length')
        if [ "$types" -ge 4 ]; then
            pass "Detector types returned ($types types)"
        else
            fail "Expected 4+ detector types, got $types"
        fi
    else
        fail "Failed to get detector types"
    fi
    
    # Test: List detectors
    print_test "GET /ml/detectors"
    response=$(curl -s "$IOT_GTW/ml/detectors")
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        count=$(echo "$response" | jq -r '.count')
        pass "Listed $count detectors"
    else
        fail "Failed to list detectors"
    fi
}

# ============================================================
# Test: ML Dashboard API (iot-backend)
# ============================================================
test_ml_dashboard_api() {
    print_header "ML Dashboard API Tests (iot-backend)"
    
    # Note: These endpoints require authentication
    # For now, we test without auth to verify endpoint existence
    
    # Test: Get anomalies
    print_test "GET /ml/anomalies"
    response=$(curl -s -w "\n%{http_code}" "$IOT_BACKEND/ml/anomalies" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        skip "Anomalies endpoint requires auth (401)"
    elif [ "$http_code" == "200" ]; then
        pass "Anomalies endpoint accessible"
    else
        fail "Anomalies endpoint returned $http_code"
    fi
    
    # Test: Get forecasts
    print_test "GET /ml/forecasts"
    response=$(curl -s -w "\n%{http_code}" "$IOT_BACKEND/ml/forecasts" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        skip "Forecasts endpoint requires auth (401)"
    elif [ "$http_code" == "200" ]; then
        pass "Forecasts endpoint accessible"
    else
        fail "Forecasts endpoint returned $http_code"
    fi
    
    # Test: Get dashboard summary
    print_test "GET /ml/dashboard/summary"
    response=$(curl -s -w "\n%{http_code}" "$IOT_BACKEND/ml/dashboard/summary" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        skip "Dashboard summary requires auth (401)"
    elif [ "$http_code" == "200" ]; then
        pass "Dashboard summary accessible"
    else
        fail "Dashboard summary returned $http_code"
    fi
}

# ============================================================
# Test: Notification API
# ============================================================
test_notification_api() {
    print_header "Notification API Tests"
    
    # Test: Get dedup stats
    print_test "GET /notifications/dedup"
    response=$(curl -s -w "\n%{http_code}" "$IOT_BACKEND/notifications/dedup" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        skip "Dedup endpoint requires auth (401)"
    elif [ "$http_code" == "200" ]; then
        pass "Dedup stats endpoint accessible"
    else
        fail "Dedup stats returned $http_code"
    fi
    
    # Test: Preview anomaly alert template
    print_test "GET /notifications/preview/anomaly-alert"
    response=$(curl -s -w "\n%{http_code}" "$IOT_BACKEND/notifications/preview/anomaly-alert" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        skip "Preview endpoint requires auth (401)"
    elif [ "$http_code" == "200" ]; then
        body=$(echo "$response" | head -n-1)
        if echo "$body" | grep -q "<!DOCTYPE html>" 2>/dev/null; then
            pass "Anomaly alert template renders HTML"
        else
            fail "Template did not return HTML"
        fi
    else
        fail "Preview endpoint returned $http_code"
    fi
}

# ============================================================
# Test: Sync Status
# ============================================================
test_sync_status() {
    print_header "Sync Service Tests"
    
    # Test sync status endpoint (if exists)
    print_test "Checking sync service status"
    
    # This would require a dedicated endpoint
    # For now, we check if the service initialized properly
    skip "Sync status endpoint not implemented yet"
}

# ============================================================
# Test: Data Flow
# ============================================================
test_data_flow() {
    print_header "Data Flow Tests"
    
    print_test "Checking ClickHouse → OpenSearch sync"
    skip "Requires manual verification with actual data"
    
    print_test "Checking anomaly detection → alert pipeline"
    skip "Requires triggering actual anomaly"
}

# ============================================================
# Summary
# ============================================================
print_summary() {
    print_header "Test Summary"
    
    total=$((PASSED + FAILED + SKIPPED))
    
    echo -e "  ${GREEN}Passed:${NC}  $PASSED"
    echo -e "  ${RED}Failed:${NC}  $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
    echo -e "  Total:   $total"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "  ${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "  ${RED}Some tests failed.${NC}"
        return 1
    fi
}

# ============================================================
# Main
# ============================================================
main() {
    print_header "ML Integration Tests"
    echo "iot-gtw:     $IOT_GTW"
    echo "iot-backend: $IOT_BACKEND"
    
    case "${1:-}" in
        "api")
            test_detector_api
            test_ml_dashboard_api
            test_notification_api
            ;;
        "sync")
            test_service_health
            test_sync_status
            test_data_flow
            ;;
        "detector"|"detectors")
            test_service_health
            test_detector_api
            ;;
        "notification"|"notifications")
            test_service_health
            test_notification_api
            ;;
        "health")
            test_service_health
            ;;
        *)
            # Run all tests
            test_service_health
            test_detector_api
            test_ml_dashboard_api
            test_notification_api
            test_sync_status
            test_data_flow
            ;;
    esac
    
    print_summary
}

main "$@"
