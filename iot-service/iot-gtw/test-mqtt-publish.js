#!/usr/bin/env node

/**
 * Simple MQTT Publisher for Testing
 * Usage: node test-mqtt-publish.js
 */

const mqtt = require('mqtt');

// MQTT Configuration (update if needed)
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://109.105.194.174:8366';
const TOPIC = process.env.MQTT_TOPIC || 'sensor';

// Sample payloads
const samplePayloads = [
  {
    deviceId: 'SENSOR-001',
    temperature: 25.5,
    humidity: 65.3,
    timestamp: new Date().toISOString()
  },
  {
    device_id: 'NODE-123',
    value: 42,
    sensor: 'pressure',
    unit: 'bar'
  },
  {
    raw: 'Simple text message',
    type: 'test'
  }
];

console.log('🚀 MQTT Test Publisher');
console.log(`📡 Connecting to: ${BROKER_URL}`);
console.log(`📨 Publishing to topic: ${TOPIC}`);
console.log('');

const client = mqtt.connect(BROKER_URL, {
  clean: true,
  connectTimeout: 4000,
  clientId: `mqtt-test-publisher-${Date.now()}`
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log('');

  // Publish each sample payload
  samplePayloads.forEach((payload, index) => {
    setTimeout(() => {
      const message = JSON.stringify(payload);
      console.log(`📤 Publishing message ${index + 1}/${samplePayloads.length}:`);
      console.log(`   Topic: ${TOPIC}`);
      console.log(`   Payload: ${message}`);
      
      client.publish(TOPIC, message, { qos: 1 }, (error) => {
        if (error) {
          console.error(`❌ Failed to publish: ${error.message}`);
        } else {
          console.log(`✅ Message ${index + 1} published successfully`);
        }
        console.log('');

        // Close connection after last message
        if (index === samplePayloads.length - 1) {
          setTimeout(() => {
            console.log('👋 Closing connection...');
            client.end();
            process.exit(0);
          }, 1000);
        }
      });
    }, index * 1500); // Delay 1.5s between messages
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
  process.exit(1);
});

client.on('offline', () => {
  console.log('⚠️  MQTT client is offline');
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  client.end();
  process.exit(0);
});
