#!/bin/bash
# ============================================================
# OpenSearch ML Detector Bootstrap Script
# ============================================================
# This script creates and starts all anomaly detection detectors
# for the PDAM IoT sensor monitoring system.
#
# Prerequisites:
# - iot-gtw service running on port 3001
# - OpenSearch ML plugin enabled
# - Sensor telemetry data indexed (optional, for training)
#
# Usage:
#   ./setup-detectors.sh             # Create and start all
#   ./setup-detectors.sh create      # Create only
#   ./setup-detectors.sh start       # Start only
#   ./setup-detectors.sh status      # Check status
#   ./setup-detectors.sh delete      # Delete all
# ============================================================

set -e

# Configuration
API_BASE="${IOT_GTW_URL:-http://localhost:3001}"
DETECTOR_ENDPOINT="$API_BASE/ml/detectors"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# Check if API is available
check_api() {
    print_header "Checking API availability"
    
    if curl -s "$API_BASE/health" > /dev/null 2>&1 || curl -s "$DETECTOR_ENDPOINT/types" > /dev/null 2>&1; then
        print_success "API is available at $API_BASE"
        return 0
    else
        print_error "API not available at $API_BASE"
        print_warning "Make sure iot-gtw is running: npm run start:dev"
        return 1
    fi
}

# Get available detector types
get_types() {
    print_header "Available Detector Types"
    
    response=$(curl -s "$DETECTOR_ENDPOINT/types")
    echo "$response" | jq -r '.types[]' 2>/dev/null || echo "$response"
}

# List all detectors
list_detectors() {
    print_header "Current Detectors"
    
    response=$(curl -s "$DETECTOR_ENDPOINT")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        count=$(echo "$response" | jq -r '.count')
        echo -e "Total detectors: $count\n"
        
        if [ "$count" -gt 0 ]; then
            echo "$response" | jq -r '.detectors[] | "ID: \(.id)\nName: \(.name)\nMetric: \(.metricCode)\nState: \(.state)\n---"'
        fi
    else
        print_error "Failed to list detectors"
        echo "$response"
    fi
}

# Create all detectors
create_all() {
    print_header "Creating All Detectors"
    
    response=$(curl -s -X POST "$DETECTOR_ENDPOINT/all/create")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        created=$(echo "$response" | jq -r '.created | length')
        failed=$(echo "$response" | jq -r '.failed | length')
        
        print_success "Created: $created"
        [ "$failed" -gt 0 ] && print_warning "Failed: $failed"
        
        echo -e "\nCreated detectors:"
        echo "$response" | jq -r '.created[]' 2>/dev/null
    else
        print_error "Failed to create detectors"
        echo "$response"
    fi
}

# Create specific detector
create_detector() {
    local metric=$1
    print_header "Creating Detector: $metric"
    
    response=$(curl -s -X POST "$DETECTOR_ENDPOINT/$metric")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        id=$(echo "$response" | jq -r '.detectorId')
        name=$(echo "$response" | jq -r '.detectorName')
        print_success "Created detector: $name (ID: $id)"
    else
        print_error "Failed to create detector"
        echo "$response"
    fi
}

# Start all detectors
start_all() {
    print_header "Starting All Detectors"
    
    response=$(curl -s -X POST "$DETECTOR_ENDPOINT/all/start")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        started=$(echo "$response" | jq -r '.started | length')
        failed=$(echo "$response" | jq -r '.failed | length')
        
        print_success "Started: $started"
        [ "$failed" -gt 0 ] && print_warning "Failed: $failed"
        
        echo -e "\nStarted detectors:"
        echo "$response" | jq -r '.started[]' 2>/dev/null
    else
        print_error "Failed to start detectors"
        echo "$response"
    fi
}

# Start specific detector
start_detector() {
    local id=$1
    print_header "Starting Detector: $id"
    
    response=$(curl -s -X POST "$DETECTOR_ENDPOINT/$id/start")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        print_success "Detector started"
    else
        print_error "Failed to start detector"
        echo "$response"
    fi
}

# Stop specific detector
stop_detector() {
    local id=$1
    print_header "Stopping Detector: $id"
    
    response=$(curl -s -X POST "$DETECTOR_ENDPOINT/$id/stop")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        print_success "Detector stopped"
    else
        print_error "Failed to stop detector"
        echo "$response"
    fi
}

# Delete specific detector
delete_detector() {
    local id=$1
    print_header "Deleting Detector: $id"
    
    response=$(curl -s -X DELETE "$DETECTOR_ENDPOINT/$id")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        print_success "Detector deleted"
    else
        print_error "Failed to delete detector"
        echo "$response"
    fi
}

# Delete all detectors
delete_all() {
    print_header "Deleting All Detectors"
    
    # Get all detector IDs
    detectors=$(curl -s "$DETECTOR_ENDPOINT" | jq -r '.detectors[].id')
    
    if [ -z "$detectors" ]; then
        print_warning "No detectors to delete"
        return
    fi
    
    for id in $detectors; do
        response=$(curl -s -X DELETE "$DETECTOR_ENDPOINT/$id")
        if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
            print_success "Deleted: $id"
        else
            print_error "Failed to delete: $id"
        fi
    done
}

# Get detector results
get_results() {
    local id=$1
    print_header "Getting Results for Detector: $id"
    
    response=$(curl -s "$DETECTOR_ENDPOINT/$id/results")
    
    if [ "$(echo "$response" | jq -r '.success')" == "true" ]; then
        count=$(echo "$response" | jq -r '.count')
        echo -e "Results found: $count\n"
        echo "$response" | jq '.results[:5]' 2>/dev/null
    else
        print_error "Failed to get results"
        echo "$response"
    fi
}

# Full setup: create and start all
full_setup() {
    check_api || exit 1
    create_all
    echo ""
    start_all
    echo ""
    list_detectors
}

# Show usage
usage() {
    echo "OpenSearch ML Detector Management"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  (no args)         Create and start all detectors"
    echo "  create            Create all predefined detectors"
    echo "  create <metric>   Create specific detector (pressure, flow, level, debit)"
    echo "  start             Start all detectors"
    echo "  start <id>        Start specific detector by ID"
    echo "  stop <id>         Stop specific detector by ID"
    echo "  delete            Delete all detectors"
    echo "  delete <id>       Delete specific detector by ID"
    echo "  status            List all detectors and their status"
    echo "  types             Show available detector types"
    echo "  results <id>      Get results for a detector"
    echo "  help              Show this help"
    echo ""
    echo "Environment:"
    echo "  IOT_GTW_URL       API base URL (default: http://localhost:3001)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full setup: create + start all"
    echo "  $0 create pressure      # Create pressure detector only"
    echo "  $0 start abc123         # Start detector with ID abc123"
    echo "  $0 status               # Check all detector statuses"
}

# Main
case "${1:-}" in
    "")
        full_setup
        ;;
    "create")
        check_api || exit 1
        if [ -n "${2:-}" ]; then
            create_detector "$2"
        else
            create_all
        fi
        ;;
    "start")
        check_api || exit 1
        if [ -n "${2:-}" ]; then
            start_detector "$2"
        else
            start_all
        fi
        ;;
    "stop")
        check_api || exit 1
        if [ -n "${2:-}" ]; then
            stop_detector "$2"
        else
            echo "Usage: $0 stop <detector-id>"
        fi
        ;;
    "delete")
        check_api || exit 1
        if [ -n "${2:-}" ]; then
            delete_detector "$2"
        else
            read -p "Delete ALL detectors? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                delete_all
            else
                echo "Cancelled"
            fi
        fi
        ;;
    "status"|"list")
        check_api || exit 1
        list_detectors
        ;;
    "types")
        check_api || exit 1
        get_types
        ;;
    "results")
        check_api || exit 1
        if [ -n "${2:-}" ]; then
            get_results "$2"
        else
            echo "Usage: $0 results <detector-id>"
        fi
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    *)
        echo "Unknown command: $1"
        usage
        exit 1
        ;;
esac
