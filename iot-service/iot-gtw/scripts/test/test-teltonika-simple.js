/**
 * Simple Teltonika TCP Test
 */

const net = require('net');

const client = new net.Socket();
const HOST = 'iot-gtw.demo.vm.devetek.com';
const PORT = 5027;
const IMEI = '123456789012345';

console.log('🧪 Testing Teltonika TCP Server');
console.log(`📡 Connecting to ${HOST}:${PORT}...\n`);

client.connect(PORT, HOST, () => {
  console.log('✅ CONNECTED!\n');
  
  // Step 1: Send IMEI
  console.log('📤 Step 1: Sending IMEI Header');
  const imeiLength = Buffer.alloc(2);
  imeiLength.writeUInt16BE(15, 0);
  const imeiBuffer = Buffer.from(IMEI, 'ascii');
  const imeiPacket = Buffer.concat([imeiLength, imeiBuffer]);
  
  console.log(`   IMEI: ${IMEI}`);
  console.log(`   Buffer: ${imeiPacket.toString('hex')}`);
  client.write(imeiPacket);
  
  // Step 2: Send JSON data after delay
  setTimeout(() => {
    console.log('\n📤 Step 2: Sending JSON Payload');
    const testData = {
      state: {
        reported: {
          ts: Date.now(),
          latlng: '-6.200000,106.816666',
          '9': 12000,   // ADC1 (voltage)
          '67': 245,    // Temperature (24.5°C)
        }
      }
    };
    
    const jsonStr = JSON.stringify(testData);
    console.log(`   JSON: ${jsonStr.substring(0, 100)}...`);
    client.write(jsonStr);
  }, 1000);
});

client.on('data', (data) => {
  console.log('\n📥 RESPONSE FROM SERVER:');
  console.log(`   Raw: ${data.toString()}`);
  
  try {
    const json = JSON.parse(data.toString());
    console.log('   Parsed:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('   (Not JSON)');
  }
});

client.on('close', () => {
  console.log('\n🔌 Connection closed\n');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('\n⏱️  Timeout - closing connection');
  client.destroy();
}, 5000);
