const { execSync } = require('child_process');

try {
  console.log('Running migration...');
  execSync('node ./node_modules/typeorm/cli.js migration:run -d dist/config/typeorm.config.js', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
