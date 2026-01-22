/**
 * Check latest Teltonika iot_log entries
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'iot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkLatestTeltonika() {
  console.log('🔍 Checking Latest Teltonika Data');
  console.log('==================================\n');

  try {
    // Check latest iot_log with HELIO prefix (last 5 minutes)
    const query = `
      SELECT 
        id,
        label,
        device_id,
        payload,
        processed,
        notes,
        timestamp,
        created_at
      FROM iot_log
      WHERE (
        device_id LIKE 'HELIO-%' 
        OR topic = 'teltonika'
      )
      AND created_at > NOW() - INTERVAL '5 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ No Teltonika data in last 5 minutes');
      console.log('   Please run: node scripts/test/test-teltonika-simple.js\n');
      return;
    }

    console.log(`✅ Found ${result.rows.length} entries (last 5 minutes):\n`);

    result.rows.forEach((log, idx) => {
      console.log(`[${idx + 1}] ${log.label} - ${log.processed ? '✅ Processed' : '⏳ Pending'}`);
      console.log(`    Device ID: ${log.device_id}`);
      console.log(`    Timestamp: ${log.timestamp}`);
      console.log(`    Created: ${log.created_at}`);
      
      if (log.payload.gps) {
        console.log(`    GPS: ${log.payload.gps.latitude}, ${log.payload.gps.longitude}`);
      }
      if (log.payload.sensors) {
        console.log(`    Sensors: Temp=${log.payload.sensors.temperature}°C, Voltage=${log.payload.sensors.voltage}V`);
      }
      
      if (log.notes) {
        console.log(`    ⚠️  ${log.notes.substring(0, 100)}...`);
      }
      
      console.log('');
    });

    // Check unpaired devices with HELIO prefix
    console.log('\n📋 Checking unpaired devices (HELIO-*)...');
    const unpairedQuery = `
      SELECT 
        device_id,
        first_seen,
        last_seen,
        message_count,
        metadata
      FROM node_unpaired_devices
      WHERE device_id LIKE 'HELIO-%'
      ORDER BY last_seen DESC
      LIMIT 5
    `;
    
    const unpairedResult = await pool.query(unpairedQuery);
    
    if (unpairedResult.rows.length > 0) {
      console.log(`✅ Found ${unpairedResult.rows.length} unpaired Teltonika devices:\n`);
      unpairedResult.rows.forEach((device, idx) => {
        console.log(`[${idx + 1}] ${device.device_id}`);
        console.log(`    First seen: ${device.first_seen}`);
        console.log(`    Last seen: ${device.last_seen}`);
        console.log(`    Messages: ${device.message_count}`);
        console.log('');
      });
    } else {
      console.log('   No unpaired Teltonika devices found\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLatestTeltonika();
