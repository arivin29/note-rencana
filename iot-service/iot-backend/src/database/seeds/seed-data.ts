import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Database configuration from .env
const AppDataSource = new DataSource({
  type: 'postgres',
  host: '109.105.194.174',
  port: 54366,
  username: 'postgres',
  password: 'Pantek123',
  database: 'iot',
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
  synchronize: false,
  logging: false,
});

async function seedData() {
  console.log('🚀 Starting comprehensive data seeding...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Get existing data
    const existingOwners = await AppDataSource.query('SELECT id_owner, name FROM owners LIMIT 3');
    const existingProjects = await AppDataSource.query('SELECT id_project, name, id_owner FROM projects LIMIT 3');
    const existingNodeModels = await AppDataSource.query('SELECT id_node_model, vendor, model_name FROM node_models LIMIT 3');
    const existingSensorTypes = await AppDataSource.query('SELECT id_sensor_type, category, default_unit FROM sensor_types LIMIT 5');
    const existingSensorCatalogs = await AppDataSource.query('SELECT id_sensor_catalog, vendor, model_name FROM sensor_catalogs LIMIT 5');

    console.log(`📊 Found existing data:`);
    console.log(`   Owners: ${existingOwners.length}`);
    console.log(`   Projects: ${existingProjects.length}`);
    console.log(`   Node Models: ${existingNodeModels.length}`);
    console.log(`   Sensor Types: ${existingSensorTypes.length}`);
    console.log(`   Sensor Catalogs: ${existingSensorCatalogs.length}\n`);

    // Use existing owners or create minimal ones
    const ownerId1 = existingOwners[0]?.id_owner || uuidv4();
    const ownerId2 = existingOwners[1]?.id_owner || uuidv4();
    const ownerId3 = existingOwners[2]?.id_owner || uuidv4();

    // Use existing projects or create minimal ones
    const projectId1 = existingProjects[0]?.id_project || uuidv4();
    const projectId2 = existingProjects[1]?.id_project || uuidv4();
    const projectId3 = existingProjects[2]?.id_project || uuidv4();

    // Use existing node model or get first available
    const nodeModelId = existingNodeModels[0]?.id_node_model;
    if (!nodeModelId) {
      console.error('❌ No node models found! Please add at least one node model first.');
      return;
    }

    // Use existing sensor types
    const sensorTypeTemp = existingSensorTypes.find(st => st.category.toLowerCase().includes('temp'))?.id_sensor_type;
    const sensorTypeHumi = existingSensorTypes.find(st => st.category.toLowerCase().includes('humi'))?.id_sensor_type;
    const sensorTypePres = existingSensorTypes.find(st => st.category.toLowerCase().includes('pres'))?.id_sensor_type;

    if (!sensorTypeTemp) {
      console.error('❌ No sensor types found! Please add sensor types first.');
      return;
    }

    // Use existing sensor catalog or get first available
    const sensorCatalogId = existingSensorCatalogs[0]?.id_sensor_catalog;

    console.log('📝 Starting node creation...\n');

    // Create 20 nodes with sensors
    const nodeCodes = [
      'RTU-HYDRO-01', 'RTU-HYDRO-02', 'RTU-HYDRO-03', 'ESP-FARM-01', 'ESP-FARM-02',
      'ESP-AQUA-01', 'ESP-AQUA-02', 'ESP-AQUA-03', 'MKR-MFG-01', 'MKR-MFG-02',
      'RTU-WARE-01', 'RTU-WARE-02', 'ESP-GREEN-01', 'ESP-GREEN-02', 'ESP-GREEN-03',
      'SIT-POND-01', 'SIT-POND-02', 'RTU-LINE-01', 'RTU-LINE-02', 'ESP-COLD-01'
    ];

    const projects = [projectId1, projectId2, projectId3];
    const connectivityStatuses = ['online', 'online', 'online', 'online', 'online', 'online', 'online', 'online', 'degraded', 'offline'];

    let nodeCount = 0;
    let sensorCount = 0;
    let channelCount = 0;
    let telemetryCount = 0;

    for (let i = 0; i < nodeCodes.length; i++) {
      const nodeId = uuidv4();
      const locationId = uuidv4();
      const code = nodeCodes[i];
      const projectId = projects[i % projects.length];
      const status = connectivityStatuses[i % connectivityStatuses.length];

      // Create node location (using POINT type: longitude, latitude)
      const longitude = 106.8 + (Math.random() * 0.1);
      const latitude = -6.2 + (Math.random() * 0.1);
      
      await AppDataSource.query(`
        INSERT INTO node_locations (id_node_location, id_project, coordinates, address)
        VALUES ($1, $2, POINT($3, $4), $5)
        ON CONFLICT DO NOTHING
      `, [locationId, projectId, longitude, latitude, `Location for ${code}`]);

      // Check if node already exists
      const existingNode = await AppDataSource.query(`
        SELECT id_node FROM nodes WHERE id_project = $1 AND code = $2
      `, [projectId, code]);

      if (existingNode.length > 0) {
        console.log(`   ⏭️  Node ${code} already exists, skipping...`);
        continue;
      }

      // Create node
      await AppDataSource.query(`
        INSERT INTO nodes (id_node, code, connectivity_status, id_project, id_node_model, id_current_location)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [nodeId, code, status, projectId, nodeModelId, locationId]);

      nodeCount++;

      // Create 1-4 sensors per node
      const numSensors = Math.floor(Math.random() * 4) + 1; // 1 to 4
      for (let j = 0; j < numSensors; j++) {
        const sensorId = uuidv4();
        const sensorLabel = `Sensor-${j + 1}-${code}`;

        await AppDataSource.query(`
          INSERT INTO sensors (id_sensor, id_node, id_sensor_catalog, label, sampling_rate)
          VALUES ($1, $2, $3, $4, $5)
        `, [sensorId, nodeId, sensorCatalogId, sensorLabel, 300]);

        sensorCount++;

        // Create 1-4 channels per sensor
        const numChannels = Math.floor(Math.random() * 4) + 1; // 1 to 4
        for (let k = 0; k < numChannels; k++) {
          const channelId = uuidv4();
          const metricCode = `metric_${k + 1}`;
          const channelLabel = `Channel-${k + 1}`;

          await AppDataSource.query(`
            INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, min_threshold, max_threshold)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [channelId, sensorId, sensorTypeTemp, metricCode, 0, 100]);

          channelCount++;

          // Create telemetry logs for last 48 hours
          const hoursBack = 48;
          const intervalMinutes = 10; // Log every 10 minutes
          const totalLogs = (hoursBack * 60) / intervalMinutes;

          for (let l = 0; l < totalLogs; l++) {
            const timestamp = new Date(Date.now() - (l * intervalMinutes * 60 * 1000));
            const value = 20 + (Math.sin(l / 10) * 5) + (Math.random() * 2 - 1); // Sine wave with noise

            await AppDataSource.query(`
              INSERT INTO sensor_logs (
                id_sensor_log, id_sensor, id_sensor_channel, id_node, id_project,
                value_raw, value_engineered, quality_indicator, ts
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              uuidv4(),
              sensorId,
              channelId,
              nodeId,
              projectId,
              value,
              value,
              'good',
              timestamp
            ]);

            telemetryCount++;
          }
        }
      }

      // Progress indicator
      if ((i + 1) % 5 === 0) {
        console.log(`   ✅ Created ${i + 1}/${nodeCodes.length} nodes...`);
      }
    }

    console.log('\n✅ Data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Nodes created:          ${nodeCount}`);
    console.log(`   Sensors created:        ${sensorCount}`);
    console.log(`   Channels created:       ${channelCount}`);
    console.log(`   Telemetry logs created: ${telemetryCount}\n`);

    // Show sample data
    const sampleNodes = await AppDataSource.query(`
      SELECT n.code, n.connectivity_status, p.name as project, o.name as owner,
             COUNT(DISTINCT s.id_sensor) as sensor_count
      FROM nodes n
      LEFT JOIN projects p ON n.id_project = p.id_project
      LEFT JOIN owners o ON p.id_owner = o.id_owner
      LEFT JOIN sensors s ON n.id_node = s.id_node
      GROUP BY n.code, n.connectivity_status, p.name, o.name
      ORDER BY n.code DESC
      LIMIT 5
    `);

    console.log('📋 Sample Nodes:');
    console.table(sampleNodes);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed
seedData()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
