#!/bin/bash

# Quick Test & Verify Script
# This will test MQTT publish and verify database

echo "🚀 MQTT Subscribe & Save Test"
echo "=============================="
echo ""

cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw

echo "📊 Step 1: Check current database state"
echo "----------------------------------------"
node check-iot-logs.js | head -n 15
echo ""

echo "⏳ Waiting 3 seconds..."
sleep 3
echo ""

echo "📤 Step 2: Publishing test messages"
echo "----------------------------------------"
node quick-test.js
echo ""

echo "⏳ Waiting 2 seconds for processing..."
sleep 2
echo ""

echo "📊 Step 3: Check database after test"
echo "----------------------------------------"
node check-iot-logs.js
echo ""

echo "✅ Test completed!"
echo ""
echo "💡 Check NestJS terminal for 🔔 📨 💾 ✅ emojis"
echo "💡 If you see 3x complete log sequence → SUCCESS!"
echo ""
echo "📋 To check via API:"
echo "   curl http://localhost:4000/api/iot-logs/stats"
echo ""
