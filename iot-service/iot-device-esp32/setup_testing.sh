#!/bin/bash

# ============================================================================
# ESP32 IoT Device - Testing Setup Script
# ============================================================================
# This script installs all dependencies needed for testing
# ============================================================================

set -e

echo "============================================================================"
echo "ESP32 IoT Device - Testing Setup"
echo "============================================================================"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
fi

echo "Detected OS: $OS"
echo ""

# ============================================================================
# Install MQTT Tools
# ============================================================================

echo "📦 Installing MQTT tools..."
echo ""

if [ "$OS" == "macos" ]; then
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install from https://brew.sh"
        exit 1
    fi
    
    if ! command -v mosquitto_sub &> /dev/null; then
        echo "Installing mosquitto..."
        brew install mosquitto
    else
        echo "✅ mosquitto already installed"
    fi
    
elif [ "$OS" == "linux" ]; then
    if ! command -v mosquitto_sub &> /dev/null; then
        echo "Installing mosquitto-clients..."
        sudo apt-get update
        sudo apt-get install -y mosquitto-clients
    else
        echo "✅ mosquitto-clients already installed"
    fi
fi

# ============================================================================
# Install jq
# ============================================================================

echo ""
echo "📦 Installing jq (JSON processor)..."
echo ""

if [ "$OS" == "macos" ]; then
    if ! command -v jq &> /dev/null; then
        echo "Installing jq..."
        brew install jq
    else
        echo "✅ jq already installed"
    fi
    
elif [ "$OS" == "linux" ]; then
    if ! command -v jq &> /dev/null; then
        echo "Installing jq..."
        sudo apt-get install -y jq
    else
        echo "✅ jq already installed"
    fi
fi

# ============================================================================
# Install Python Dependencies
# ============================================================================

echo ""
echo "🐍 Installing Python dependencies..."
echo ""

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.7+"
    exit 1
fi

echo "Python version: $(python3 --version)"

# Check if pip3 is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 not found. Please install pip3"
    exit 1
fi

# Install paho-mqtt
echo "Installing paho-mqtt..."

# Try different methods for Python 3.13+
if pip3 install --user paho-mqtt 2>/dev/null; then
    echo "✅ Installed with pip3 --user"
elif pip3 install --break-system-packages paho-mqtt 2>/dev/null; then
    echo "✅ Installed with --break-system-packages"
elif brew install pipx 2>/dev/null && pipx install paho-mqtt 2>/dev/null; then
    echo "✅ Installed with pipx"
else
    echo "⚠️  Manual installation needed:"
    echo "   pip3 install --user paho-mqtt"
    echo "   or"
    echo "   python3 -m pip install --user paho-mqtt"
fi

echo "✅ Python dependencies setup complete"

# ============================================================================
# Verify Installation
# ============================================================================

echo ""
echo "============================================================================"
echo "Verifying installation..."
echo "============================================================================"
echo ""

ERRORS=0

# Check mosquitto_sub
if command -v mosquitto_sub &> /dev/null; then
    echo "✅ mosquitto_sub: $(which mosquitto_sub)"
else
    echo "❌ mosquitto_sub: NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check mosquitto_pub
if command -v mosquitto_pub &> /dev/null; then
    echo "✅ mosquitto_pub: $(which mosquitto_pub)"
else
    echo "❌ mosquitto_pub: NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check jq
if command -v jq &> /dev/null; then
    echo "✅ jq: $(which jq)"
else
    echo "❌ jq: NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ python3: $(which python3) ($(python3 --version))"
else
    echo "❌ python3: NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check paho-mqtt
if python3 -c "import paho.mqtt.client" 2>/dev/null; then
    echo "✅ paho-mqtt: Installed"
else
    echo "❌ paho-mqtt: NOT FOUND"
    echo "   Try: pip3 install --user paho-mqtt"
    ERRORS=$((ERRORS + 1))
fi

echo ""

if [ $ERRORS -eq 0 ]; then
    echo "============================================================================"
    echo "✅ ALL DEPENDENCIES INSTALLED SUCCESSFULLY!"
    echo "============================================================================"
    echo ""
    echo "You can now run:"
    echo "  1. Bash monitoring: ./test_production.sh DEVICE_ID 4"
    echo "  2. Python tests: python3 test_scenarios.py DEVICE_ID broker port"
    echo ""
    echo "Next steps:"
    echo "  1. Update MQTT broker settings in scripts"
    echo "  2. Run Phase 1 validation (see TESTING-EXECUTION-PLAN.md)"
    echo "  3. Start 4-hour stability test"
    echo ""
else
    echo "============================================================================"
    echo "⚠️  INSTALLATION INCOMPLETE"
    echo "============================================================================"
    echo "$ERRORS error(s) found. Please fix them and run again."
    echo ""
fi
