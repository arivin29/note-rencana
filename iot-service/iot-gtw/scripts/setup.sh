#!/bin/bash

# ========================================
# IoT Gateway - First Time Setup
# ========================================
# Run this script on first deployment
# Usage: ./setup.sh
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}IoT Gateway - First Time Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Node.js
echo -e "${YELLOW}→${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js is not installed!"
    echo "  Please install Node.js 18+ first"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
echo ""

# Check npm
echo -e "${YELLOW}→${NC} Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm is not installed!"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓${NC} npm $NPM_VERSION"
echo ""

# Install PM2 globally
echo -e "${YELLOW}→${NC} Installing PM2 globally..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓${NC} PM2 installed"
else
    echo -e "${GREEN}✓${NC} PM2 already installed"
fi
echo ""

# Install dependencies
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Check .env file
echo -e "${YELLOW}→${NC} Checking .env file..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC}  .env file not found"
    echo "  Creating from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo ""
    echo -e "${YELLOW}⚠${NC}  IMPORTANT: Please edit .env file with your configuration!"
    echo "  Edit: nano .env"
    echo ""
    read -p "Press Enter to continue after editing .env..."
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi
echo ""

# Build application
echo -e "${YELLOW}→${NC} Building application..."
npm run build
echo -e "${GREEN}✓${NC} Build completed"
echo ""

# Setup PM2 startup
echo -e "${YELLOW}→${NC} Setting up PM2 startup..."
pm2 startup
echo ""
echo -e "${YELLOW}⚠${NC}  Please run the command shown above (if any)"
read -p "Press Enter to continue..."
echo ""

# Start service
echo -e "${YELLOW}→${NC} Starting service with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
echo -e "${GREEN}✓${NC} Service started and saved"
echo ""

# Show status
echo -e "${YELLOW}→${NC} Service status:"
pm2 list
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Setup completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Service is running at: http://localhost:4000/api"
echo ""
echo "Next steps:"
echo "  1. Check health: curl http://localhost:4000/api/health"
echo "  2. View logs: pm2 logs iot-gateway"
echo "  3. Monitor: pm2 monit"
echo ""
echo "For future deployments, use:"
echo "  ./scripts/deploy.sh       - Full deployment"
echo "  ./scripts/quick-deploy.sh - Quick update"
echo ""
