#!/usr/bin/env node

/**
 * MQTT Listener for Debugging
 * This script will subscribe to the same topic as your NestJS app
 * and show all incoming messages to help debug
 */

const mqtt = require('mqtt');
require('dotenv').config();

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://109.105.194.174:8366';
const TOPIC = process.env.MQTT_TOPIC || 'sensor';

console.log('🔍 MQTT Debug Listener');
console.log('='.repeat(60));
console.log(`📡 Broker: ${BROKER_URL}`);
console.log(`📨 Topic: ${TOPIC}`);
console.log(`⏰ Started: ${new Date().toISOString()}`);
console.log('='.repeat(60));
console.log('');
console.log('🎯 Waiting for messages... (Press Ctrl+C to stop)');
console.log('');

const client = mqtt.connect(BROKER_URL, {
  clean: true,
  connectTimeout: 5001,
  clientId: `mqtt-debug-listener-${Date.now()}`
});

let messageCount = 0;

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  client.subscribe(TOPIC, { qos: 1 }, (error) => {
    if (error) {
      console.error(`❌ Failed to subscribe: ${error.message}`);
      process.exit(1);
    } else {
      console.log(`✅ Subscribed to topic: '${TOPIC}'`);
      console.log('');
      console.log('👂 Listening for messages...');
      console.log('-'.repeat(60));
      console.log('');
    }
  });
});

client.on('message', (topic, message) => {
  messageCount++;
  const timestamp = new Date().toISOString();
  const messageStr = message.toString();
  
  console.log(`📬 Message #${messageCount} received at ${timestamp}`);
  console.log(`   Topic: ${topic}`);
  console.log(`   Length: ${message.length} bytes`);
  console.log(`   Raw: ${messageStr}`);
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(messageStr);
    console.log(`   Parsed JSON:`, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(`   (Not JSON - raw text)`);
  }
  
  console.log('-'.repeat(60));
  console.log('');
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
});

client.on('offline', () => {
  console.log('⚠️  Client is offline');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting...');
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Shutting down...');
  console.log(`📊 Total messages received: ${messageCount}`);
  client.end();
  process.exit(0);
});
