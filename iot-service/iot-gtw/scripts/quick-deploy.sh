#!/bin/bash

# ========================================
# IoT Gateway - Quick Deploy Script
# ========================================
# Quick deployment: pull → install → restart
# Usage: ./quick-deploy.sh
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="iot-gateway"

echo -e "${YELLOW}→${NC} Quick Deploy: IoT Gateway"
echo ""

# Pull latest code
echo -e "${YELLOW}→${NC} Pulling latest code..."
git pull

# Install dependencies
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install

# Build
echo -e "${YELLOW}→${NC} Building..."
npm run build

# Restart PM2
echo -e "${YELLOW}→${NC} Restarting PM2..."
pm2 restart $APP_NAME || pm2 start ecosystem.config.js --env production

echo ""
echo -e "${GREEN}✓${NC} Quick deploy completed!"
echo ""
pm2 logs $APP_NAME --lines 20 --nostream
