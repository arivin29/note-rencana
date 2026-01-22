# Port Configuration

## Default Port: 5001

IoT Gateway service menggunakan **port 5001** untuk menghindari konflik dengan service lain.

---

## Configuration

### Environment Variable
```bash
# .env
PORT=5001
```

### Why Port 5001?
- ✅ Port 3000 sudah digunakan oleh service lain
- ✅ Port 5001 tersedia dan tidak konflik
- ✅ Standard untuk development services

---

## Service URLs

### Main Application
```
http://localhost:5001/api
```

### Health Check
```
http://localhost:5001/api/health
```

### IoT Logs API
```
http://localhost:5001/api/iot-logs
```

---

## Testing

### Check Service
```bash
curl http://localhost:5001/api/health
```

### Expected Response
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "mqtt": { "status": "up" }
  }
}
```

---

## Other Services (Reference)

| Service | Port | URL |
|---------|------|-----|
| **iot-gtw** (Gateway) | **5001** | http://localhost:5001/api |
| iot-backend (Main API) | 3000 | http://localhost:3000 |
| iot-angular (Frontend) | 4200 | http://localhost:4200 |
| PostgreSQL | 5432 | - |
| MQTT Broker | 1883 | mqtt://localhost:1883 |

---

## PM2 Configuration

PM2 automatically uses the PORT from environment:

```javascript
// ecosystem.config.js
env: {
  NODE_ENV: 'development',
  PORT: 5001  // ✅ Port 5001
},
```

---

## Troubleshooting

### Port Already in Use
If port 5001 is already used:

**Check what's using the port:**
```bash
lsof -i :5001
```

**Kill the process:**
```bash
kill -9 <PID>
```

**Or change port in .env:**
```bash
PORT=5001  # Use different port
```

---

**Default Port:** 5001  
**Last Updated:** November 22, 2025
