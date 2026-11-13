#!/bin/bash

# Broker dibaca dari .env — jangan ditulis langsung di skrip ini.
source "$(dirname "$0")/../lib/env.sh"

# Single message test untuk debug
echo "🧪 Single Message Test for Debugging"
echo "====================================="
echo ""

BROKER="$MQTT_BROKER_URL"

echo "Publishing single test message..."
echo ""

node -e "
const mqtt = require('mqtt');
const client = mqtt.connect('$BROKER', {
  clean: true,
  clientId: 'debug-test-' + Date.now()
});

client.on('connect', () => {
  console.log('✅ Connected to broker');
  
  const payload = {
    deviceId: 'DEBUG-TEST-' + Date.now(),
    test: true,
    value: 999,
    timestamp: new Date().toISOString()
  };
  
  console.log('');
  console.log('📤 Publishing to topic: sensor');
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  console.log('');
  
  client.publish('sensor', JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ Message published successfully!');
      console.log('');
      console.log('👀 NOW CHECK NestJS terminal immediately!');
      console.log('   Look for: 🔔 RAW MQTT MESSAGE RECEIVED!');
      console.log('');
      console.log('If you see 🔔 → NestJS is receiving');
      console.log('If NO 🔔 → NestJS subscription problem');
    }
    setTimeout(() => client.end(), 500);
  });
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});
"
