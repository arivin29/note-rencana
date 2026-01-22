const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

async function check() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        label,
        device_id,
        payload,
        processed,
        notes,
        timestamp
      FROM iot_log
      WHERE device_id = '123456789012345'
      ORDER BY timestamp DESC
      LIMIT 3
    `);
    
    console.log('\n📊 Latest iot_log entries for IMEI: 123456789012345\n');
    result.rows.forEach((row, idx) => {
      console.log(`[${idx + 1}] ${row.label} - ${row.processed ? '✅ Processed' : '❌ Failed'}`);
      console.log(`    Timestamp: ${row.timestamp}`);
      console.log(`    Payload: ${JSON.stringify(row.payload).substring(0, 100)}...`);
      if (row.notes) {
        console.log(`    ⚠️  Error: ${row.notes}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
