# IoT Gateway Service

Aplikasi NestJS untuk menerima data dari MQTT broker dan menyimpannya ke PostgreSQL.

## Features

- ✅ Subscribe ke MQTT topic `sensor`
- ✅ Auto-detect label dari payload (info, log, pairing, error, warning, debug, telemetry, command, response)
- ✅ Extract device ID dari payload secara otomatis
- ✅ Simpan data ke table `iot_log` di PostgreSQL
- ✅ REST API untuk query logs
- ✅ Health check endpoints (Database & MQTT)

## Prerequisites

- Node.js v20+
- PostgreSQL database
- MQTT broker

## Installation

```bash
npm install
```

## Environment Configuration

File `.env` sudah tersedia dengan konfigurasi:

```env
NODE_ENV=development
PORT=4000

# Database Configuration
DATABASE_URL=postgresql://postgres:Pantek123@109.105.194.174:54366/iot
DB_HOST=109.105.194.174
DB_PORT=54366
DB_USERNAME=postgres
DB_PASSWORD=Pantek123
DB_NAME=iot
DB_SSL=true

# MQTT Configuration
MQTT_BROKER_URL=mqtt://109.105.194.174:8366
MQTT_TOPIC=sensor
MQTT_CLIENT_ID=iot-gtw-service
```

## Database Migration

Jalankan migration untuk membuat table `iot_log`:

```bash
npm run build
node run-migration.js
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

Aplikasi akan berjalan di: http://localhost:4000

## Table Structure: iot_log

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| label | ENUM | Log label (info, log, pairing, error, warning, debug, telemetry, command, response) |
| topic | VARCHAR(500) | MQTT topic yang menerima message |
| payload | JSONB | Raw payload dari MQTT dalam format JSON |
| device_id | VARCHAR(255) | Device ID (extracted dari payload) |
| timestamp | TIMESTAMP | Waktu terima data |
| processed | BOOLEAN | Status apakah sudah diproses (default: false) |
| notes | TEXT | Catatan tambahan |
| created_at | TIMESTAMP | Waktu record dibuat |
| updated_at | TIMESTAMP | Waktu record terakhir diupdate |

### Indexes
- `label` - untuk query berdasarkan tipe log
- `device_id` - untuk query berdasarkan device
- `processed` - untuk query log yang belum diproses
- `created_at` - untuk sorting dan filtering by date
- `timestamp` - untuk sorting by event time

## API Endpoints

### Health Check

**Check All Services**
```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-20T04:48:36.769Z",
  "services": {
    "database": {
      "status": "ok",
      "message": "Database connection is healthy"
    },
    "mqtt": {
      "status": "ok",
      "message": "MQTT connection is healthy"
    }
  }
}
```

**Check Database Only**
```bash
GET /api/health/database
```

**Check MQTT Only**
```bash
GET /api/health/mqtt
```

### IoT Logs API

**Get Statistics**
```bash
GET /api/iot-logs/stats
```

Response:
```json
{
  "total": 150,
  "processed": 100,
  "unprocessed": 50,
  "byLabel": {
    "info": 20,
    "log": 50,
    "telemetry": 70,
    "error": 10
  }
}
```

**Get Unprocessed Logs**
```bash
GET /api/iot-logs/unprocessed?limit=100
```

**Get Logs by Label**
```bash
GET /api/iot-logs/by-label/telemetry?limit=50
```

**Get Logs by Device ID**
```bash
GET /api/iot-logs/by-device/device-123?limit=50
```

**Mark Log as Processed**
```bash
PATCH /api/iot-logs/:id/process
Content-Type: application/json

{
  "notes": "Processed successfully"
}
```

## MQTT Data Flow

1. **Subscribe ke Topic**: Aplikasi subscribe ke topic `sensor` di MQTT broker
2. **Receive Message**: Ketika ada message masuk, aplikasi akan:
   - Parse payload (support JSON dan non-JSON)
   - Auto-detect label berdasarkan content payload
   - Extract device ID dari payload
3. **Save to Database**: Data disimpan ke table `iot_log`

### Auto Label Detection

Aplikasi secara otomatis mendeteksi label berdasarkan content payload:

| Label | Detection Logic |
|-------|----------------|
| `pairing` | payload.action === 'pair' atau payload.type === 'pairing' |
| `error` | payload.error atau payload.status === 'error' |
| `warning` | payload.warning atau payload.status === 'warning' |
| `command` | payload.command atau payload.cmd |
| `response` | payload.response atau payload.reply |
| `telemetry` | payload.temperature, payload.humidity, payload.sensor, dll |
| `debug` | payload.debug atau payload.level === 'debug' |
| `info` | payload.info atau payload.level === 'info' |
| `log` | Default label |

### Auto Device ID Extraction

Device ID diekstrak dari payload dengan prioritas:
1. `payload.deviceId`
2. `payload.device_id`
3. `payload.nodeId`
4. `payload.node_id`
5. `payload.id`
6. `payload.clientId`

## Example MQTT Payloads

### Telemetry Data
```json
{
  "deviceId": "sensor-001",
  "temperature": 25.5,
  "humidity": 60,
  "timestamp": "2025-11-20T04:00:00Z"
}
```
→ Label: `telemetry`, Device ID: `sensor-001`

### Error
```json
{
  "deviceId": "sensor-002",
  "error": "Connection timeout",
  "code": "ERR_TIMEOUT"
}
```
→ Label: `error`, Device ID: `sensor-002`

### Pairing
```json
{
  "action": "pair",
  "deviceId": "sensor-003",
  "nodeType": "temperature"
}
```
→ Label: `pairing`, Device ID: `sensor-003`

### Command
```json
{
  "command": "reboot",
  "deviceId": "sensor-004"
}
```
→ Label: `command`, Device ID: `sensor-004`

### Non-JSON Data
```
Simple text message
```
→ Label: `log`, Payload: `{"raw": "Simple text message", "type": "non-json"}`

## Architecture

```
┌─────────────┐
│ MQTT Broker │
│ Topic:sensor│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MqttService │ ← Subscribe & Parse
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ IotLogService│ ← Auto-detect Label & Device ID
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  PostgreSQL  │
│ Table:iot_log│
└──────────────┘
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run start:dev
```

### Format Code
```bash
npm run format
```

## Production Deployment

1. Set environment ke production:
```env
NODE_ENV=production
```

2. Build aplikasi:
```bash
npm run build
```

3. Run migration:
```bash
node run-migration.js
```

4. Start aplikasi:
```bash
npm run start:prod
```

## Troubleshooting

### MQTT Connection Failed
- Pastikan MQTT broker accessible dari aplikasi
- Check firewall rules untuk port 8366
- Verify MQTT broker URL di `.env`

### Database Connection Failed
- Pastikan PostgreSQL accessible
- Verify database credentials di `.env`
- Check SSL settings jika menggunakan SSL

### Migration Failed
- Run `npm run build` terlebih dahulu
- Check database connection
- Verify PostgreSQL user has CREATE permission

## Notes

⚠️ **PENTING**:
- Table `iot_log` adalah table baru yang dibuat khusus untuk gateway ini
- Aplikasi **TIDAK** akan menghapus atau modify table lain yang sudah ada
- Gunakan `processed` field untuk track logs yang sudah diproses
- Payload disimpan dalam format JSONB untuk flexible querying

## License

ISC
