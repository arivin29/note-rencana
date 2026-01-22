/**
 * Check Teltonika data in database
 * 
 * Usage:
 *   node scripts/test/check-teltonika-data.js [IMEI]
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

const IMEI = process.argv[2] || '123456789012345';

async function checkTeltonikaData() {
  console.log('🔍 Checking Teltonika Data');
  console.log('==========================\n');
  console.log(`📱 IMEI: ${IMEI}\n`);

  try {
    // 1. Check if node exists
    console.log('1️⃣ Checking Node Registration...');
    const nodeQuery = `
      SELECT 
        id_node,
        code,
        dev_eui,
        serial_number,
        connectivity_status,
        last_seen_at
      FROM nodes
      WHERE dev_eui = $1 OR serial_number = $1
    `;
    const nodeResult = await pool.query(nodeQuery, [IMEI]);
    
    if (nodeResult.rows.length === 0) {
      console.log('❌ Node NOT FOUND!');
      console.log('   Please register the device first.\n');
      return;
    }
    
    const node = nodeResult.rows[0];
    console.log('✅ Node found:');
    console.log(`   ID: ${node.id_node}`);
    console.log(`   Code: ${node.code}`);
    console.log(`   Status: ${node.connectivity_status}`);
    console.log(`   Last Seen: ${node.last_seen_at || 'Never'}\n`);

    // 2. Check iot_log entries
    console.log('2️⃣ Checking iot_log entries...');
    const iotLogQuery = `
      SELECT 
        id,
        label,
        topic,
        device_id,
        payload,
        processed,
        timestamp,
        created_at
      FROM iot_log
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 5
    `;
    const iotLogResult = await pool.query(iotLogQuery, [IMEI]);
    
    console.log(`✅ Found ${iotLogResult.rows.length} iot_log entries`);
    if (iotLogResult.rows.length > 0) {
      console.log('\nLatest entries:');
      iotLogResult.rows.forEach((log, idx) => {
        console.log(`\n   [${idx + 1}] ${log.label} - ${log.processed ? '✅ Processed' : '⏳ Pending'}`);
        console.log(`       Timestamp: ${log.timestamp}`);
        console.log(`       GPS: ${log.payload.gps?.latitude}, ${log.payload.gps?.longitude}`);
        console.log(`       Temp: ${log.payload.sensors?.temperature}°C`);
        console.log(`       Voltage: ${log.payload.sensors?.voltage}V`);
      });
    }
    console.log('');

    // 3. Check sensor_logs entries
    console.log('3️⃣ Checking sensor_logs entries...');
    const sensorLogQuery = `
      SELECT 
        sl.ts,
        s.label as sensor_label,
        sc.metric_code,
        sc.channel_name,
        sl.value_raw,
        sl.value_engineered,
        sc.unit
      FROM sensor_logs sl
      JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
      JOIN sensors s ON sl.id_sensor = s.id_sensor
      WHERE sl.id_node = $1
      ORDER BY sl.ts DESC
      LIMIT 10
    `;
    const sensorLogResult = await pool.query(sensorLogQuery, [node.id_node]);
    
    console.log(`✅ Found ${sensorLogResult.rows.length} sensor_logs entries`);
    if (sensorLogResult.rows.length > 0) {
      console.log('\nLatest measurements:');
      sensorLogResult.rows.forEach((log, idx) => {
        console.log(`\n   [${idx + 1}] ${log.sensor_label} - ${log.metric_code}`);
        console.log(`       Timestamp: ${log.ts}`);
        console.log(`       Value: ${log.value_engineered || log.value_raw} ${log.unit}`);
      });
    }
    console.log('');

    // 4. Summary
    console.log('📊 Summary:');
    console.log(`   Node: ${nodeResult.rows.length > 0 ? '✅' : '❌'} Registered`);
    console.log(`   iot_log: ${iotLogResult.rows.length} entries`);
    console.log(`   sensor_logs: ${sensorLogResult.rows.length} entries`);
    console.log(`   Processed: ${iotLogResult.rows.filter(l => l.processed).length}/${iotLogResult.rows.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

checkTeltonikaData();
