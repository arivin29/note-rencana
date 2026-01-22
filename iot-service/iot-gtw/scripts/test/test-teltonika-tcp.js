/**
 * Test script untuk Teltonika TCP connection
 * 
 * Usage:
 *   node scripts/test/test-teltonika-tcp.js
 */

const net = require('net');

// Configuration
const HOST = 'localhost';
const PORT = 5027;
const IMEI = '123456789012345';

// Sample Teltonika data
const testData = {
  state: {
    reported: {
      ts: Date.now(),
      latlng: '-6.200000,106.816666',
      '9': 12000,   // ADC1 (voltage in mV)
      '66': 12000,  // ADC alternative
      '67': 245,    // Temperature (÷10 = 24.5°C)
      '72': 250,    // Temperature alternative
    }
  }
};

console.log('🧪 Teltonika TCP Test Client');
console.log('============================\n');

const client = new net.Socket();

client.connect(PORT, HOST, () => {
  console.log(`✅ Connected to ${HOST}:${PORT}`);
  
  // Step 1: Send IMEI (binary format)
  console.log(`📤 Sending IMEI: ${IMEI}`);
  const imeiLength = Buffer.alloc(2);
  imeiLength.writeUInt16BE(15, 0);
  const imeiBuffer = Buffer.from(IMEI, 'ascii');
  const imeiPacket = Buffer.concat([imeiLength, imeiBuffer]);
  
  client.write(imeiPacket);
  
  // Step 2: Send JSON data after a short delay
  setTimeout(() => {
    console.log(`📤 Sending JSON payload:`);
    console.log(JSON.stringify(testData, null, 2));
    
    client.write(JSON.stringify(testData));
  }, 500);
});

client.on('data', (data) => {
  console.log('\n📥 Response from server:');
  try {
    const response = JSON.parse(data.toString());
    console.log(JSON.stringify(response, null, 2));
    
    if (response.status === 'ok') {
      console.log('\n✅ Test SUCCESSFUL!');
    } else {
      console.log('\n❌ Test FAILED!');
    }
  } catch (error) {
    console.log(data.toString());
  }
  
  client.end();
});

client.on('close', () => {
  console.log('\n🔌 Connection closed');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('\n❌ Connection error:', err.message);
  process.exit(1);
});

// Timeout protection
setTimeout(() => {
  console.log('\n⏱️  Timeout - no response from server');
  client.destroy();
  process.exit(1);
}, 10000);
