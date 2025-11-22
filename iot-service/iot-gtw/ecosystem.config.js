module.exports = {
  apps: [{
    name: 'iot-gateway',
    script: 'dist/main.js',
    
    // Instances
    instances: 1,
    exec_mode: 'fork', // Use 'cluster' for multiple instances
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    
    // Logs
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced features
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Restart strategies
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Cron restart (optional - restart every day at 3 AM)
    // cron_restart: '0 3 * * *',
    
    // Additional settings
    time: true,
    
    // Source map support for better error traces
    source_map_support: true,
    
    // Ignore watching (for development)
    ignore_watch: [
      'node_modules',
      'logs',
      'dist',
      '.git'
    ],
    
    // Watch files (only for development mode with watch: true)
    watch_options: {
      followSymlinks: false,
      usePolling: false
    }
  }]
};
