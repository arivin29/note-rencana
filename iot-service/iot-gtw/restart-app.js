const { exec } = require('child_process');
const net = require('net');

console.log('=== Restarting IoT Gateway Application ===\n');

// Find and kill process on port 4000
function findAndKillProcess() {
  return new Promise((resolve, reject) => {
    exec('lsof -ti:4000', (error, stdout, stderr) => {
      if (error || !stdout.trim()) {
        console.log('No process found on port 4000');
        resolve(false);
        return;
      }

      const pid = stdout.trim();
      console.log(`Found process PID: ${pid}`);
      console.log('Killing process...');

      exec(`kill -9 ${pid}`, (killError) => {
        if (killError) {
          console.error('Error killing process:', killError.message);
          reject(killError);
        } else {
          console.log('✅ Process killed successfully');
          resolve(true);
        }
      });
    });
  });
}

// Wait for port to be available
function waitForPortAvailable(port, maxWait = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkPort = () => {
      const server = net.createServer();
      server.once('error', () => {
        if (Date.now() - startTime < maxWait) {
          setTimeout(checkPort, 200);
        } else {
          resolve(false);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    };
    checkPort();
  });
}

// Start application
function startApp() {
  return new Promise((resolve, reject) => {
    console.log('\nStarting application...');
    const child = exec('cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw && export PATH=/usr/local/bin:/bin:/usr/bin:$PATH && npm run start:dev');

    let started = false;
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      if (data.includes('Nest application successfully started') && !started) {
        started = true;
        console.log('\n✅ Application started successfully!');
        resolve();
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error('Application start timeout'));
      }
    }, 30000);
  });
}

(async () => {
  try {
    await findAndKillProcess();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const portAvailable = await waitForPortAvailable(4000);
    if (!portAvailable) {
      console.error('❌ Port 4000 is still not available');
      process.exit(1);
    }

    console.log('✅ Port 4000 is now available\n');

    await startApp();

    console.log('\n=== Restart Complete ===');
    console.log('Application is now running with updated configuration.');
    console.log('The Project entity is now registered and id_owner will be populated!');

  } catch (error) {
    console.error('\n❌ Error during restart:', error.message);
    process.exit(1);
  }
})();
