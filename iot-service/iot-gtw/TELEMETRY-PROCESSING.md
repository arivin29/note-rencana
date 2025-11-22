# Telemetry Processing System

## Overview

System untuk memproses data telemetry dari MQTT secara asynchronous menggunakan node profile mapping.

## Architecture

```
MQTT Message (topic: sensor)
    ↓
Save to iot_log (label: telemetry, processed: false)
    ↓
Background Scheduler (every minute)
    ↓
TelemetryProcessor:
  1. Find unprocessed iot_log with label='telemetry'
  2. Extract device_id from payload
  3. Find matching Node by dev_eui/code/serial_number
  4. Load Node's NodeProfile
  5. Parse payload using profile's mapping_json
  6. Match parsed data with Node's Sensors & SensorChannels
  7. Save to sensor_logs (with engineering conversion)
  8. Mark iot_log as processed
```

## Node Profile Mapping Structure

```json
{
  "sensors": [
    {
      "label": "Sensor-1-ESP-CS-F02",
      "catalogId": "catalog-xxx",
      "channels": [
        {
          "channelCode": "PRESSURE_1",
          "payloadPath": "battery.voltage",
          "unit": "bar"
        }
      ]
    }
  ],
  "metadata": {
    "deviceId": {
      "path": "device_id",
      "type": "string"
    },
    "timestamp": {
      "path": "timestamp",
      "type": "number"
    },
    "signalQuality": {
      "path": "metadata.rssi",
      "type": "number"
    }
  }
}
```

### Mapping Explanation

**sensors**: Array of sensor configurations
- `label`: Must match `sensors.label` in database
- `catalogId`: Reference to sensor catalog (optional)
- `channels`: Array of channel mappings

**channels**: Channel configuration
- `channelCode`: Must match `sensor_channels.metric_code` in database
- `payloadPath`: Dot notation path to extract value from MQTT payload
  - Example: `"battery.voltage"` → extracts `payload.battery.voltage`
  - Example: `"sensors.temperature"` → extracts `payload.sensors.temperature`
- `unit`: Unit of measurement (bar, celsius, etc)

**metadata**: Metadata extraction rules
- `deviceId.path`: Path to device identifier in payload
- `timestamp.path`: Path to timestamp in payload
- `signalQuality.path`: Path to signal quality metric

## Example Flow

### 1. MQTT Message Received

Topic: `sensor`

Payload:
```json
{
  "device_id": "ESP-001",
  "timestamp": 1700000000,
  "battery": {
    "voltage": 3.7
  },
  "sensors": {
    "temperature": 25.5,
    "flow_rate": 150.2
  },
  "metadata": {
    "rssi": -65
  }
}
```

### 2. Saved to iot_log

```sql
INSERT INTO iot_log (
  label, topic, payload, device_id, timestamp, processed
) VALUES (
  'telemetry',
  'sensor',
  '{"device_id":"ESP-001",...}',
  'ESP-001',
  NOW(),
  false
);
```

### 3. Background Processing

Scheduler runs every minute:

```typescript
// Find node by device_id
node = find Node where dev_eui = 'ESP-001' OR code = 'ESP-001'

// Load profile
profile = node.nodeProfile with mapping_json

// Parse payload
parsedData = parser.parse(payload, profile.mapping_json)
// Result:
// - Sensor-1: PRESSURE_1 = 3.7 bar (from battery.voltage)
// - Sensor-2: TEMPERATURE_3 = 25.5 celsius (from sensors.temperature)
// - Sensor-2: FLOW_2 = 150.2 m3/h (from sensors.flow_rate)
```

### 4. Match with Database

```typescript
// Find sensors by label
sensor1 = sensors.find(label == 'Sensor-1-ESP-CS-F02')
sensor2 = sensors.find(label == 'Sensor-2-ESP-CS-F02')

// Find channels by metric_code
channel_pressure = sensor1.channels.find(metric_code == 'PRESSURE_1')
channel_temp = sensor2.channels.find(metric_code == 'TEMPERATURE_3')
channel_flow = sensor2.channels.find(metric_code == 'FLOW_2')
```

### 5. Save to sensor_logs

```sql
-- For each matched channel:
INSERT INTO sensor_logs (
  id_sensor_channel,
  id_sensor,
  id_node,
  id_project,
  ts,
  value_raw,
  value_engineered,
  quality_flag,
  ingestion_source
) VALUES (
  <channel_id>,
  <sensor_id>,
  <node_id>,
  <project_id>,
  '2025-11-20 12:00:00',
  3.7,                           -- raw value from payload
  3.7,                           -- engineered (after multiplier/offset)
  'good',
  'mqtt-gateway'
);
```

### 6. Engineering Conversion

If `sensor_channels` has `multiplier` or `offset_value`:

```typescript
value_engineered = (value_raw * multiplier) + offset_value

// Example:
// value_raw = 3.7
// multiplier = 1.1
// offset_value = 0.5
// value_engineered = (3.7 * 1.1) + 0.5 = 4.57
```

### 7. Mark as Processed

```sql
UPDATE iot_log
SET processed = true,
    notes = 'Processed successfully: 2 sensors, 3 channels, 3 sensor_logs created'
WHERE id = <iot_log_id>;
```

## API Endpoints

### Manual Trigger Processing

```bash
POST /api/telemetry-processor/process?limit=100
```

Response:
```json
{
  "message": "Processing completed",
  "totalProcessed": 10,
  "successCount": 9,
  "failureCount": 1,
  "results": [
    {
      "success": true,
      "iotLogId": "uuid",
      "nodeCode": "ESP-001",
      "profileCode": "profile-123",
      "sensorsProcessed": 2,
      "channelsProcessed": 3,
      "sensorLogsCreated": 3,
      "errors": [],
      "processingTimeMs": 45
    }
  ],
  "totalProcessingTimeMs": 450
}
```

### Get Processing Statistics

```bash
GET /api/telemetry-processor/stats
```

Response:
```json
{
  "totalUnprocessed": 5,
  "totalProcessed": 1234,
  "processedToday": 150,
  "failedToday": 2
}
```

## Automatic Processing

### Scheduler Configuration

**Cron Jobs:**

1. **Telemetry Processing** - Every minute
   ```typescript
   @Cron(CronExpression.EVERY_MINUTE)
   ```
   - Processes up to 100 unprocessed telemetry logs
   - Prevents concurrent execution

2. **Stats Logging** - Every 5 minutes
   ```typescript
   @Cron(CronExpression.EVERY_5_MINUTES)
   ```
   - Logs processing statistics
   - Monitors queue health

### Adjust Frequency

Edit [src/modules/scheduler/telemetry-scheduler.service.ts](src/modules/scheduler/telemetry-scheduler.service.ts):

```typescript
// Process every 30 seconds
@Cron('*/30 * * * * *')

// Process every 5 minutes
@Cron(CronExpression.EVERY_5_MINUTES)

// Process hourly
@Cron(CronExpression.EVERY_HOUR)

// Custom cron expression
@Cron('0 */15 * * * *')  // Every 15 minutes
```

## Error Handling

### Common Errors and Solutions

**1. Node Not Found**
```
Error: Node not found for device_id: ESP-001
Solution: Ensure node exists with matching dev_eui, code, or serial_number
```

**2. No Profile Assigned**
```
Error: Node ESP-001 has no assigned profile
Solution: Assign node_profile to the node via API or database
```

**3. Sensor Not Found**
```
Error: Sensor not found: Sensor-1-ESP-CS-F02
Solution: Ensure sensor exists with exact label match
```

**4. Channel Not Found**
```
Error: Channel not found: PRESSURE_1 for sensor Sensor-1
Solution: Ensure sensor_channel exists with metric_code = PRESSURE_1
```

**5. Value Parse Error**
```
Error: Value not found at path: battery.voltage
Solution: Check payload structure and payloadPath in mapping
```

**6. Type Conversion Error**
```
Error: Cannot convert value to number: "invalid"
Solution: Ensure payload values are numeric or parseable
```

## Monitoring

### Check Logs

```bash
# Watch application logs
tail -f logs/application.log | grep TelemetryProcessor

# Watch scheduler logs
tail -f logs/application.log | grep TelemetryScheduler
```

### Key Log Messages

**Success:**
```
[TelemetryProcessor] ✅ Processing completed: 3 sensor_logs created for node ESP-001
[TelemetryScheduler] Scheduled processing completed: 10 success, 0 failed, 450ms
```

**Warnings:**
```
[TelemetryParser] Device ID extracted from fallback field: deviceId
[TelemetryParser] Timestamp not found in payload, using current time
```

**Errors:**
```
[TelemetryProcessor] ❌ Node not found for device_id: UNKNOWN
[TelemetryProcessor] ❌ Profile not found or disabled for node ESP-001
```

## Performance Tuning

### Batch Size

Default: 100 logs per run

Increase for high-volume:
```typescript
// In telemetry-scheduler.service.ts
await this.telemetryProcessorService.processUnprocessedLogs(500);
```

### Processing Frequency

Adjust cron expression based on data rate:

- **High Volume** (>1000 msg/min): Every 30 seconds
- **Medium Volume** (100-1000 msg/min): Every minute (default)
- **Low Volume** (<100 msg/min): Every 5 minutes

### Database Optimization

1. **Indexes** already created:
   - `iot_log(label, processed)`
   - `sensor_logs(id_sensor_channel, ts)`

2. **Partition** sensor_logs by time for large datasets:
   ```sql
   -- Partition by month
   CREATE TABLE sensor_logs_2025_11 PARTITION OF sensor_logs
   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
   ```

## Troubleshooting

### Queue Buildup

**Symptom:** `totalUnprocessed` keeps increasing

**Diagnosis:**
```bash
GET /api/telemetry-processor/stats
```

**Solutions:**
1. Increase batch size
2. Increase processing frequency
3. Check for recurring errors
4. Review node profile configurations

### Processing Failures

**Symptom:** `failureCount` high

**Diagnosis:**
```bash
# Query failed logs
SELECT * FROM iot_log
WHERE processed = true
AND (notes LIKE '%error%' OR notes LIKE '%failed%')
ORDER BY updated_at DESC
LIMIT 10;
```

**Solutions:**
1. Review error messages in `iot_log.notes`
2. Fix profile mappings
3. Ensure sensors and channels exist
4. Validate payload formats

### Performance Issues

**Symptom:** `processingTimeMs` > 1000ms per log

**Diagnosis:**
- Enable database query logging
- Check database indexes
- Review payload complexity

**Solutions:**
1. Optimize database queries
2. Add caching for node profiles
3. Batch sensor_logs inserts
4. Scale horizontally (multiple instances)

## Development

### Add Custom Parser Type

Currently supports: `custom`, `json_path`

To add new parser type (e.g., `lorawan`):

1. Update [telemetry-parser.service.ts](src/modules/telemetry-processor/telemetry-parser.service.ts)
2. Add parser logic for new type
3. Update node_profile.parser_type enum

### Test Processing

```bash
# 1. Insert test iot_log
INSERT INTO iot_log (label, payload, device_id, processed)
VALUES ('telemetry', '{"device_id":"TEST-001","value":123}', 'TEST-001', false);

# 2. Trigger processing
curl -X POST http://localhost:4000/api/telemetry-processor/process

# 3. Check result
SELECT * FROM sensor_logs WHERE id_node = (
  SELECT id_node FROM nodes WHERE code = 'TEST-001'
) ORDER BY created_at DESC LIMIT 10;
```

## Best Practices

1. **Profile Validation**: Validate mapping_json before saving
2. **Label Consistency**: Use consistent sensor labels across profiles
3. **Payload Format**: Standardize MQTT payload structure
4. **Error Logging**: Monitor `iot_log.notes` for patterns
5. **Regular Cleanup**: Archive old processed iot_log records
6. **Profile Versioning**: Keep profile change history
7. **Testing**: Test profiles with sample payloads before deployment

## Security

- **SQL Injection**: Protected by TypeORM parameterized queries
- **Input Validation**: JSON paths validated before execution
- **Resource Limits**: Batch size limits prevent memory issues
- **Error Exposure**: Errors logged internally, not exposed in API

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
