# Quick Fix - PM2 Deployment Port 3000

## Issue: Backend Not Running on Port 3000

### Check What's Using Port 3000
```bash
# Check if port 3000 is in use
sudo lsof -i :3000

# Or using netstat
sudo netstat -tulpn | grep :3000

# Or using ss
sudo ss -tulpn | grep :3000
```

### Kill Process on Port 3000 (if needed)
```bash
# Find the PID
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

## Fixed Configuration

### 1. ecosystem.config.js
- ✅ PORT set to 3000
- ✅ Script path: `dist/main.js`

### 2. src/main.ts
- ✅ CORS configured for localhost:3000
- ✅ Firebase hosting domains added

## Deployment Steps

### Stop all PM2 processes
```bash
pm2 delete all
# Or specifically:
pm2 delete iot-backend
```

### Pull latest changes
```bash
cd /var/www/note-rencana/iot-service/iot-backend
git pull origin main
```

### Install dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

### Verify .env file
```bash
cat .env
# Make sure PORT is not set to 4000
# If PORT is set, make sure it's 3000 or remove it to use default
```

### Start with PM2
```bash
pm2 start ecosystem.config.js
```

### Check status
```bash
pm2 status
pm2 logs iot-backend --lines 50
```

### Test
```bash
# Should return 404 (means server is running)
curl localhost:3000

# Should return Swagger JSON
curl localhost:3000/api-json

# Should return HTML
curl localhost:3000/api
```

## Troubleshooting

### If port 3000 is occupied:
```bash
# Check what's using it
sudo lsof -i :3000

# If it's another app, either:
# 1. Stop that app
# 2. Change backend to different port (update ecosystem.config.js)
```

### If backend crashes immediately:
```bash
# Check PM2 logs
pm2 logs iot-backend --err

# Common issues:
# - Database not connected
# - Environment variables missing
# - Port already in use
```

### Verify database connection:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d iot_db -c "SELECT 1"
```

## Expected PM2 Status
```
┌────┬───────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name          │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │
├────┼───────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ 3  │ iot-backend   │ 0.0.1   │ cluster │ XXXXXX   │ Xs     │ 0    │ online    │ 0%       │ 50mb     │
└────┴───────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┘
```

## Environment Variables Priority
1. PM2 ecosystem.config.js `env` → **PORT: 3000**
2. .env file → Check if PORT is set
3. NestJS default from main.ts → `const port = Number(configService.get<string>('PORT')) || 3000;`

---

**Date:** November 30, 2025
**Backend Port:** 3000
