#!/bin/bash

# ============================================
# IoT Dashboard - Comprehensive Data Seeding
# ============================================
# This script populates the database with:
# - 3 Owners
# - 6 Projects
# - 20 Nodes
# - 40+ Sensors
# - 100+ Channels
# - 50,000+ Telemetry logs
# ============================================

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database connection (from .env)
DB_HOST="${DB_HOST:-109.105.194.174}"
DB_PORT="${DB_PORT:-54366}"
DB_NAME="${DB_NAME:-iot}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-Pantek123}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  IoT Dashboard - Data Seeding Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Cannot connect to database.${NC}"
    echo -e "${RED}Please check your database credentials and ensure PostgreSQL is running.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful!${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Step 1: Run comprehensive seed
echo -e "${BLUE}Step 1: Creating base data (owners, projects, nodes, sensors)...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/comprehensive-seed.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Base data created successfully!${NC}"
else
    echo -e "${RED}✗ Error creating base data.${NC}"
    exit 1
fi
echo ""

# Step 2: Run telemetry seed
echo -e "${BLUE}Step 2: Creating sensor channels and telemetry data...${NC}"
echo -e "${YELLOW}This may take a few minutes (generating 50,000+ records)...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/telemetry-seed.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Telemetry data created successfully!${NC}"
else
    echo -e "${RED}✗ Error creating telemetry data.${NC}"
    exit 1
fi
echo ""

# Display summary
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Data Seeding Summary${NC}"
echo -e "${BLUE}============================================${NC}"

# Count records
OWNER_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM owners;")
PROJECT_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM projects;")
NODE_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM nodes;")
SENSOR_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM sensors;")
CHANNEL_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM sensor_channels;")
TELEMETRY_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM sensor_logs;")

echo -e "${GREEN}Owners:          $OWNER_COUNT${NC}"
echo -e "${GREEN}Projects:        $PROJECT_COUNT${NC}"
echo -e "${GREEN}Nodes:           $NODE_COUNT${NC}"
echo -e "${GREEN}Sensors:         $SENSOR_COUNT${NC}"
echo -e "${GREEN}Channels:        $CHANNEL_COUNT${NC}"
echo -e "${GREEN}Telemetry Logs:  $TELEMETRY_COUNT${NC}"
echo ""

# Display sample data
echo -e "${BLUE}Sample Node Data:${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    n.code,
    n.connectivity_status,
    p.name as project,
    o.name as owner,
    COUNT(DISTINCT s.id_sensor) as sensors
FROM nodes n
LEFT JOIN projects p ON n.id_project = p.id_project
LEFT JOIN owners o ON p.id_owner = o.id_owner
LEFT JOIN sensors s ON n.id_node = s.id_node
GROUP BY n.code, n.connectivity_status, p.name, o.name
ORDER BY n.code
LIMIT 10;
"

echo ""
echo -e "${BLUE}Sample Telemetry Data (Latest):${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    n.code as node,
    s.label as sensor,
    sc.metric_code,
    sl.value_engineered,
    sc.unit,
    sl.ts
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sl.id_sensor = s.id_sensor
JOIN nodes n ON sl.id_node = n.id_node
ORDER BY sl.ts DESC
LIMIT 10;
"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Seeding Complete! 🎉${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}You can now:${NC}"
echo -e "  1. Start the backend: ${BLUE}npm run start:dev${NC}"
echo -e "  2. View data at: ${BLUE}http://localhost:3000/api/nodes${NC}"
echo -e "  3. Check Swagger: ${BLUE}http://localhost:3000/api${NC}"
echo ""
