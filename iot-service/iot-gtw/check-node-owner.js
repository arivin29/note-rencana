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

    // Check nodes table structure
    const result = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nodes'
      ORDER BY ordinal_position;
    `);

    console.log('=== NODES TABLE COLUMNS ===');
    result.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable}`);
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
