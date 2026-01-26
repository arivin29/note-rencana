#!/bin/bash
# install-widget-libs.sh
# Script untuk install semua library yang dibutuhkan Dynamic Widget System

set -e  # Exit on error

BASE_DIR="/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service"

echo "🚀 =============================================="
echo "   Dynamic Widget System - Library Installation"
echo "   =============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Frontend Installation
echo -e "${BLUE}📦 [1/2] Installing Frontend Libraries...${NC}"
cd "$BASE_DIR/iot-angular"

echo "   → Installing ECharts (charting library)..."
npm install echarts@^5.5.1 ngx-echarts@^18.0.3 --save

echo "   → Installing angular-gridster2 (grid layout)..."
npm install angular-gridster2@^18.0.1 --save

echo "   → Installing CodeMirror (SQL editor)..."
npm install @ctrl/ngx-codemirror@^7.0.0 codemirror@^5.65.16 --save

echo "   → Installing Socket.IO client (real-time)..."
npm install socket.io-client@^4.7.5 --save

echo -e "${GREEN}   ✅ Frontend libraries installed!${NC}"
echo ""

# Backend Installation  
echo -e "${BLUE}📦 [2/2] Installing Backend Libraries...${NC}"
cd "$BASE_DIR/iot-backend"

echo "   → Installing NestJS WebSocket packages..."
npm install @nestjs/websockets@^11.0.0 @nestjs/platform-socket.io@^11.0.0 socket.io@^4.7.5 --save

echo -e "${GREEN}   ✅ Backend libraries installed!${NC}"
echo ""

# Verification
echo "🔍 Verifying installations..."
echo ""

echo "Frontend packages:"
cd "$BASE_DIR/iot-angular"
npm ls echarts ngx-echarts angular-gridster2 @ctrl/ngx-codemirror socket.io-client 2>/dev/null || true
echo ""

echo "Backend packages:"
cd "$BASE_DIR/iot-backend"
npm ls @nestjs/websockets @nestjs/platform-socket.io socket.io 2>/dev/null || true
echo ""

echo -e "${GREEN}🎉 =============================================="
echo "   All libraries installed successfully!"
echo "   =============================================="
echo ""
echo "   Next steps:"
echo "   1. Review: desain_widget_dinamis/18-LIBRARY-REQUIREMENTS.md"
echo "   2. Tasks:  desain_widget_dinamis/19-TASK-TRACKING.md"
echo -e "   ==============================================${NC}"
