#!/bin/bash

# ========================================
# IoT Gateway - Deployment Script
# ========================================
# This script deploys the IoT Gateway service
# Usage: ./deploy.sh [production|staging]
# ========================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="iot-gateway"
SERVICE_DIR="$HOME/iot-service/iot-gtw"
ENVIRONMENT=${1:-production}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}IoT Gateway - Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as correct user
echo -e "${YELLOW}→${NC} Checking environment..."
echo "  Current user: $(whoami)"
echo "  Environment: $ENVIRONMENT"
echo "  Service directory: $SERVICE_DIR"
echo ""

# Navigate to service directory
if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${RED}✗${NC} Directory not found: $SERVICE_DIR"
    exit 1
fi

cd "$SERVICE_DIR"
echo -e "${GREEN}✓${NC} Changed to service directory"
echo ""

# Pull latest code
echo -e "${YELLOW}→${NC} Pulling latest code from Git..."
git pull origin main || git pull origin master
echo -e "${GREEN}✓${NC} Code updated"
echo ""

# Install dependencies
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install --production
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Build application
echo -e "${YELLOW}→${NC} Building application..."
npm run build
echo -e "${GREEN}✓${NC} Build completed"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}→${NC} PM2 not found, installing globally..."
    npm install -g pm2
    echo -e "${GREEN}✓${NC} PM2 installed"
else
    echo -e "${GREEN}✓${NC} PM2 is already installed"
fi
echo ""

# Stop existing PM2 process (if running)
echo -e "${YELLOW}→${NC} Checking for existing PM2 process..."
if pm2 list | grep -q "$APP_NAME"; then
    echo "  Stopping existing process..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
    echo -e "${GREEN}✓${NC} Stopped and removed old process"
else
    echo "  No existing process found"
fi
echo ""

# Start with PM2
echo -e "${YELLOW}→${NC} Starting service with PM2..."
if [ "$ENVIRONMENT" = "production" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env $ENVIRONMENT
fi
echo -e "${GREEN}✓${NC} Service started"
echo ""

# Save PM2 configuration
echo -e "${YELLOW}→${NC} Saving PM2 configuration..."
pm2 save
echo -e "${GREEN}✓${NC} PM2 configuration saved"
echo ""

# Show status
echo -e "${YELLOW}→${NC} Service status:"
pm2 list
echo ""

# Show logs (last 10 lines)
echo -e "${YELLOW}→${NC} Recent logs:"
pm2 logs "$APP_NAME" --lines 10 --nostream
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Service is running at: http://localhost:4000/api"
echo ""
echo "Useful commands:"
echo "  pm2 logs $APP_NAME        - View logs"
echo "  pm2 restart $APP_NAME     - Restart service"
echo "  pm2 stop $APP_NAME        - Stop service"
echo "  pm2 monit                 - Monitor resources"
echo ""
