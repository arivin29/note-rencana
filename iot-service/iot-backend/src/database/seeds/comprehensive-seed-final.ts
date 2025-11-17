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
    rejectUnauthorized: false,
  },
  synchronize: false,
  logging: false,
});

interface Owner {
  id: string;
  name: string;
  industry: string;
}

interface Project {
  id: string;
  ownerId: string;
  name: string;
}

interface NodeModel {
  id: string;
  vendor: string;
  modelName: string;
  protocol: string;
}

interface SensorType {
  id: string;
  category: string;
  unit: string;
}

interface SensorCatalog {
  id: string;
  vendor: string;
  modelName: string;
}

async function seedComprehensiveData() {
  console.log('🚀 Starting comprehensive IoT data seeding...\n');
  console.log('⏱️  This will take 3-5 minutes due to 50,000+ telemetry logs\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // ========================================
    // 1. SEED OWNERS (3 owners)
    // ========================================
    console.log('📦 Step 1/10: Creating Owners...');
    const owners: Owner[] = [
      { id: uuidv4(), name: 'AgroTech Solutions', industry: 'Agriculture' },
      { id: uuidv4(), name: 'AquaFarm Industries', industry: 'Aquaculture' },
      { id: uuidv4(), name: 'SmartFactory Corp', industry: 'Manufacturing' },
    ];

    for (const owner of owners) {
      await AppDataSource.query(
        `INSERT INTO owners (id_owner, name, industry, contact_person, sla_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_owner) DO NOTHING`,
        [owner.id, owner.name, owner.industry, `Contact at ${owner.name}`, 'gold']
      );
    }
    console.log(`   ✅ Created ${owners.length} owners\n`);

    // ========================================
    // 2. SEED PROJECTS (6 projects, 2 per owner)
    // ========================================
    console.log('📦 Step 2/10: Creating Projects...');
    const projects: Project[] = [
      { id: uuidv4(), ownerId: owners[0].id, name: 'Greenhouse Alpha' },
      { id: uuidv4(), ownerId: owners[0].id, name: 'Organic Farm Beta' },
      { id: uuidv4(), ownerId: owners[1].id, name: 'Shrimp Farm Delta' },
      { id: uuidv4(), ownerId: owners[1].id, name: 'Fish Hatchery Gamma' },
      { id: uuidv4(), ownerId: owners[2].id, name: 'Assembly Line 1' },
      { id: uuidv4(), ownerId: owners[2].id, name: 'Cold Storage Facility' },
    ];

    for (const project of projects) {
      await AppDataSource.query(
        `INSERT INTO projects (id_project, id_owner, name, area_type, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_project) DO NOTHING`,
        [project.id, project.ownerId, project.name, 'industrial', 'active']
      );
    }
    console.log(`   ✅ Created ${projects.length} projects\n`);

    // ========================================
    // 3. SEED NODE MODELS (5 models)
    // ========================================
    console.log('📦 Step 3/10: Creating Node Models...');
    const nodeModels: NodeModel[] = [
      { id: uuidv4(), vendor: 'Devetek', modelName: 'Edge-RTU-02', protocol: 'Modbus' },
      { id: uuidv4(), vendor: 'Arduino', modelName: 'MKR-1010-WiFi', protocol: 'MQTT' },
      { id: uuidv4(), vendor: 'Espressif', modelName: 'ESP32-DevKit', protocol: 'MQTT' },
      { id: uuidv4(), vendor: 'Siemens', modelName: 'SITRANS-FM', protocol: 'Modbus' },
      { id: uuidv4(), vendor: 'Teltonika', modelName: 'FMB130', protocol: 'TCP' },
    ];

    for (const model of nodeModels) {
      await AppDataSource.query(
        `INSERT INTO node_models (id_node_model, model_code, vendor, model_name, protocol, power_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (model_code) DO NOTHING`,
        [model.id, `${model.vendor.toUpperCase()}-${model.modelName}`, model.vendor, model.modelName, model.protocol, 'battery']
      );
    }
    console.log(`   ✅ Created ${nodeModels.length} node models\n`);

    // ========================================
    // 4. SEED SENSOR TYPES (10 types)
    // ========================================
    console.log('📦 Step 4/10: Creating Sensor Types...');
    const sensorTypes: SensorType[] = [
      { id: uuidv4(), category: 'temperature', unit: 'celsius' },
      { id: uuidv4(), category: 'humidity', unit: 'percent' },
      { id: uuidv4(), category: 'pressure', unit: 'bar' },
      { id: uuidv4(), category: 'flow', unit: 'm3/h' },
      { id: uuidv4(), category: 'level', unit: 'meter' },
      { id: uuidv4(), category: 'ph', unit: 'pH' },
      { id: uuidv4(), category: 'dissolved_oxygen', unit: 'mg/l' },
      { id: uuidv4(), category: 'voltage', unit: 'volt' },
      { id: uuidv4(), category: 'current', unit: 'ampere' },
      { id: uuidv4(), category: 'power', unit: 'watt' },
    ];

    for (const type of sensorTypes) {
      await AppDataSource.query(
        `INSERT INTO sensor_types (id_sensor_type, category, default_unit, precision)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id_sensor_type) DO NOTHING`,
        [type.id, type.category, type.unit, 0.01]
      );
    }
    console.log(`   ✅ Created ${sensorTypes.length} sensor types\n`);

    // ========================================
    // 5. SEED SENSOR CATALOGS (10 catalogs)
    // ========================================
    console.log('📦 Step 5/10: Creating Sensor Catalogs...');
    const sensorCatalogs: SensorCatalog[] = [
      { id: uuidv4(), vendor: 'Sensirion', modelName: 'SHT35' },
      { id: uuidv4(), vendor: 'Aosong', modelName: 'DHT22' },
      { id: uuidv4(), vendor: 'Rosemount', modelName: '3051' },
      { id: uuidv4(), vendor: 'Siemens', modelName: 'MAG5000' },
      { id: uuidv4(), vendor: 'ABB', modelName: 'LLT100' },
      { id: uuidv4(), vendor: 'Mettler Toledo', modelName: 'InPro4260' },
      { id: uuidv4(), vendor: 'Hach', modelName: 'LDO-HQ40d' },
      { id: uuidv4(), vendor: 'Fluke', modelName: 'V3000' },
      { id: uuidv4(), vendor: 'Honeywell', modelName: 'CT200' },
      { id: uuidv4(), vendor: 'Texas Instruments', modelName: 'INA219' },
    ];

    for (const catalog of sensorCatalogs) {
      await AppDataSource.query(
        `INSERT INTO sensor_catalogs (id_sensor_catalog, vendor, model_name, icon_color, calibration_interval_days)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_sensor_catalog) DO NOTHING`,
        [catalog.id, catalog.vendor, catalog.modelName, '#4dabf7', 365]
      );
    }
    console.log(`   ✅ Created ${sensorCatalogs.length} sensor catalogs\n`);

    // ========================================
    // 6. SEED NODES (20 nodes with locations)
    // ========================================
    console.log('📦 Step 6/10: Creating Nodes and Locations...');
    const nodeCodes = [
      'RTU-GH-A01', 'RTU-GH-A02', 'ESP-GH-A03', 'MKR-GH-A04',
      'RTU-OF-B01', 'ESP-OF-B02', 'MKR-OF-B03',
      'SIT-SF-C01', 'SIT-SF-C02', 'ESP-SF-C03', 'RTU-SF-C04',
      'RTU-FH-D01', 'ESP-FH-D02', 'MKR-FH-D03',
      'RTU-AL-E01', 'ESP-AL-E02', 'MKR-AL-E03',
      'RTU-CS-F01', 'ESP-CS-F02', 'ESP-CS-F03',
    ];

    const statuses = ['online', 'online', 'online', 'online', 'online', 'online', 'online', 'online', 'degraded', 'offline'];
    const nodes: any[] = [];

    for (let i = 0; i < nodeCodes.length; i++) {
      const nodeId = uuidv4();
      const locationId = uuidv4();
      const code = nodeCodes[i];
      const projectId = projects[Math.floor(i / 4) % projects.length].id; // Distribute across projects
      const modelId = nodeModels[i % nodeModels.length].id;
      const status = statuses[i % statuses.length];

      // Create location
      const longitude = 106.8 + (Math.random() * 0.2 - 0.1);
      const latitude = -6.2 + (Math.random() * 0.2 - 0.1);

      await AppDataSource.query(
        `INSERT INTO node_locations (id_node_location, id_project, type, coordinates, address, elevation)
         VALUES ($1, $2, $3, POINT($4, $5), $6, $7)`,
        [locationId, projectId, 'gps', longitude, latitude, `Location for ${code}`, 150]
      );

      // Create node
      await AppDataSource.query(
        `INSERT INTO nodes (id_node, id_project, id_node_model, code, connectivity_status, 
                            serial_number, telemetry_interval_sec, id_current_location, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id_project, code) DO NOTHING`,
        [
          nodeId,
          projectId,
          modelId,
          code,
          status,
          `SN-${code}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          300,
          locationId,
          new Date()
        ]
      );

      nodes.push({ id: nodeId, code, projectId, ownerId: projects.find(p => p.id === projectId)?.ownerId });
    }
    console.log(`   ✅ Created ${nodes.length} nodes with locations\n`);

    // ========================================
    // 7. SEED SENSORS (40-60 sensors, 1-4 per node)
    // ========================================
    console.log('📦 Step 7/10: Creating Sensors...');
    const sensors: any[] = [];

    for (const node of nodes) {
      const numSensors = Math.floor(Math.random() * 3) + 2; // 2-4 sensors per node

      for (let j = 0; j < numSensors; j++) {
        const sensorId = uuidv4();
        const catalogId = sensorCatalogs[Math.floor(Math.random() * sensorCatalogs.length)].id;

        await AppDataSource.query(
          `INSERT INTO sensors (id_sensor, id_node, id_sensor_catalog, label, sampling_rate, protocol_channel)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sensorId, node.id, catalogId, `Sensor-${j + 1}-${node.code}`, 300, `CH${j + 1}`]
        );

        sensors.push({ id: sensorId, nodeId: node.id, projectId: node.projectId, ownerId: node.ownerId });
      }
    }
    console.log(`   ✅ Created ${sensors.length} sensors\n`);

    // ========================================
    // 8. SEED SENSOR CHANNELS (100-150 channels, 1-4 per sensor)
    // ========================================
    console.log('📦 Step 8/10: Creating Sensor Channels...');
    const channels: any[] = [];

    for (const sensor of sensors) {
      const numChannels = Math.floor(Math.random() * 3) + 1; // 1-3 channels per sensor

      for (let k = 0; k < numChannels; k++) {
        const channelId = uuidv4();
        const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
        const metricCode = `${sensorType.category}_${k + 1}`;

        await AppDataSource.query(
          `INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, 
                                        unit, min_threshold, max_threshold, multiplier, offset_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id_sensor, metric_code) DO NOTHING`,
          [
            channelId,
            sensor.id,
            sensorType.id,
            metricCode,
            sensorType.unit,
            0,
            100,
            1.0,
            0.0
          ]
        );

        channels.push({
          id: channelId,
          sensorId: sensor.id,
          nodeId: sensor.nodeId,
          projectId: sensor.projectId,
          ownerId: sensor.ownerId,
          category: sensorType.category
        });
      }
    }
    console.log(`   ✅ Created ${channels.length} sensor channels\n`);

    // ========================================
    // 9. SEED SENSOR LOGS (50,000+ telemetry records)
    // ========================================
    console.log('📦 Step 9/10: Creating Sensor Logs (this takes time)...');
    console.log('   ⏱️  Generating 48 hours of telemetry data...');

    const hoursBack = 48;
    const intervalMinutes = 10; // Log every 10 minutes
    const totalLogsPerChannel = (hoursBack * 60) / intervalMinutes; // 288 logs per channel

    let logCount = 0;
    const batchSize = 500;
    let batch: any[] = [];

    for (const channel of channels) {
      // Generate realistic telemetry data based on sensor type
      const getBaseValue = (category: string) => {
        switch (category) {
          case 'temperature': return 25;
          case 'humidity': return 60;
          case 'pressure': return 1.0;
          case 'flow': return 5.0;
          case 'level': return 2.5;
          case 'ph': return 7.0;
          case 'dissolved_oxygen': return 8.0;
          case 'voltage': return 12.0;
          case 'current': return 2.0;
          case 'power': return 100;
          default: return 50;
        }
      };

      const baseValue = getBaseValue(channel.category);
      const amplitude = baseValue * 0.15; // ±15% variation

      for (let i = 0; i < totalLogsPerChannel; i++) {
        const minutesAgo = i * intervalMinutes;
        const timestamp = new Date(Date.now() - (minutesAgo * 60 * 1000));

        // Generate sine wave + random noise for realistic variation
        const sineWave = Math.sin((i / 30) * Math.PI); // ~15 hour cycle
        const randomNoise = (Math.random() - 0.5) * 0.2;
        const value = baseValue + (amplitude * sineWave) + (amplitude * randomNoise);

        batch.push([
          channel.id,
          channel.sensorId,
          channel.nodeId,
          channel.projectId,
          channel.ownerId,
          timestamp,
          value,
          value,
          'good',
          'api',
          200,
          Math.floor(Math.random() * 50),
          i
        ]);

        logCount++;

        // Bulk insert in batches
        if (batch.length >= batchSize) {
          const placeholders = batch.map((_, idx) => {
            const base = idx * 13;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`;
          }).join(',');

          await AppDataSource.query(
            `INSERT INTO sensor_logs (id_sensor_channel, id_sensor, id_node, id_project, id_owner, ts, 
                                      value_raw, value_engineered, quality_flag, ingestion_source, 
                                      status_code, ingestion_latency_ms, payload_seq)
             VALUES ${placeholders}`,
            batch.flat()
          );

          if (logCount % 5000 === 0) {
            console.log(`   📊 Progress: ${logCount.toLocaleString()} logs created...`);
          }

          batch = [];
        }
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const placeholders = batch.map((_, idx) => {
        const base = idx * 13;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`;
      }).join(',');

      await AppDataSource.query(
        `INSERT INTO sensor_logs (id_sensor_channel, id_sensor, id_node, id_project, id_owner, ts, 
                                  value_raw, value_engineered, quality_flag, ingestion_source, 
                                  status_code, ingestion_latency_ms, payload_seq)
         VALUES ${placeholders}`,
        batch.flat()
      );
    }

    console.log(`   ✅ Created ${logCount.toLocaleString()} sensor logs\n`);

    // ========================================
    // 10. SUMMARY
    // ========================================
    console.log('📦 Step 10/10: Generating Summary...\n');

    const summary = await AppDataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM owners) as owners,
        (SELECT COUNT(*) FROM projects) as projects,
        (SELECT COUNT(*) FROM node_models) as node_models,
        (SELECT COUNT(*) FROM nodes) as nodes,
        (SELECT COUNT(*) FROM sensors) as sensors,
        (SELECT COUNT(*) FROM sensor_types) as sensor_types,
        (SELECT COUNT(*) FROM sensor_catalogs) as sensor_catalogs,
        (SELECT COUNT(*) FROM sensor_channels) as channels,
        (SELECT COUNT(*) FROM sensor_logs) as telemetry_logs
    `);

    console.log('✅ Data seeding completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SEEDING SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Owners:               ${summary[0].owners}`);
    console.log(`Projects:             ${summary[0].projects}`);
    console.log(`Node Models:          ${summary[0].node_models}`);
    console.log(`Nodes:                ${summary[0].nodes}`);
    console.log(`Sensors:              ${summary[0].sensors}`);
    console.log(`Sensor Types:         ${summary[0].sensor_types}`);
    console.log(`Sensor Catalogs:      ${summary[0].sensor_catalogs}`);
    console.log(`Sensor Channels:      ${summary[0].channels}`);
    console.log(`Telemetry Logs:       ${summary[0].telemetry_logs.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sample data
    console.log('📋 Sample Nodes:\n');
    const sampleNodes = await AppDataSource.query(`
      SELECT 
        n.code,
        n.connectivity_status,
        p.name as project,
        o.name as owner,
        COUNT(DISTINCT s.id_sensor) as sensors,
        COUNT(DISTINCT sc.id_sensor_channel) as channels
      FROM nodes n
      LEFT JOIN projects p ON n.id_project = p.id_project
      LEFT JOIN owners o ON p.id_owner = o.id_owner
      LEFT JOIN sensors s ON n.id_node = s.id_node
      LEFT JOIN sensor_channels sc ON s.id_sensor = sc.id_sensor
      GROUP BY n.code, n.connectivity_status, p.name, o.name
      ORDER BY n.code
      LIMIT 10
    `);
    console.table(sampleNodes);

    console.log('\n📋 Telemetry Statistics:\n');
    const telemetryStats = await AppDataSource.query(`
      SELECT 
        COUNT(*) as total_logs,
        MIN(ts) as oldest_log,
        MAX(ts) as latest_log,
        AVG(value_engineered)::numeric(10,2) as avg_value,
        COUNT(DISTINCT id_sensor_channel) as active_channels
      FROM sensor_logs
    `);
    console.table(telemetryStats);

  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run the comprehensive seed
seedComprehensiveData()
  .then(() => {
    console.log('\n🎉 All done! Your IoT dashboard now has comprehensive test data.');
    console.log('   You can now test the frontend with realistic multi-tenant scenarios.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
