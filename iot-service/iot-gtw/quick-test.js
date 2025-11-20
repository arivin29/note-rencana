#!/usr/bin/env node

/**
 * Quick MQTT Test Publisher
 * Publish to both sensor and device topics
 */

const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://109.105.194.174:8366';

console.log('🚀 Quick MQTT Test Publisher');
console.log('📡 Broker:', BROKER_URL);
console.log('');

const client = mqtt.connect(BROKER_URL, {
  clean: true,
  connectTimeout: 4000,
  clientId: `quick-test-${Date.now()}`
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log('');

  // Test 1: Publish to sensor topic
  const sensorPayload = {
    deviceId: 'SENSOR-001',
    temperature: 25.5,
    humidity: 60.2,
    timestamp: new Date().toISOString()
  };

  console.log('📤 Test 1: Publishing to topic "sensor"');
  console.log('   Payload:', JSON.stringify(sensorPayload));
  client.publish('sensor', JSON.stringify(sensorPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Failed:', err.message);
    } else {
      console.log('✅ Published to "sensor"');
    }
    console.log('');

    // Test 2: Publish to sensor/test subtopic
    setTimeout(() => {
      console.log('📤 Test 2: Publishing to topic "sensor/test"');
      client.publish('sensor/test', 'Hello from sensor/test', { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ Failed:', err.message);
        } else {
          console.log('✅ Published to "sensor/test"');
        }
        console.log('');

        // Test 3: Publish to device/control
        setTimeout(() => {
          const devicePayload = {
            cmd: 'restart',
            id: 'NODE001'
          };

          console.log('📤 Test 3: Publishing to topic "device/control"');
          console.log('   Payload:', JSON.stringify(devicePayload));
          client.publish('device/control', JSON.stringify(devicePayload), { qos: 1 }, (err) => {
            if (err) {
              console.error('❌ Failed:', err.message);
            } else {
              console.log('✅ Published to "device/control"');
            }
            console.log('');

            console.log('✅ All tests completed!');
            console.log('');
            console.log('👀 Check NestJS logs for messages with 🔔 emoji');
            console.log('📊 Then run: node check-iot-logs.js');
            
            setTimeout(() => {
              client.end();
              process.exit(0);
            }, 500);
          });
        }, 1000);
      });
    }, 1000);
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
  process.exit(1);
});
