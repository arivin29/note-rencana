module.exports = {
  apps: [
    {
      name: 'iot-angular',
      script: 'npx',
      args: 'http-server dist -p 3002 -g',
      cwd: './dist',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
