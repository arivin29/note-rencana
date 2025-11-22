#!/usr/bin/env node

/**
 * Check IoT Logs in Database
 * Usage: node check-iot-logs.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkIotLogs() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'iot_db'
  });

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'iot_db'}`);
    console.log('');

    await client.connect();
    console.log('✅ Connected to database');
    console.log('');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'iot_log'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Table "iot_log" does not exist!');
      console.log('');
      console.log('💡 Run migrations first:');
      console.log('   npm run migration:run');
      return;
    }

    console.log('✅ Table "iot_log" exists');
    console.log('');

    // Count total logs
    const countResult = await client.query('SELECT COUNT(*) as total FROM iot_log');
    const total = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Total logs in database: ${total}`);
    console.log('');

    if (total === 0) {
      console.log('⚠️  No logs found in database');
      console.log('');
      console.log('💡 Try publishing test messages:');
      console.log('   node test-mqtt-publish.js');
      return;
    }

    // Get statistics by label
    const statsResult = await client.query(`
      SELECT label, COUNT(*) as count 
      FROM iot_log 
      GROUP BY label 
      ORDER BY count DESC
    `);

    console.log('📈 Logs by label:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.label}: ${row.count}`);
    });
    console.log('');

    // Get last 5 logs
    const logsResult = await client.query(`
      SELECT id, label, topic, device_id, 
             SUBSTRING(payload::text, 1, 100) as payload_preview,
             created_at
      FROM iot_log 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('📋 Last 5 logs:');
    console.log('');
    logsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Label: ${row.label}`);
      console.log(`   Topic: ${row.topic}`);
      console.log(`   Device ID: ${row.device_id || 'N/A'}`);
      console.log(`   Payload: ${row.payload_preview}...`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Cannot connect to database. Check:');
      console.log('   1. PostgreSQL is running');
      console.log('   2. .env file has correct DB credentials');
      console.log('   3. Database exists');
    }
  } finally {
    await client.end();
  }
}

checkIotLogs().catch(console.error);
