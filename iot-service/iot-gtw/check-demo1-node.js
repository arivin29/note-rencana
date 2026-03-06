const { Client } = require('pg');

async function checkNode() {
  const client = new Client({
    host: '109.105.194.174',
    port: 54366,
    database: 'iot',
    user: 'iot_user',
    password: 'Bonsai.iot.db.2023!',
  });

  await client.connect();
  
  console.log('🔍 Checking node: DEMO1-986B2A90A994\n');
  
  // Check in nodes table
  const nodeQuery = `
    SELECT id_node, code, dev_eui, serial_number, id_node_profile, telemetry_interval_sec 
    FROM nodes 
    WHERE serial_number = 'DEMO1-986B2A90A994' 
       OR dev_eui = 'DEMO1-986B2A90A994' 
       OR code = 'DEMO1-986B2A90A994'
  `;
  
  const nodeResult = await client.query(nodeQuery);
  
  if (nodeResult.rows.length === 0) {
    console. Node NOT FOUND in database');log('
    console.log('   → Server will send minimal config with rs485.devices: []');
  } else {
    const node = nodeResult.rows[0];
    console.log('✅ Node FOUND:');
    console.log('   id_node:', node.id_node);
    console.log('   code:', node.code);
    console.log('   dev_eui:', node.dev_eui);
    console.log('   serial_number:', node.serial_number);
    console.log('   id_node_profile:', node.id_node_profile);
    console.log('   telemetry_interval_sec:', node.telemetry_interval_sec);
    
    // Check sensors
    const sensorQuery = `
      SELECT s.id_sensor, s.label, sc.default_channels_json 
      FROM sensors s
      LEFT JOIN sensor_catalogs sc ON s.id_sensor_catalog = sc.id_sensor_catalog
      WHERE s.id_node = $1
    `;
    
    const sensorResult = await client.query(sensorQuery, [node.id_node]);
    console.log('\n📊 Sensors attached:', sensorResult.rows.length);
    
    if (sensorResult.rows.length === 0) {
      console.log('   ❌ No sensors → rs485.devices will be []');
    } else {
      sensorResult.rows.forEach((sensor, i) => {
        console.log(`\n   Sensor ${i+1}:`);
        console.log('     id:', sensor.id_sensor);
        console.log('     label:', sensor.label);
        console.log('     has_config:', sensor.default_channels_json ? '✅' : '❌');
      });
    }
  }
  
  await client.end();
}

checkNode().catch(console.error);
