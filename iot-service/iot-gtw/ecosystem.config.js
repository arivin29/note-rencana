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
        PORT: 5001
    },
    env_production: {
      NODE_ENV: 'production',
        PORT: 5001
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
      restart_delay: 5001,
    
    // Graceful shutdown
    kill_timeout: 4001,
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
  }, {
    // =====================================================
    // App #2: iot-broadcast — push sensor_channel_latest ke broker PDAM.
    // Proses TERPISAH (crash domain sendiri) — flaky broker PDAM / OOM
    // publisher TIDAK menyentuh proses ingestion iot-gateway.
    // Ref: docs/design/mqtt-broadcast-spec.md §3.1
    // =====================================================
    name: 'iot-broadcast',
    script: 'dist/broadcast-main.js',

    instances: 1,
    exec_mode: 'fork',

    env: { NODE_ENV: 'development' },
    env_production: { NODE_ENV: 'production' },

    error_file: 'logs/pm2-broadcast-error.log',
    out_file: 'logs/pm2-broadcast-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,

    time: true,
    source_map_support: true
  }]
};
