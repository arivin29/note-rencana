const { spawn } = require('child_process');
const path = require('path');

console.log('=== Starting IoT Gateway Application ===\n');

const appDir = '/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw';

process.chdir(appDir);
process.env.PATH = '/usr/local/bin:/bin:/usr/bin:' + (process.env.PATH || '');

console.log('Working directory:', process.cwd());
console.log('Starting npm run start:dev...\n');

const child = spawn('/usr/local/bin/npm', ['run', 'start:dev'], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
  shell: false
});

child.on('error', (error) => {
  console.error('Failed to start application:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nStopping application...');
  child.kill('SIGINT');
});
