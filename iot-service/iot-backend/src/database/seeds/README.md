# Comprehensive Seed Data Guide

## Overview
Seed data ini mencakup:
- **3 Owners** (Bright Farms, AquaTech Solutions, Smart Factory Inc)
- **6 Projects** (2 per owner)
- **20 Nodes** dengan berbagai tipe (RTU, ESP32, Arduino, Siemens)
- **40+ Sensors** (1-4 sensor per node)
- **100+ Channels** (1-4 channel per sensor)
- **50,000+ Telemetry logs** (72 jam historical data)

## Running the Seed

### Option 1: Using Bash Script (Recommended)
```bash
cd iot-backend
./src/database/seeds/run-seed.sh
```

### Option 2: Manual SQL Execution
```bash
# 1. Run base seed
psql postgresql://postgres:postgres@localhost:5432/iot_dashboard -f src/database/seeds/comprehensive-seed.sql

# 2. Run telemetry seed
psql postgresql://postgres:postgres@localhost:5432/iot_dashboard -f src/database/seeds/telemetry-seed.sql
```

### Option 3: Using Docker Compose (if using Docker)
```bash
docker-compose exec postgres psql -U postgres -d iot_dashboard -f /docker-entrypoint-initdb.d/comprehensive-seed.sql
```

## Data Structure

### 1. Owners (3)
```
- Bright Farms (Agriculture)
  └─ Projects: Hydroponic Greenhouse, Organic Farm North
  
- AquaTech Solutions (Aquaculture)
  └─ Projects: Shrimp Farm Delta, Fish Hatchery Complex
  
- Smart Factory Inc (Manufacturing)
  └─ Projects: Assembly Line Monitor, Warehouse Climate Control
```

### 2. Nodes Distribution (20 total)
```
Hydroponic Greenhouse (4 nodes):
  - RTU-GREEN-02: 4 sensors (temp, humidity, pressure, flow)
  - MKR-GREEN-01: 3 sensors (temp, humidity, pH)
  - ESP-GREEN-03: 2 sensors (temp, level)
  - ESP-CTRL-04: 2 sensors (voltage, power)

Organic Farm North (3 nodes):
  - RTU-FARM-01: 3 sensors (soil temp, moisture, pressure)
  - ESP-FARM-02: 2 sensors (temp, moisture)
  - MKR-EQUIP-03: 1 sensor (equipment temp)

Shrimp Farm Delta (4 nodes):
  - SIT-POND-A1: 4 sensors (water temp, pH, DO, level)
  - SIT-POND-A2: 4 sensors (water temp, pH, DO, flow)
  - ESP-POND-B1: 3 sensors (water temp, pH, DO)
  - RTU-PUMP-01: 2 sensors (pressure, flow)

Fish Hatchery Complex (3 nodes):
  - RTU-HATCH-R1: 4 sensors (temp, pH, DO, flow)
  - ESP-HATCH-R2: 3 sensors (temp, pH, DO)
  - MKR-MONITOR: 2 sensors (temp, humidity)

Assembly Line Monitor (3 nodes):
  - RTU-LINE1-A: 3 sensors (temp, voltage, power)
  - ESP-LINE1-B: 2 sensors (temp, power)
  - ESP-LINE2-A: 2 sensors (temp, power)

Warehouse Climate Control (3 nodes):
  - RTU-WARE-ZA: 3 sensors (temp, humidity, power)
  - ESP-WARE-ZB: 3 sensors (temp, humidity, power)
  - MKR-COLD-01: 2 sensors (temp, humidity)
```

### 3. Sensor Types
```
- Temperature (celsius): Greenhouses, Farms, Warehouses, Ponds
- Humidity (percent): Indoor monitoring, Climate control
- Pressure (bar): Water systems, Irrigation, Pumps
- Flow Rate (m3/h): Water circulation, Irrigation
- Water Level (meter): Tanks, Ponds
- pH (ph): Water quality monitoring
- Dissolved Oxygen (mg/l): Aquaculture
- Voltage (volt): Power monitoring
- Current (ampere): Electrical systems
- Power (watt): Energy consumption
```

### 4. Telemetry Data
- **Frequency**: Varies by application
  - Assembly lines: 60 seconds (high frequency)
  - Greenhouses: 180-300 seconds (medium)
  - Warehouses: 300-600 seconds (low)
- **Historical Range**: 72 hours back from NOW()
- **Data Pattern**: Sine wave + random noise for realistic variation
- **Quality**: All marked as 'good'

## Testing the Data

### 1. Check Node Count
```bash
curl http://localhost:3000/api/nodes | jq '.data | length'
# Expected: 20 nodes
```

### 2. Get Dashboard for a Node
```bash
curl http://localhost:3000/api/nodes/5dc5a8cb-0933-46a3-9747-b0bf73bb5568/dashboard | jq '.'
```

### 3. Check Telemetry Logs
```sql
SELECT 
    n.code,
    COUNT(*) as telemetry_count,
    MIN(sl.ts) as oldest_log,
    MAX(sl.ts) as latest_log
FROM sensor_logs sl
JOIN nodes n ON sl.id_node = n.id_node
GROUP BY n.code
ORDER BY telemetry_count DESC
LIMIT 10;
```

### 4. View Sensor Data by Owner
```sql
SELECT 
    o.name as owner,
    p.name as project,
    COUNT(DISTINCT n.id_node) as nodes,
    COUNT(DISTINCT s.id_sensor) as sensors,
    COUNT(DISTINCT sc.id_sensor_channel) as channels
FROM owners o
LEFT JOIN projects p ON o.id_owner = p.id_owner
LEFT JOIN nodes n ON p.id_project = n.id_project
LEFT JOIN sensors s ON n.id_node = s.id_node
LEFT JOIN sensor_channels sc ON s.id_sensor = sc.id_sensor
GROUP BY o.name, p.name
ORDER BY o.name, p.name;
```

## Sample API Endpoints

### Get All Nodes
```http
GET http://localhost:3000/api/nodes
```

### Get Node Dashboard
```http
GET http://localhost:3000/api/nodes/{nodeId}/dashboard
```

### Get Owners List
```http
GET http://localhost:3000/api/owners
```

### Get Projects by Owner
```http
GET http://localhost:3000/api/owners/{ownerId}/projects
```

### Get Statistics
```http
GET http://localhost:3000/api/nodes/statistics/overview
```

## Data Characteristics

### Connectivity Status Distribution
- **Online** (85%): 17 nodes
- **Degraded** (10%): 2 nodes  
- **Offline** (5%): 1 node

### Node Models
- Devetek Edge-RTU-02 (Modbus)
- Siemens SITRANS-FM-MAG5000 (Modbus)
- Arduino MKR-1010-WiFi (MQTT)
- ESP32 DevKit-V1 (MQTT)
- Teltonika FMB130 (TCP)

### Sensor Vendors
- Sensirion (Temperature)
- Aosong DHT22 (Humidity)
- Rosemount 3051 (Pressure)
- Siemens MAG5000 (Flow)
- ABB LLT100 (Level)
- Mettler InPro4260 (pH)
- Hach LDO-HQ40d (Dissolved Oxygen)
- Fluke V3000 (Voltage)
- Texas Instruments INA219 (Power)

## Notes

### Performance Considerations
- Telemetry logs table will have 50,000+ records
- Consider adding indexes for better query performance:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_sensor_logs_ts ON sensor_logs(ts DESC);
  CREATE INDEX IF NOT EXISTS idx_sensor_logs_node ON sensor_logs(id_node);
  CREATE INDEX IF NOT EXISTS idx_sensor_logs_project ON sensor_logs(id_project);
  ```

### Data Cleanup
If you need to clean up and re-seed:
```sql
TRUNCATE TABLE sensor_logs CASCADE;
TRUNCATE TABLE sensor_channels CASCADE;
TRUNCATE TABLE sensors CASCADE;
TRUNCATE TABLE nodes CASCADE;
TRUNCATE TABLE node_locations CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE owners CASCADE;
```

Then re-run the seed scripts.

## Frontend Testing

After seeding, you can test in Angular app:
1. Navigate to Nodes list: `http://localhost:4200/#/iot/nodes`
2. Click on any node to see dashboard
3. Verify owner, project, sensors, and telemetry data display correctly

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Or start PostgreSQL service
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
```

### Permission Errors
```bash
# Grant permissions
psql -U postgres -d iot_dashboard -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
```

### Slow Seed Performance
The telemetry generation may take 2-5 minutes depending on your hardware. This is normal as it's generating 50,000+ records with realistic time-series data.

## Next Steps

After successful seeding:
1. ✅ Backend will have comprehensive test data
2. ✅ Frontend can display real relationships (owner → project → node → sensor → channel)
3. ✅ Dashboard charts will show actual telemetry trends
4. ✅ All API endpoints will return meaningful data

Enjoy your fully populated IoT dashboard! 🎉
