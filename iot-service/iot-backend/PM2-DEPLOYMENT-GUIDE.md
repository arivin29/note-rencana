# PM2 Deployment Guide

Quick reference for deploying IoT Backend with PM2 process manager.

## 📋 Prerequisites

```bash
# Install PM2 globally
npm install -g pm2
```

## 🚀 Quick Start

```bash
# 1. Build the application
npm run build

# 2. Start with PM2
npm run pm2:start

# 3. Check status
pm2 status

# 4. View logs
npm run pm2:logs
```

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start application with PM2 |
| `npm run pm2:stop` | Stop application |
| `npm run pm2:restart` | Restart application |
| `npm run pm2:reload` | Reload with zero-downtime |
| `npm run pm2:delete` | Remove from PM2 |
| `npm run pm2:logs` | View application logs |
| `npm run pm2:monit` | Monitor CPU/Memory usage |

## 🔧 PM2 Configuration

File: `ecosystem.config.js`

```javascript
{
  name: 'iot-backend',
  script: 'dist/main.js',
  instances: 1,
  exec_mode: 'cluster',
  autorestart: true,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'production',
    PORT: 3000,
  }
}
```

## 📊 Monitoring

### Check Status
```bash
pm2 status
pm2 list
```

### View Logs
```bash
# All logs
pm2 logs iot-backend

# Error logs only
pm2 logs iot-backend --err

# Last 100 lines
pm2 logs iot-backend --lines 100

# Clear logs
pm2 flush
```

### Monitor Resources
```bash
# Real-time monitoring
pm2 monit

# Process info
pm2 info iot-backend

# Dashboard (web-based)
pm2 plus
```

## 🔄 Zero-Downtime Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Reload (zero-downtime)
npm run pm2:reload
```

## 🔐 Auto-Start on System Boot

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Restore after reboot
pm2 resurrect
```

## 📂 Log Files

Logs are stored in `logs/` directory:
- `logs/pm2-error.log` - Error logs
- `logs/pm2-out.log` - Output logs
- `logs/pm2-combined.log` - Combined logs

## 🛠️ Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs iot-backend --err

# Check if port is in use
lsof -i :3000

# Delete and restart
npm run pm2:delete
npm run pm2:start
```

### High memory usage
```bash
# Check memory
pm2 monit

# Restart to free memory
npm run pm2:restart
```

### Database connection issues
```bash
# Check .env configuration
cat .env

# Verify database is running
psql -U postgres -d iot_db -c "SELECT 1"
```

## 🔗 Useful Links

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Monitoring](https://pm2.keymetrics.io/docs/usage/monitoring/)

## 📞 Support

For issues with PM2 deployment, check:
1. PM2 logs: `pm2 logs iot-backend`
2. Application logs: `logs/pm2-combined.log`
3. System logs: `journalctl -u pm2-*`

---

**Last Updated:** November 30, 2025
