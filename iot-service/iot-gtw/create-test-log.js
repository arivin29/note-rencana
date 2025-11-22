const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: '109.105.194.174',
  port: 54366,
  username: 'postgres',
  password: 'Pantek123',
  database: 'iot',
});

(async () => {
  try {
    await dataSource.initialize();
    console.log('=== Creating Test Telemetry Log ===\n');

    // Create test iot_log entry
    const payload = {
      device_id: 'ESP-CS-F02',
      timestamp: Math.floor(Date.now() / 1000),
      battery: {
        voltage: 3.8
      },
      sensors: {
        temperature: 28.5,
        pressure: 1013.25
      }
    };

    const result = await dataSource.query(`
      INSERT INTO iot_log (label, topic, payload, device_id, processed, timestamp)
      VALUES ('telemetry', 'sensor', $1, $2, false, NOW())
      RETURNING id, label, device_id;
    `, [JSON.stringify(payload), 'ESP-CS-F02']);

    console.log('✅ Test telemetry log created:');
    console.log('   ID:', result[0].id);
    console.log('   Label:', result[0].label);
    console.log('   Device ID:', result[0].device_id);
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('\n⏳ Scheduler will process this log automatically within 1 minute...');
    console.log('   Or you can trigger manually: POST http://localhost:4000/api/telemetry-processor/process');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
