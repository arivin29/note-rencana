#!/usr/bin/env node

/**
 * Check MQTT Configuration
 */

require('dotenv').config();

console.log('🔍 MQTT Configuration Check');
console.log('='.repeat(60));
console.log('');

console.log('📋 Environment Variables:');
console.log(`   MQTT_BROKER_URL: ${process.env.MQTT_BROKER_URL || '(not set - using default)'}`);
console.log(`   MQTT_TOPIC: ${process.env.MQTT_TOPIC || '(not set - using default)'}`);
console.log(`   MQTT_CLIENT_ID: ${process.env.MQTT_CLIENT_ID || '(not set - using default)'}`);
console.log('');

console.log('📋 Effective Configuration:');
const config = {
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  topic: process.env.MQTT_TOPIC || 'sensor',
  clientId: process.env.MQTT_CLIENT_ID || 'iot-gtw-service',
};

console.log(`   Broker URL: ${config.brokerUrl}`);
console.log(`   Topic: ${config.topic}`);
console.log(`   Client ID: ${config.clientId}`);
console.log('');

console.log('📋 Database Configuration:');
console.log(`   DB_HOST: ${process.env.DB_HOST || '(not set)'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || '(not set)'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || '(not set)'}`);
console.log(`   DB_USERNAME: ${process.env.DB_USERNAME || '(not set)'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(not set)'}`);
console.log('');

console.log('💡 Quick Test Commands:');
console.log('');
console.log('1️⃣  Test MQTT Connection:');
console.log(`   mosquitto_sub -h ${config.brokerUrl.replace('mqtt://', '').split(':')[0]} -p ${config.brokerUrl.split(':')[2] || 1883} -t ${config.topic} -v`);
console.log('');
console.log('2️⃣  Publish Test Message:');
console.log(`   mosquitto_pub -h ${config.brokerUrl.replace('mqtt://', '').split(':')[0]} -p ${config.brokerUrl.split(':')[2] || 1883} -t ${config.topic} -m '{"test":"hello"}'`);
console.log('');
console.log('3️⃣  Or use scripts:');
console.log(`   node debug-mqtt-listener.js    # Listen for messages`);
console.log(`   node test-mqtt-publish.js      # Publish test messages`);
console.log('');
console.log('='.repeat(60));
