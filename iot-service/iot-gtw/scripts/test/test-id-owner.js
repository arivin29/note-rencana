const { DataSource } = require('typeorm');
const { typeormConfig, describeTarget } = require('../lib/env-config');

console.log(`🔌 ${describeTarget()}`);
const dataSource = new DataSource(typeormConfig());

(async () => {
  try {
    await dataSource.initialize();
    console.log('=== Testing id_owner in sensor_logs ===\n');

    // Check latest sensor_logs entries
    const result = await dataSource.query(`
      SELECT
        sl.id_sensor_log,
        sl.id_owner,
        sl.created_at,
        n.code as node_code,
        p.name as project_name,
        p.id_owner as project_owner
      FROM sensor_logs sl
      LEFT JOIN nodes n ON sl.id_node = n.id_node
      LEFT JOIN projects p ON sl.id_project = p.id_project
      ORDER BY sl.created_at DESC
      LIMIT 5;
    `);

    if (result.length === 0) {
      console.log('⚠️  No sensor_logs found yet. Waiting for telemetry data...');
    } else {
      console.log('Latest sensor_logs entries:');
      console.log('─'.repeat(100));

      result.forEach((row, index) => {
        const ownerStatus = row.id_owner ? '✅ HAS id_owner' : '❌ NULL id_owner';
        console.log(`\n${index + 1}. Sensor Log ID: ${row.id_sensor_log}`);
        console.log(`   Node: ${row.node_code}`);
        console.log(`   Project: ${row.project_name}`);
        console.log(`   id_owner in sensor_logs: ${row.id_owner || 'NULL'} ${ownerStatus}`);
        console.log(`   id_owner in projects: ${row.project_owner || 'NULL'}`);
        console.log(`   Created: ${row.created_at}`);
      });

      // Check if all have id_owner
      const withOwner = result.filter(r => r.id_owner !== null).length;
      const withoutOwner = result.filter(r => r.id_owner === null).length;

      console.log('\n' + '─'.repeat(100));
      console.log('\n📊 Summary:');
      console.log(`   ✅ With id_owner: ${withOwner}/${result.length}`);
      console.log(`   ❌ Without id_owner: ${withoutOwner}/${result.length}`);

      if (withoutOwner === 0) {
        console.log('\n🎉 SUCCESS! All sensor_logs have id_owner populated from projects table!');
      } else {
        console.log('\n⚠️  Some sensor_logs still missing id_owner. These may be old data.');
      }
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
