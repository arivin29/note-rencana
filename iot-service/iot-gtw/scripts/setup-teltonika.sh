#!/bin/bash

# Teltonika Setup Helper Script
# This script helps setup database for Teltonika FM125 integration

echo "🚀 Teltonika FM125 Setup Helper"
echo "================================"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Get database credentials from .env or prompt
if [ -f .env ]; then
    source .env
else
    echo "⚠️  .env file not found. Please enter database credentials:"
    read -p "Database Host (localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database Port (5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database Name: " DB_DATABASE
    read -p "Database User: " DB_USERNAME
    read -sp "Database Password: " DB_PASSWORD
    echo ""
fi

# IMEI for test device
read -p "Enter Teltonika IMEI (15 digits): " IMEI
if [ -z "$IMEI" ] || [ ${#IMEI} -ne 15 ]; then
    echo "❌ Invalid IMEI. Must be 15 digits."
    exit 1
fi

# Project ID
read -p "Enter Project ID (UUID): " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required."
    exit 1
fi

echo ""
echo "📝 Creating Teltonika device in database..."
echo "   IMEI: $IMEI"
echo "   Project: $PROJECT_ID"
echo ""

# SQL script
SQL_SCRIPT="
-- 1. Create NodeProfile for Teltonika FM125
DO \$\$
DECLARE
    v_profile_id UUID;
    v_node_id UUID;
    v_gps_sensor_id UUID;
    v_temp_sensor_id UUID;
    v_volt_sensor_id UUID;
BEGIN
    -- Insert NodeProfile
    INSERT INTO node_profiles (
        id_node_profile,
        profile_name,
        mapping_json,
        description,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Teltonika FM125 Standard Profile',
        '{
            \"sensors\": [
                {
                    \"label\": \"Sensor-GPS-Teltonika\",
                    \"channels\": [
                        {
                            \"channelCode\": \"LATITUDE\",
                            \"payloadPath\": \"gps.latitude\",
                            \"unit\": \"degree\"
                        },
                        {
                            \"channelCode\": \"LONGITUDE\",
                            \"payloadPath\": \"gps.longitude\",
                            \"unit\": \"degree\"
                        }
                    ]
                },
                {
                    \"label\": \"Sensor-Temperature-Teltonika\",
                    \"channels\": [
                        {
                            \"channelCode\": \"TEMPERATURE\",
                            \"payloadPath\": \"sensors.temperature\",
                            \"unit\": \"celsius\"
                        }
                    ]
                },
                {
                    \"label\": \"Sensor-Voltage-Teltonika\",
                    \"channels\": [
                        {
                            \"channelCode\": \"VOLTAGE\",
                            \"payloadPath\": \"sensors.voltage\",
                            \"unit\": \"volt\"
                        }
                    ]
                }
            ],
            \"metadata\": {
                \"deviceId\": {
                    \"path\": \"device_id\",
                    \"type\": \"string\"
                },
                \"timestamp\": {
                    \"path\": \"timestamp\",
                    \"type\": \"number\"
                }
            }
        }',
        'Standard mapping for Teltonika FM125 with GPS, Temperature, and Voltage sensors',
        NOW(),
        NOW()
    ) RETURNING id_node_profile INTO v_profile_id;
    
    RAISE NOTICE 'Created NodeProfile: %', v_profile_id;
    
    -- Insert Node
    INSERT INTO nodes (
        id_node,
        id_project,
        id_node_profile,
        code,
        serial_number,
        dev_eui,
        connectivity_status,
        telemetry_interval_sec,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        '$PROJECT_ID'::UUID,
        v_profile_id,
        'TELTONIKA-$IMEI',
        '$IMEI',
        '$IMEI',
        'offline',
        300,
        NOW(),
        NOW()
    ) RETURNING id_node INTO v_node_id;
    
    RAISE NOTICE 'Created Node: %', v_node_id;
    
    -- Insert GPS Sensor
    INSERT INTO sensors (
        id_sensor,
        id_node,
        label,
        sensor_code,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_node_id,
        'Sensor-GPS-Teltonika',
        'GPS-$IMEI',
        'active',
        NOW(),
        NOW()
    ) RETURNING id_sensor INTO v_gps_sensor_id;
    
    RAISE NOTICE 'Created GPS Sensor: %', v_gps_sensor_id;
    
    -- Insert GPS Channels
    INSERT INTO sensor_channels (
        id_sensor_channel,
        id_sensor,
        metric_code,
        metric_name,
        unit,
        data_type,
        is_active,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), v_gps_sensor_id, 'LATITUDE', 'Latitude', 'degree', 'float', true, NOW(), NOW()),
    (gen_random_uuid(), v_gps_sensor_id, 'LONGITUDE', 'Longitude', 'degree', 'float', true, NOW(), NOW());
    
    RAISE NOTICE 'Created GPS Channels';
    
    -- Insert Temperature Sensor
    INSERT INTO sensors (
        id_sensor,
        id_node,
        label,
        sensor_code,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_node_id,
        'Sensor-Temperature-Teltonika',
        'TEMP-$IMEI',
        'active',
        NOW(),
        NOW()
    ) RETURNING id_sensor INTO v_temp_sensor_id;
    
    RAISE NOTICE 'Created Temperature Sensor: %', v_temp_sensor_id;
    
    -- Insert Temperature Channel
    INSERT INTO sensor_channels (
        id_sensor_channel,
        id_sensor,
        metric_code,
        metric_name,
        unit,
        data_type,
        is_active,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), v_temp_sensor_id, 'TEMPERATURE', 'Temperature', 'celsius', 'float', true, NOW(), NOW());
    
    RAISE NOTICE 'Created Temperature Channel';
    
    -- Insert Voltage Sensor
    INSERT INTO sensors (
        id_sensor,
        id_node,
        label,
        sensor_code,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_node_id,
        'Sensor-Voltage-Teltonika',
        'VOLT-$IMEI',
        'active',
        NOW(),
        NOW()
    ) RETURNING id_sensor INTO v_volt_sensor_id;
    
    RAISE NOTICE 'Created Voltage Sensor: %', v_volt_sensor_id;
    
    -- Insert Voltage Channel
    INSERT INTO sensor_channels (
        id_sensor_channel,
        id_sensor,
        metric_code,
        metric_name,
        unit,
        data_type,
        is_active,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), v_volt_sensor_id, 'VOLTAGE', 'Voltage', 'volt', 'float', true, NOW(), NOW());
    
    RAISE NOTICE 'Created Voltage Channel';
    
    RAISE NOTICE '✅ Teltonika setup completed successfully!';
    RAISE NOTICE '   Node ID: %', v_node_id;
    RAISE NOTICE '   IMEI: $IMEI';
END \$\$;
"

# Execute SQL
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -c "$SQL_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Teltonika device setup completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Start the IoT Gateway: npm run start:dev"
    echo "   2. Configure Teltonika device to connect to port 5027"
    echo "   3. Test connection: node scripts/test/test-teltonika.js"
    echo ""
else
    echo ""
    echo "❌ Failed to setup Teltonika device"
    echo "   Please check database credentials and try again."
    exit 1
fi
