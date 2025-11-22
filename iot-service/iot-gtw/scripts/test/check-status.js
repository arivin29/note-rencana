const { execSync } = require('child_process');
const net = require('net');

console.log('=== Checking Application Status ===\n');

// 1. Check if port 4000 is in use
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is available
    });
    server.listen(port);
  });
};

async function main() {
  // Check port 4000
  const portInUse = await checkPort(4000);
  console.log(`Port 4000 status: ${portInUse ? 'IN USE' : 'AVAILABLE'}`);

  // Try to find Node processes
  try {
    const processes = execSync('ps aux | grep -E "nest.*start|node.*iot-gtw" | grep -v grep', { encoding: 'utf8' });
    console.log('\nRunning processes:');
    console.log(processes);
  } catch (e) {
    console.log('\nNo matching processes found (or ps command unavailable)');
  }

  // Try to kill process on port 4000
  if (portInUse) {
    try {
      console.log('\nAttempting to free port 4000...');
      execSync('lsof -ti:4000 | xargs kill -9', { encoding: 'utf8' });
      console.log('Port 4000 freed successfully');
    } catch (e) {
      console.log('Could not free port (lsof may not be available or no process found)');
    }
  }

  // Final check
  const portAfter = await checkPort(4000);
  console.log(`\nPort 4000 after cleanup: ${portAfter ? 'STILL IN USE' : 'NOW AVAILABLE'}`);
}

main();
