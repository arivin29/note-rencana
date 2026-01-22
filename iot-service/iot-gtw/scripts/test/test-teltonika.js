const net = require('net');

// Configuration
const HOST = 'localhost';
const PORT = 5027;
const IMEI = '123456789012345';

console.log('🧪 Teltonika FM125 Test Client');
console.log('================================\n');

const client = new net.Socket();

client.connect(PORT, HOST, () => {
  console.log(`✅ Connected to ${HOST}:${PORT}`);
  
  // Step 1: Send IMEI (Binary format)
  console.log('\n📤 Sending IMEI...');
  const imeiLength = Buffer.from([0x00, 0x0F]); // 15 in big-endian
  const imeiData = Buffer.from(IMEI);
  const imeiPacket = Buffer.concat([imeiLength, imeiData]);
  
  console.log(`   IMEI: ${IMEI}`);
  console.log(`   Packet: ${imeiPacket.toString('hex')}`);
  
  client.write(imeiPacket);
  
  // Step 2: Send JSON payload after 1 second
  setTimeout(() => {
    console.log('\n📤 Sending GPS data...');
    
    const payload = {
      state: {
        reported: {
          ts: Date.now(),
          latlng: '-6.200000,106.816666',
          72: 245,   // Temperature: 24.5°C
          9: 12000,  // Voltage: 12.0V
          240: 1,    // Movement detected
        }
      }
    };
    
    const jsonData = JSON.stringify(payload);
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    
    client.write(jsonData);
  }, 1000);
});

client.on('data', (data) => {
  console.log('\n📥 Response from server:');
  
  // Try to parse as JSON
  try {
    const response = JSON.parse(data.toString());
    console.log('   ', JSON.stringify(response, null, 2));
  } catch (e) {
    // Binary response (e.g., IMEI ACK)
    console.log('   Binary:', data.toString('hex'));
    console.log('   ASCII:', data.toString());
  }
});

client.on('close', () => {
  console.log('\n🔌 Connection closed');
  console.log('\n✅ Test completed!');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  client.destroy();
  process.exit(0);
});
