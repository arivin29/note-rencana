import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'iot',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function seedUnpairedDevices() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Get first node model for reference
    const nodeModelResult = await AppDataSource.query(
      'SELECT id_node_model FROM node_models LIMIT 1',
    );
    const nodeModelId = nodeModelResult[0]?.id_node_model;

    if (!nodeModelId) {
      console.log('⚠️  No node models found. Creating a sample node model first...');

      const [newModel] = await AppDataSource.query(`
        INSERT INTO node_models (
          model_code, vendor, model_name, protocol,
          communication_band, power_type, supports_codegen
        ) VALUES (
          'LORA-TEMP-001', 'Generic', 'LoRa Temperature Sensor', 'lorawan',
          '868MHz', 'battery', false
        ) RETURNING id_node_model
      `);

      console.log('✅ Created sample node model');
    }

    // Get updated node model ID
    const [nodeModel] = await AppDataSource.query(
      'SELECT id_node_model FROM node_models LIMIT 1',
    );
    const modelId = nodeModel.id_node_model;

    // Get first project for suggested_project (optional)
    const projectResult = await AppDataSource.query(
      'SELECT id_project FROM projects LIMIT 1',
    );
    const suggestedProjectId = projectResult[0]?.id_project || null;

    // Get first owner for suggested_owner (optional)
    const ownerResult = await AppDataSource.query(
      'SELECT id_owner FROM owners LIMIT 1',
    );
    const suggestedOwnerId = ownerResult[0]?.id_owner || null;

    console.log('\n📦 Creating unpaired devices dummy data...\n');

    // Sample unpaired devices with various scenarios
    const devices = [
      {
        hardware_id: '867584050123456',
        id_node_model: modelId,
        last_payload: { temperature: 25.5, humidity: 60, battery: 85 },
        last_topic: 'devices/lora/867584050123456/up',
        seen_count: 45,
        suggested_project: suggestedProjectId,
        suggested_owner: suggestedOwnerId,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        hardware_id: '867584050123457',
        id_node_model: modelId,
        last_payload: { temperature: 22.3, humidity: 55, battery: 92 },
        last_topic: 'devices/lora/867584050123457/up',
        seen_count: 12,
        suggested_project: suggestedProjectId,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        hardware_id: '867584050123458',
        id_node_model: null, // Device without detected model
        last_payload: { data: 'unknown_format', raw: [0x01, 0x02, 0x03] },
        last_topic: 'devices/unknown/867584050123458/up',
        seen_count: 3,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (very recent)
      },
      {
        hardware_id: '867584050123459',
        id_node_model: modelId,
        last_payload: { temperature: 28.1, humidity: 70, battery: 45, signal: -85 },
        last_topic: 'devices/lora/867584050123459/up',
        seen_count: 156,
        suggested_project: suggestedProjectId,
        suggested_owner: suggestedOwnerId,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (stale)
      },
      {
        hardware_id: '867584050123460',
        id_node_model: modelId,
        last_payload: { temperature: 19.8, humidity: 48, battery: 100 },
        last_topic: 'devices/lora/867584050123460/up',
        seen_count: 8,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      },
      {
        hardware_id: '867584050123461',
        id_node_model: modelId,
        last_payload: { temperature: 24.7, humidity: 62, battery: 78, pressure: 1013.25 },
        last_topic: 'devices/lora/867584050123461/up',
        seen_count: 234,
        suggested_project: suggestedProjectId,
        status: 'ignored', // Ignored device
        last_seen_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        hardware_id: '00:1A:2B:3C:4D:5E', // MAC address format
        id_node_model: null,
        last_payload: { voltage: 3.3, current: 0.5, power: 1.65 },
        last_topic: 'devices/wifi/00:1A:2B:3C:4D:5E/telemetry',
        seen_count: 67,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      },
      {
        hardware_id: 'ESP32-DEV-001',
        id_node_model: null,
        last_payload: {
          sensors: {
            temp: 26.4,
            hum: 58,
          },
          device: {
            uptime: 86400,
            heap: 45000,
          },
        },
        last_topic: 'esp32/ESP32-DEV-001/status',
        seen_count: 1890,
        status: 'pending',
        last_seen_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      },
    ];

    // Insert devices
    for (const device of devices) {
      try {
        const result = await AppDataSource.query(
          `INSERT INTO node_unpaired_devices (
            hardware_id, id_node_model, last_payload, last_topic,
            seen_count, suggested_project, suggested_owner, status,
            last_seen_at, first_seen_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (hardware_id) DO UPDATE SET
            last_payload = EXCLUDED.last_payload,
            last_topic = EXCLUDED.last_topic,
            seen_count = EXCLUDED.seen_count,
            last_seen_at = EXCLUDED.last_seen_at
          RETURNING id_node_unpaired_device, hardware_id`,
          [
            device.hardware_id,
            device.id_node_model,
            JSON.stringify(device.last_payload),
            device.last_topic,
            device.seen_count,
            device.suggested_project,
            device.suggested_owner || null,
            device.status,
            device.last_seen_at,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago as first seen
          ],
        );

        console.log(
          `✅ Created/Updated: ${device.hardware_id} (${device.status}) - Last seen: ${device.last_seen_at.toISOString()}`,
        );
      } catch (err: any) {
        console.error(`❌ Failed to insert ${device.hardware_id}:`, err.message);
      }
    }

    // Show statistics
    const stats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'paired') as paired,
        COUNT(*) FILTER (WHERE status = 'ignored') as ignored,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours') as seen_last_24h,
        COUNT(*) FILTER (WHERE suggested_project IS NOT NULL) as with_suggestions
      FROM node_unpaired_devices
    `);

    console.log('\n📊 Unpaired Devices Statistics:');
    console.log('================================');
    console.log(`Total Devices:     ${stats[0].total}`);
    console.log(`Pending:           ${stats[0].pending}`);
    console.log(`Paired:            ${stats[0].paired}`);
    console.log(`Ignored:           ${stats[0].ignored}`);
    console.log(`Active (24h):      ${stats[0].seen_last_24h}`);
    console.log(`With Suggestions:  ${stats[0].with_suggestions}`);
    console.log('================================\n');

    await AppDataSource.destroy();
    console.log('✅ Seed completed successfully!');
    console.log('\n🔗 Access the page at: http://localhost:4200/iot/unpaired-devices\n');
  } catch (error: any) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seedUnpairedDevices();
