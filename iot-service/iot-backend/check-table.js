const { Client } = require('pg');

async function checkTable() {
  const client = new Client({
    host: '109.105.194.174',
    port: 54366,
    user: 'postgres',
    password: 'Pantek123',
    database: 'iot',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'node_unpaired_devices'
      );
    `);

    const tableExists = result.rows[0].exists;

    if (tableExists) {
      console.log('✅ Table node_unpaired_devices EXISTS');

      // Get table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'node_unpaired_devices'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Count records
      const count = await client.query('SELECT COUNT(*) FROM node_unpaired_devices');
      console.log(`\n📊 Total records: ${count.rows[0].count}`);

    } else {
      console.log('❌ Table node_unpaired_devices DOES NOT EXIST');
      console.log('\n💡 You need to run the migration first:');
      console.log('   npm run typeorm migration:run');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTable();
