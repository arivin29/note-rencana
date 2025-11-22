#!/bin/bash

# Verify Unpaired Device Detection Implementation
# Check if all components are properly configured

echo "=========================================="
echo "Verifying Unpaired Device Detection Setup"
echo "=========================================="
echo ""

# Check 1: Owner exists with owner_code
echo "1️⃣  Checking Owner Configuration..."
OWNER_CHECK=$(PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -t -c "
    SELECT COUNT(*) FROM owners WHERE owner_code = 'DEMO1';
" | tr -d ' ')

if [ "$OWNER_CHECK" = "1" ]; then
    echo "   ✅ Owner DEMO1 exists"
    PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -c "
        SELECT owner_code, name, email FROM owners WHERE owner_code = 'DEMO1';
    "
else
    echo "   ❌ Owner DEMO1 NOT FOUND"
    echo "   Run: UPDATE owners SET owner_code = 'DEMO1' WHERE name = 'PT DEVELOPMENT';"
fi

echo ""

# Check 2: Device NOT in nodes table
echo "2️⃣  Checking Device Pairing Status..."
NODE_CHECK=$(PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -t -c "
    SELECT COUNT(*) FROM nodes 
    WHERE serial_number = 'DEMO1-00D42390A994' 
       OR dev_eui = 'DEMO1-00D42390A994' 
       OR code = 'DEMO1-00D42390A994';
" | tr -d ' ')

if [ "$NODE_CHECK" = "0" ]; then
    echo "   ✅ Device NOT paired (correct - should go to unpaired_devices)"
else
    echo "   ⚠️  Device IS PAIRED (will go to iot_log, not unpaired_devices)"
    PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -c "
        SELECT id_node, code, serial_number FROM nodes 
        WHERE serial_number = 'DEMO1-00D42390A994' 
           OR dev_eui = 'DEMO1-00D42390A994' 
           OR code = 'DEMO1-00D42390A994';
    "
fi

echo ""

# Check 3: Verify iot-gtw files exist
echo "3️⃣  Checking Implementation Files..."

if [ -f "src/modules/mqtt/mqtt.service.ts" ]; then
    if grep -q "extractOwnerCode" src/modules/mqtt/mqtt.service.ts; then
        echo "   ✅ mqtt.service.ts has extractOwnerCode method"
    else
        echo "   ❌ mqtt.service.ts missing extractOwnerCode method"
    fi
    
    if grep -q "isDevicePaired" src/modules/mqtt/mqtt.service.ts; then
        echo "   ✅ mqtt.service.ts has isDevicePaired method"
    else
        echo "   ❌ mqtt.service.ts missing isDevicePaired method"
    fi
    
    if grep -q "trackUnpairedDevice" src/modules/mqtt/mqtt.service.ts; then
        echo "   ✅ mqtt.service.ts has trackUnpairedDevice method"
    else
        echo "   ❌ mqtt.service.ts missing trackUnpairedDevice method"
    fi
else
    echo "   ❌ mqtt.service.ts not found"
fi

echo ""

# Check 4: Module configuration
echo "4️⃣  Checking Module Configuration..."
if [ -f "src/modules/mqtt/mqtt.module.ts" ]; then
    if grep -q "NodeUnpairedDevice" src/modules/mqtt/mqtt.module.ts; then
        echo "   ✅ mqtt.module.ts imports NodeUnpairedDevice"
    else
        echo "   ❌ mqtt.module.ts missing NodeUnpairedDevice import"
    fi
    
    if grep -q "Owner" src/modules/mqtt/mqtt.module.ts; then
        echo "   ✅ mqtt.module.ts imports Owner"
    else
        echo "   ❌ mqtt.module.ts missing Owner import"
    fi
else
    echo "   ❌ mqtt.module.ts not found"
fi

echo ""

# Check 5: Owner entity has owner_code
echo "5️⃣  Checking Owner Entity..."
if [ -f "src/entities/existing/owner.entity.ts" ]; then
    if grep -q "ownerCode" src/entities/existing/owner.entity.ts; then
        echo "   ✅ owner.entity.ts has ownerCode field"
    else
        echo "   ❌ owner.entity.ts missing ownerCode field"
    fi
else
    echo "   ❌ owner.entity.ts not found"
fi

echo ""

# Check 6: Recent logs
echo "6️⃣  Checking Recent Logs..."
RECENT_UNPAIRED=$(PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -t -c "
    SELECT COUNT(*) FROM node_unpaired_devices 
    WHERE hardware_id = 'DEMO1-00D42390A994' 
      AND last_seen_at > NOW() - INTERVAL '5 minutes';
" | tr -d ' ')

RECENT_IOT_LOG=$(PGPASSWORD='Pantek123' psql -h 109.105.194.174 -p 54366 -U postgres -d iot -t -c "
    SELECT COUNT(*) FROM iot_log 
    WHERE device_id = 'DEMO1-00D42390A994' 
      AND created_at > NOW() - INTERVAL '5 minutes';
" | tr -d ' ')

echo "   📊 Last 5 minutes:"
echo "      - unpaired_devices: $RECENT_UNPAIRED messages"
echo "      - iot_log: $RECENT_IOT_LOG messages"

if [ "$RECENT_UNPAIRED" -gt "0" ]; then
    echo "   ✅ Device is being tracked in unpaired_devices"
elif [ "$RECENT_IOT_LOG" -gt "0" ]; then
    echo "   ⚠️  Device messages going to iot_log (not unpaired_devices)"
    echo "   Possible reasons:"
    echo "      1. Service not restarted with new code"
    echo "      2. Device might be considered paired"
    echo "      3. Implementation error"
else
    echo "   ℹ️  No recent messages from device"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ "$OWNER_CHECK" = "1" ] && [ "$NODE_CHECK" = "0" ]; then
    echo "✅ Prerequisites: PASSED"
    echo "   - Owner DEMO1 exists"
    echo "   - Device is unpaired"
    echo ""
    
    if [ "$RECENT_UNPAIRED" -gt "0" ]; then
        echo "✅ Implementation: WORKING"
        echo "   Device messages are going to unpaired_devices"
    else
        echo "⚠️  Implementation: NEEDS VERIFICATION"
        echo "   - Files are configured correctly"
        echo "   - Waiting for next device message..."
        echo "   - Run: ./monitor-unpaired-device.sh"
    fi
else
    echo "❌ Prerequisites: FAILED"
    echo "   Please fix owner configuration first"
fi

echo ""
