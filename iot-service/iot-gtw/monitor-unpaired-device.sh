#!/bin/bash

# Host & kredensial dibaca dari .env — jangan ditulis langsung di skrip ini.
source "$(dirname "$0")/scripts/lib/env.sh"

# Monitor Unpaired Device Detection
# Watch logs and database for unpaired device tracking

echo "=========================================="
echo "Monitoring Unpaired Device Detection"
echo "Device: DEMO1-00D42390A994"
echo "=========================================="
echo ""

# Function to check unpaired devices
check_unpaired() {
    echo "📊 Checking node_unpaired_devices table..."
    pg -c "
        SELECT 
            hardware_id,
            suggested_owner,
            o.owner_code,
            o.name as owner_name,
            seen_count,
            status,
            last_seen_at
        FROM node_unpaired_devices u
        LEFT JOIN owners o ON o.id_owner = u.suggested_owner
        WHERE hardware_id = 'DEMO1-00D42390A994';
    " -x
}

# Function to check latest iot_log
check_iot_log() {
    echo "📝 Checking latest iot_log entries..."
    pg -c "
        SELECT 
            label,
            device_id,
            created_at
        FROM iot_log 
        WHERE device_id = 'DEMO1-00D42390A994' 
        ORDER BY created_at DESC 
        LIMIT 3;
    "
}

# Initial check
echo "=== Initial State ==="
check_unpaired
echo ""
check_iot_log

echo ""
echo "=========================================="
echo "Waiting for next device message..."
echo "Device publishes every ~30 seconds"
echo "Press Ctrl+C to stop monitoring"
echo "=========================================="
echo ""

# Monitor loop
LAST_COUNT=$(pg_t -c "SELECT COALESCE(seen_count, 0) FROM node_unpaired_devices WHERE hardware_id = 'DEMO1-00D42390A994';" | tr -d ' ')
LAST_LOG_COUNT=$(pg_t -c "SELECT COUNT(*) FROM iot_log WHERE device_id = 'DEMO1-00D42390A994';" | tr -d ' ')

while true; do
    sleep 10
    
    # Check unpaired_devices
    CURRENT_COUNT=$(pg_t -c "SELECT COALESCE(seen_count, 0) FROM node_unpaired_devices WHERE hardware_id = 'DEMO1-00D42390A994';" | tr -d ' ')
    
    # Check iot_log
    CURRENT_LOG_COUNT=$(pg_t -c "SELECT COUNT(*) FROM iot_log WHERE device_id = 'DEMO1-00D42390A994';" | tr -d ' ')
    
    if [ "$CURRENT_COUNT" != "$LAST_COUNT" ] && [ -n "$CURRENT_COUNT" ] && [ "$CURRENT_COUNT" != "0" ]; then
        echo ""
        echo "🎉 NEW MESSAGE DETECTED IN unpaired_devices!"
        echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
        check_unpaired
        echo ""
        LAST_COUNT=$CURRENT_COUNT
    fi
    
    if [ "$CURRENT_LOG_COUNT" != "$LAST_LOG_COUNT" ]; then
        echo ""
        echo "⚠️  NEW MESSAGE IN iot_log (should NOT happen for unpaired device)"
        echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
        check_iot_log
        echo ""
        LAST_LOG_COUNT=$CURRENT_LOG_COUNT
    fi
    
    # Show heartbeat
    echo -n "."
done
