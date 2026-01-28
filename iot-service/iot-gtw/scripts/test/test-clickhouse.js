/**
 * Test ClickHouse Connection
 * 
 * Usage: node scripts/test/test-clickhouse.js
 */

const { createClient } = require('@clickhouse/client');
require('dotenv').config();

async function testClickHouse() {
  console.log('🔍 Testing ClickHouse Connection...\n');

  const config = {
    host: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:${process.env.CLICKHOUSE_PORT || 8123}`,
    database: process.env.CLICKHOUSE_DATABASE || 'iot',
    username: process.env.CLICKHOUSE_USERNAME || 'iot_ingest',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  };

  console.log('📝 Config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   Password: ${config.password ? '***' : '(empty)'}\n`);

  try {
    const client = createClient(config);

    // Test 1: Basic connection
    console.log('1️⃣  Testing basic connection...');
    const pingResult = await client.query({
      query: 'SELECT 1 AS ok',
      format: 'JSONEachRow',
    });
    const pingData = await pingResult.json();
    console.log(`   ✅ Connection OK: ${JSON.stringify(pingData)}\n`);

    // Test 2: Check database exists
    console.log('2️⃣  Checking database...');
    const dbResult = await client.query({
      query: `SELECT name FROM system.databases WHERE name = '${config.database}'`,
      format: 'JSONEachRow',
    });
    const dbData = await dbResult.json();
    if (dbData.length > 0) {
      console.log(`   ✅ Database '${config.database}' exists\n`);
    } else {
      console.log(`   ⚠️  Database '${config.database}' not found. Run migration first.\n`);
    }

    // Test 3: Check tables
    console.log('3️⃣  Checking tables...');
    const tablesResult = await client.query({
      query: `SELECT name FROM system.tables WHERE database = '${config.database}'`,
      format: 'JSONEachRow',
    });
    const tablesData = await tablesResult.json();
    if (tablesData.length > 0) {
      console.log(`   ✅ Found ${tablesData.length} tables:`);
      tablesData.forEach(t => console.log(`      - ${t.name}`));
      console.log('');
    } else {
      console.log(`   ⚠️  No tables found. Run migration first.\n`);
    }

    // Test 4: Check table sizes (optional - requires system.parts access)
    if (tablesData.length > 0) {
      console.log('4️⃣  Table sizes...');
      try {
        const sizeResult = await client.query({
          query: `
            SELECT 
              table,
              formatReadableSize(sum(bytes)) AS size,
              sum(rows) AS rows
            FROM system.parts
            WHERE database = '${config.database}' AND active
            GROUP BY table
            ORDER BY sum(bytes) DESC
          `,
          format: 'JSONEachRow',
        });
        const sizeData = await sizeResult.json();
        if (sizeData.length > 0) {
          sizeData.forEach(t => {
            console.log(`   📊 ${t.table}: ${t.size} (${t.rows} rows)`);
          });
        } else {
          console.log(`   ℹ️  Tables are empty`);
        }
      } catch (sizeError) {
        console.log(`   ℹ️  Skipped (no system.parts access)`);
      }
      console.log('');
    }

    // Test 5: Test insert permission
    console.log('5️⃣  Testing insert permission...');
    try {
      const now = new Date();
      // ClickHouse DateTime64 format: YYYY-MM-DD HH:MM:SS.sss
      const clickhouseDateTime = now.toISOString().replace('T', ' ').replace('Z', '');
      
      await client.insert({
        table: 'iot.sensor_telemetry',
        values: [{
          event_time: clickhouseDateTime,
          device_id: 'TEST-DEVICE',
          owner_code: 'TEST1',
          owner_id: '00000000-0000-0000-0000-000000000000',
          project_code: 'Test Project',
          project_id: '00000000-0000-0000-0000-000000000000',
          node_id: '00000000-0000-0000-0000-000000000000',
          node_code: 'TEST-NODE',
          node_model: 'Test Model',
          sensor_id: '00000000-0000-0000-0000-000000000000',
          sensor_label: 'Test Sensor',
          sensor_catalog: '',
          channel_id: '00000000-0000-0000-0000-000000000000',
          metric_code: 'TEST_METRIC',
          metric_unit: 'test',
          raw_value: 123.45,
          eng_value: 123.45,
          signal_quality: 0,
          firmware_version: '1.0.0',
          iot_log_id: '00000000-0000-0000-0000-000000000000',
          pg_sensor_log_id: '00000000-0000-0000-0000-000000000000',
        }],
        format: 'JSONEachRow',
      });
      console.log('   ✅ Insert permission OK\n');

      // Cleanup test data
      console.log('6️⃣  Cleaning up test data...');
      await client.query({
        query: `ALTER TABLE iot.sensor_telemetry DELETE WHERE device_id = 'TEST-DEVICE'`,
      });
      console.log('   ✅ Cleanup OK\n');

    } catch (insertError) {
      console.log(`   ❌ Insert failed: ${insertError.message}\n`);
    }

    await client.close();
    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}\n`);
    console.log('Troubleshooting:');
    console.log('  1. Check if ClickHouse is running');
    console.log('  2. Verify host/port in .env');
    console.log('  3. Check user credentials');
    console.log('  4. Ensure network access is allowed');
    process.exit(1);
  }
}

testClickHouse();
