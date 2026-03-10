# ML Module Troubleshooting Guide

## Common Issues

### 1. OpenSearch Connection Issues

#### Symptom
```
ERROR [OpenSearchService] OpenSearch error: Connection Error
WARN [OpenSearchService] Scheduling OpenSearch reconnect in 4000ms
```

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Wrong URL | Check `OPENSEARCH_URL` in `.env` - use domain not IP |
| SSL issues | Set `OPENSEARCH_SSL_VERIFY=false` for self-signed certs |
| Auth failed | Verify `OPENSEARCH_USER` and `OPENSEARCH_PASSWORD` |
| Network | Test: `curl -sk -u admin:password https://your-opensearch-url` |

#### Verify Connection
```bash
curl -sk -u admin:Dev3tek#Helios2026! https://iot-open-api.demo.vm.devetek.com
```

### 2. ClickHouse Sync Errors

#### Symptom
```
ERROR [SyncService] SyncService: Failed to connect to ClickHouse
ERROR [SyncService] ClickHouse query failed: Unknown expression identifier
```

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Missing config | Ensure `clickhouse.url` is available from config |
| Wrong credentials | Check `CLICKHOUSE_USERNAME` and `CLICKHOUSE_PASSWORD` |
| Table schema changed | Verify column names match actual table schema |
| DateTime format | Use `parseDateTimeBestEffort()` for ISO dates |

#### Verify Table Schema
```bash
curl -s "http://109.105.194.174:8123" --user "iot_ingest:Pantek123" \
  -d "DESCRIBE TABLE iot.sensor_telemetry_10min FORMAT Pretty"
```

### 3. No Anomalies Detected

#### Checklist

1. **Check detectors are running**
   ```bash
   curl http://localhost:4000/api/ml/detectors
   ```

2. **Check sync status**
   ```bash
   curl http://localhost:4000/api/ml/sync/status
   ```

3. **Check OpenSearch has data**
   ```bash
   curl -sk -u admin:password \
     "https://iot-open-api.demo.vm.devetek.com/sensor-telemetry-10min-*/_count"
   ```

4. **Check detector results**
   ```bash
   curl -sk -u admin:password \
     "https://iot-open-api.demo.vm.devetek.com/_plugins/_anomaly_detection/detectors/_search"
   ```

### 4. Email Notifications Not Sent

#### Checklist

1. **Check SMTP config in iot-backend**
   ```env
   MAIL_HOST=smtp.example.com
   MAIL_PORT=587
   MAIL_USER=your_email
   MAIL_PASSWORD=your_password
   ```

2. **Check alert deduplication**
   - Default suppression: 30 minutes per sensor
   - Verify with: `GET /api/notifications/alert-stats`

3. **Check minimum grade**
   - Default: Only `severe` and `critical` trigger emails
   - Config: `ML_ANOMALY_MIN_GRADE_ALERT=severe`

### 5. Dashboard Shows No Data

#### Frontend (Angular)

1. **Check API connectivity**
   ```bash
   curl http://localhost:3000/api/ml/dashboard/summary
   ```

2. **Check browser console for errors**
   - CORS issues
   - Auth token expired
   - API endpoint 404

3. **Verify environment**
   ```typescript
   // src/environments/environment.ts
   export const environment = {
     apiUrl: 'http://localhost:3000/api'
   };
   ```

### 6. Service Won't Start

#### Port Already in Use
```bash
# Find process using port
lsof -i :4000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Build Errors
```bash
# Rebuild
npm run build

# Clear cache
rm -rf dist node_modules/.cache
npm install
npm run build
```

### 7. AggregateFunction Column Errors (DataGrip)

#### Symptom
```
[HY000] Failed to read value for column raw_avg_state
Only native integer types are supported but we got: Float64
```

#### Cause
DataGrip cannot directly read `AggregateFunction` columns.

#### Solution
Use `-Merge` functions in queries:
```sql
SELECT 
    time_bucket,
    node_code,
    avgMerge(eng_avg_state) AS eng_avg,
    minMerge(eng_min_state) AS eng_min,
    maxMerge(eng_max_state) AS eng_max,
    countMerge(sample_count_state) AS sample_count
FROM iot.sensor_telemetry_10min
GROUP BY time_bucket, node_code
ORDER BY time_bucket DESC
LIMIT 20;
```

## Log Locations

| Service | Log Location |
|---------|-------------|
| iot-gtw | Console (dev) or `/var/log/iot-gtw.log` (prod) |
| iot-backend | Console (dev) or `/var/log/iot-backend.log` (prod) |
| OpenSearch | `/var/log/opensearch/` |
| ClickHouse | `/var/log/clickhouse-server/` |

## Health Checks

```bash
# iot-gtw
curl http://localhost:4000/api/health

# iot-backend
curl http://localhost:3000/api/health

# OpenSearch
curl -sk -u admin:password https://iot-open-api.demo.vm.devetek.com/_cluster/health

# ClickHouse
curl "http://109.105.194.174:8123" -d "SELECT 1"
```

## Support

For issues not covered here:
1. Check service logs
2. Review [ML-MODULE-README.md](ML-MODULE-README.md)
3. Contact: devops@devetek.com
