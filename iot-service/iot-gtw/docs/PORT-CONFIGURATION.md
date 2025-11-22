# Port Configuration

## Default Port: 4000

IoT Gateway service menggunakan **port 4000** untuk menghindari konflik dengan service lain.

---

## Configuration

### Environment Variable
```bash
# .env
PORT=4000
```

### Why Port 4000?
- ✅ Port 3000 sudah digunakan oleh service lain
- ✅ Port 4000 tersedia dan tidak konflik
- ✅ Standard untuk development services

---

## Service URLs

### Main Application
```
http://localhost:4000/api
```

### Health Check
```
http://localhost:4000/api/health
```

### IoT Logs API
```
http://localhost:4000/api/iot-logs
```

---

## Testing

### Check Service
```bash
curl http://localhost:4000/api/health
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
| **iot-gtw** (Gateway) | **4000** | http://localhost:4000/api |
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
  PORT: 4000  // ✅ Port 4000
},
```

---

## Troubleshooting

### Port Already in Use
If port 4000 is already used:

**Check what's using the port:**
```bash
lsof -i :4000
```

**Kill the process:**
```bash
kill -9 <PID>
```

**Or change port in .env:**
```bash
PORT=4001  # Use different port
```

---

**Default Port:** 4000  
**Last Updated:** November 22, 2025
