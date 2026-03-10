# ML Module Operations Runbook

## Service Management

### Start Services

```bash
# Development
cd iot-gtw && npm run start:dev
cd iot-backend && npm run start:dev

# Production (PM2)
pm2 start ecosystem.config.js
```

### Stop Services

```bash
# Development
Ctrl+C

# Production
pm2 stop all
```

### Restart Services

```bash
pm2 restart iot-gtw
pm2 restart iot-backend
```

### Check Status

```bash
pm2 status
pm2 logs
```

---

## Detector Management

### List All Detectors

```bash
curl -s http://localhost:4000/api/ml/detectors | jq
```

### Create Detector

```bash
curl -X POST http://localhost:4000/api/ml/detectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pressure-detector-001",
    "type": "pressure",
    "deviceId": "HELIO-123456",
    "sensorKey": "channel-uuid"
  }'
```

### Start Detector

```bash
curl -X POST http://localhost:4000/api/ml/detectors/{detector_id}/start
```

### Stop Detector

```bash
curl -X POST http://localhost:4000/api/ml/detectors/{detector_id}/stop
```

### Delete Detector

```bash
curl -X DELETE http://localhost:4000/api/ml/detectors/{detector_id}
```

---

## Sync Operations

### Check Sync Status

```bash
curl -s http://localhost:4000/api/ml/sync/status | jq
```

Expected response:
```json
{
  "isSyncing": false,
  "lastSyncTimestamp": "2026-02-28T10:00:00.000Z",
  "openSearchReady": true,
  "circuitBreaker": {
    "state": "closed",
    "failures": 0
  }
}
```

### Trigger Manual Sync

```bash
curl -X POST http://localhost:4000/api/ml/sync/trigger
```

### Force Re-sync from Date

```bash
curl -X POST http://localhost:4000/api/ml/sync/resync \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2026-02-01T00:00:00.000Z"}'
```

---

## Anomaly Management

### List Anomalies

```bash
# All anomalies
curl -s "http://localhost:3000/api/ml/anomalies?page=1&limit=20" | jq

# By grade
curl -s "http://localhost:3000/api/ml/anomalies?minGrade=severe" | jq

# Unacknowledged only
curl -s "http://localhost:3000/api/ml/anomalies?acknowledged=false" | jq
```

### Get Anomaly Summary

```bash
curl -s http://localhost:3000/api/ml/anomalies/summary | jq
```

### Acknowledge Anomaly

```bash
curl -X POST http://localhost:3000/api/ml/anomalies/{anomaly_id}/acknowledge \
  -H "Authorization: Bearer {token}"
```

### Dashboard Stats

```bash
curl -s http://localhost:3000/api/ml/dashboard/summary | jq
```

---

## OpenSearch Operations

### Check Cluster Health

```bash
curl -sk -u admin:Dev3tek#Helios2026! \
  "https://iot-open-api.demo.vm.devetek.com/_cluster/health" | jq
```

### List Indices

```bash
curl -sk -u admin:Dev3tek#Helios2026! \
  "https://iot-open-api.demo.vm.devetek.com/_cat/indices?v"
```

### Check Index Count

```bash
curl -sk -u admin:Dev3tek#Helios2026! \
  "https://iot-open-api.demo.vm.devetek.com/sensor-telemetry-10min-*/_count" | jq
```

### List AD Detectors

```bash
curl -sk -u admin:Dev3tek#Helios2026! \
  "https://iot-open-api.demo.vm.devetek.com/_plugins/_anomaly_detection/detectors/_search" | jq
```

### Check ML Plugin Status

```bash
curl -sk -u admin:Dev3tek#Helios2026! \
  "https://iot-open-api.demo.vm.devetek.com/_plugins/_ml/stats" | jq
```

---

## ClickHouse Operations

### Test Connection

```bash
curl -s "http://109.105.194.174:8123" --user "iot_ingest:Pantek123" -d "SELECT 1"
```

### Check Record Count

```bash
curl -s "http://109.105.194.174:8123" --user "iot_ingest:Pantek123" \
  -d "SELECT count() FROM iot.sensor_telemetry"
```

### Query 10-Min Aggregation

```bash
curl -s "http://109.105.194.174:8123" --user "iot_ingest:Pantek123" -d "
SELECT 
    time_bucket,
    node_code,
    avgMerge(eng_avg_state) AS eng_avg
FROM iot.sensor_telemetry_10min
WHERE time_bucket >= now() - INTERVAL 1 HOUR
GROUP BY time_bucket, node_code
ORDER BY time_bucket DESC
LIMIT 10
FORMAT Pretty"
```

### Check Active Sensors (Last 24h)

```bash
curl -s "http://109.105.194.174:8123" --user "iot_ingest:Pantek123" -d "
SELECT DISTINCT
    node_code,
    toString(channel_id) AS channel_id
FROM iot.sensor_telemetry_10min
WHERE time_bucket >= now() - INTERVAL 24 HOUR
FORMAT Pretty"
```

---

## Monitoring

### Key Metrics to Monitor

| Metric | Query | Threshold |
|--------|-------|-----------|
| Sync lag | Last sync timestamp | > 15 min = alert |
| Circuit breaker | State = "open" | Alert immediately |
| Detector count | `/api/ml/detectors` | Expected count |
| Anomaly rate | `/api/ml/dashboard/summary` | Spike = investigate |
| OpenSearch health | `/_cluster/health` | Yellow/Red = alert |

### Log Monitoring

```bash
# Follow iot-gtw logs
pm2 logs iot-gtw --lines 100

# Search for errors
pm2 logs iot-gtw | grep -i error

# Follow all services
pm2 logs
```

---

## Emergency Procedures

### High Anomaly Volume

1. Check if detector sensitivity is too high
2. Review recent data for actual issues vs false positives
3. Temporarily increase `ML_ANOMALY_MIN_GRADE_ALERT`
4. Acknowledge false positives in bulk

### OpenSearch Down

1. Check cluster health
2. Restart OpenSearch if needed
3. iot-gtw will auto-reconnect with exponential backoff
4. Trigger manual sync after recovery

### ClickHouse Connection Lost

1. Check ClickHouse service
2. Verify network connectivity
3. Restart iot-gtw after ClickHouse recovers
4. Data will catch up on next sync

### Email Flood

1. Check `AlertDeduplicationService` stats
2. Increase suppression window if needed
3. Raise minimum grade for alerts
4. Review detector configurations

---

## Maintenance

### Weekly

- [ ] Review anomaly trends
- [ ] Check disk usage on OpenSearch
- [ ] Verify all detectors running

### Monthly

- [ ] Review false positive rate
- [ ] Tune detector sensitivity
- [ ] Clean old anomaly records (> 90 days)

### Quarterly

- [ ] Review ML model performance
- [ ] Update thresholds based on learning
- [ ] Capacity planning review
