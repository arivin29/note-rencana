const { Client } = require('pg');

async function checkConversionFormula() {
  const client = new Client({
    host: '109.105.194.174',
    port: 54366,
    database: 'iot',
    user: 'postgres',
    password: 'Pantek123',
  });

  await client.connect();
  
  console.log('🔍 Checking conversion_formula setup...\n');
  
  // 1. Check sensor_types with formulas
  console.log('=== 1. SENSOR TYPES dengan conversion_formula ===');
  const typesQuery = `
    SELECT id_sensor_type, category, default_unit, conversion_formula
    FROM sensor_types
    WHERE conversion_formula IS NOT NULL
    LIMIT 10
  `;
  const typesResult = await client.query(typesQuery);
  console.log(`Found ${typesResult.rows.length} sensor types with formula:\n`);
  typesResult.rows.forEach((row, i) => {
    console.log(`${i+1}. ${row.category}`);
    console.log(`   Formula: ${row.conversion_formula}`);
    console.log(`   Unit: ${row.default_unit}`);
    console.log('');
  });
  
  // 2. Check sensor_channels linked to sensor_types
  console.log('\n=== 2. SENSOR CHANNELS dengan sensor_type (formula) ===');
  const channelsQuery = `
    SELECT 
      sc.id_sensor_channel,
      sc.metric_code,
      sc.id_sensor_type,
      st.category as type_name,
      st.conversion_formula,
      s.label as sensor_label,
      n.code as node_code
    FROM sensor_channels sc
    LEFT JOIN sensor_types st ON sc.id_sensor_type = st.id_sensor_type
    LEFT JOIN sensors s ON sc.id_sensor = s.id_sensor
    LEFT JOIN nodes n ON s.id_node = n.id_node
    WHERE sc.id_sensor_type IS NOT NULL
    AND st.conversion_formula IS NOT NULL
    LIMIT 20
  `;
  const channelsResult = await client.query(channelsQuery);
  console.log(`Found ${channelsResult.rows.length} channels with formula-enabled sensor_type:\n`);
  channelsResult.rows.forEach((row, i) => {
    console.log(`${i+1}. Node: ${row.node_code} | Sensor: ${row.sensor_label} | Channel: ${row.metric_code}`);
    console.log(`   Type: ${row.type_name}`);
    console.log(`   Formula: ${row.conversion_formula}`);
    console.log('');
  });
  
  // 3. Check channels WITHOUT sensor_type (formula won't apply)
  console.log('\n=== 3. SENSOR CHANNELS TANPA sensor_type (formula tidak jalan!) ===');
  const noTypeQuery = `
    SELECT 
      sc.id_sensor_channel,
      sc.metric_code,
      sc.id_sensor_type,
      s.label as sensor_label,
      n.code as node_code
    FROM sensor_channels sc
    LEFT JOIN sensors s ON sc.id_sensor = s.id_sensor
    LEFT JOIN nodes n ON s.id_node = n.id_node
    WHERE sc.id_sensor_type IS NULL
    LIMIT 10
  `;
  const noTypeResult = await client.query(noTypeQuery);
  console.log(`Found ${noTypeResult.rows.length} channels WITHOUT sensor_type:\n`);
  noTypeResult.rows.forEach((row, i) => {
    console.log(`${i+1}. Node: ${row.node_code} | Sensor: ${row.sensor_label} | Channel: ${row.metric_code}`);
    console.log(`   ⚠️  id_sensor_type: NULL → No formula conversion!`);
    console.log('');
  });
  
  // 4. Check recent sensor_logs to see if formula applied
  console.log('\n=== 4. RECENT SENSOR_LOGS (cek value_raw vs value_engineered) ===');
  const logsQuery = `
    SELECT 
      sl.ts,
      sl.value_raw,
      sl.value_engineered,
      sc.metric_code,
      st.conversion_formula,
      n.code as node_code
    FROM sensor_logs sl
    JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
    LEFT JOIN sensor_types st ON sc.id_sensor_type = st.id_sensor_type
    JOIN nodes n ON sl.id_node = n.id_node
    WHERE st.conversion_formula IS NOT NULL
    ORDER BY sl.ts DESC
    LIMIT 10
  `;
  const logsResult = await client.query(logsQuery);
  console.log(`Found ${logsResult.rows.length} recent logs with formula:\n`);
  logsResult.rows.forEach((row, i) => {
    const raw = parseFloat(row.value_raw);
    const eng = parseFloat(row.value_engineered);
    const converted = raw !== eng ? '✅ CONVERTED' : '❌ SAME (formula not applied?)';
    console.log(`${i+1}. ${row.node_code} | ${row.metric_code}`);
    console.log(`   Raw: ${raw} → Engineered: ${eng} ${converted}`);
    console.log(`   Formula: ${row.conversion_formula}`);
    console.log('');
  });
  
  await client.end();
}

checkConversionFormula().catch(console.error);
