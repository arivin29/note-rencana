# IoT Logs Module - Implementation Complete ✅

## 📋 Overview
Backend module untuk mengakses IoT logs dari GTW database dengan filtering berdasarkan periode, device, owner, dan project.

## 🎯 Features
- ✅ **Stats Endpoint**: Aggregate statistics (total, processed, unprocessed, by label)
- ✅ **List Endpoint**: Paginated logs dengan relations ke node/project/owner
- ✅ **Filter by Period**: startDate & endDate (ISO 8601 format)
- ✅ **Filter by Device**: device_id (node.code)
- ✅ **Filter by Owner**: owner ID dengan join ke project->node
- ✅ **Filter by Project**: project ID dengan join ke node
- ✅ **Filter by Label**: telemetry, event, error, warning, etc.
- ✅ **Filter by Status**: processed/unprocessed

## 📁 Files Created

### Entity
```
src/entities/iot-log.entity.ts
```
- Maps to existing `iot_log` table
- Includes relation to Node (device_id -> nodes.code)
- Enum values: lowercase (telemetry, event, pairing, error, warning, command, response, debug, info, log)

### DTOs
```
src/modules/iot-logs/dto/iot-log-stats.dto.ts
src/modules/iot-logs/dto/iot-log-filter.dto.ts
src/modules/iot-logs/dto/iot-log-response.dto.ts
src/modules/iot-logs/dto/index.ts
```

### Service
```
src/modules/iot-logs/iot-logs.service.ts
```
Methods:
- `getStats(filters?)`: Get aggregated statistics
- `findAll(filters?, page, limit)`: Get paginated logs with relations

### Controller
```
src/modules/iot-logs/iot-logs.controller.ts
```
Endpoints:
- `GET /api/iot-logs/stats` - Statistics with filters
- `GET /api/iot-logs` - Paginated list with filters

### Module
```
src/modules/iot-logs/iot-logs.module.ts
```

### App Module
```
src/app.module.ts (updated)
```
- Added IotLogsModule import

### Entities Index
```
src/entities/index.ts (updated)
```
- Added IotLog export

## 🔌 API Endpoints

### 1. Get Statistics
```http
GET /api/iot-logs/stats
```

**Query Parameters:**
- `deviceId` (optional): Filter by device/node code (e.g., "NODE-001")
- `ownerId` (optional): Filter by owner UUID
- `projectId` (optional): Filter by project UUID
- `label` (optional): Filter by label (telemetry, event, pairing, error, warning, command, response, debug, info, log)
- `processed` (optional): Filter by processed status (true/false)
- `startDate` (optional): ISO 8601 date (e.g., "2025-11-01T00:00:00.000Z")
- `endDate` (optional): ISO 8601 date (e.g., "2025-11-23T23:59:59.999Z")

**Response:**
```json
{
  "total": 1234,
  "processed": 900,
  "unprocessed": 334,
  "byLabel": {
    "telemetry": 800,
    "event": 150,
    "pairing": 50,
    "error": 100,
    "warning": 50,
    "command": 30,
    "response": 20,
    "debug": 20,
    "info": 10,
    "log": 4
  }
}
```

### 2. Get Logs List
```http
GET /api/iot-logs
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 100): Items per page
- `deviceId` (optional): Filter by device/node code
- `ownerId` (optional): Filter by owner UUID
- `projectId` (optional): Filter by project UUID
- `label` (optional): Filter by label
- `processed` (optional): Filter by processed status
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "deviceId": "NODE-001",
      "label": "telemetry",
      "topic": "device/NODE-001/telemetry",
      "payload": {
        "temperature": 25.5,
        "humidity": 60
      },
      "processed": false,
      "notes": null,
      "timestamp": "2025-11-23T10:00:00.000Z",
      "createdAt": "2025-11-23T10:00:00.000Z",
      "updatedAt": "2025-11-23T10:00:00.000Z",
      "node": {
        "idNode": "uuid-node",
        "code": "NODE-001",
        "idProject": "uuid-project",
        "project": {
          "idProject": "uuid-project",
          "name": "Project Alpha",
          "idOwner": "uuid-owner",
          "owner": {
            "idOwner": "uuid-owner",
            "name": "Acme Corp"
          }
        }
      }
    }
  ],
  "total": 1234,
  "page": 1,
  "limit": 100
}
```

## 🧪 Testing

### 1. Test Stats Endpoint
```bash
# Basic stats
curl http://localhost:3000/api/iot-logs/stats

# Filter by device
curl "http://localhost:3000/api/iot-logs/stats?deviceId=NODE-001"

# Filter by owner
curl "http://localhost:3000/api/iot-logs/stats?ownerId=uuid-owner"

# Filter by project
curl "http://localhost:3000/api/iot-logs/stats?projectId=uuid-project"

# Filter by label
curl "http://localhost:3000/api/iot-logs/stats?label=telemetry"

# Filter by date range
curl "http://localhost:3000/api/iot-logs/stats?startDate=2025-11-01T00:00:00.000Z&endDate=2025-11-23T23:59:59.999Z"

# Combined filters
curl "http://localhost:3000/api/iot-logs/stats?ownerId=uuid-owner&startDate=2025-11-01T00:00:00.000Z&label=error"
```

### 2. Test List Endpoint
```bash
# Get first page
curl http://localhost:3000/api/iot-logs

# Get specific page
curl "http://localhost:3000/api/iot-logs?page=2&limit=50"

# Filter by device with pagination
curl "http://localhost:3000/api/iot-logs?deviceId=NODE-001&page=1&limit=20"

# Filter by owner and date range
curl "http://localhost:3000/api/iot-logs?ownerId=uuid-owner&startDate=2025-11-01T00:00:00.000Z"
```

### 3. Check Swagger Documentation
```
http://localhost:3000/api
```

## 📊 Database Structure

### Existing Table: iot_log
```sql
Column      | Type          | Description
------------|---------------|---------------------------
id          | uuid          | Primary key
label       | enum          | Log category (lowercase)
topic       | varchar(500)  | MQTT topic
payload     | jsonb         | Log data
device_id   | varchar(255)  | Node code (FK to nodes.code)
timestamp   | timestamp     | Log timestamp
processed   | boolean       | Processing flag
notes       | text          | Processing notes
created_at  | timestamp     | Created timestamp
updated_at  | timestamp     | Updated timestamp
```

### Indexes
- `IDX_iot_log_label` on label
- `IDX_iot_log_device_id` on device_id
- `IDX_iot_log_processed` on processed
- `IDX_iot_log_created_at` on created_at
- `IDX_iot_log_timestamp` on timestamp

### Relations
- `device_id` → `nodes.code` (for owner/project context)
- `nodes.id_project` → `projects.id_project`
- `projects.id_owner` → `owners.id_owner`

## 🔄 Query Flow

### Stats Query with Owner Filter
```
1. Start with iot_log table
2. LEFT JOIN nodes ON iot_log.device_id = nodes.code
3. LEFT JOIN projects ON nodes.id_project = projects.id_project
4. LEFT JOIN owners ON projects.id_owner = owners.id_owner
5. WHERE owners.id_owner = :ownerId
6. GROUP BY label for statistics
```

### List Query with All Relations
```
1. Start with iot_log table
2. LEFT JOIN nodes (get node info)
3. LEFT JOIN projects (get project info)
4. LEFT JOIN owners (get owner info)
5. Apply all filters (device, owner, project, label, dates)
6. ORDER BY timestamp DESC
7. Apply pagination (SKIP/TAKE)
```

## 🎨 Angular Integration (Next Step)

After SDK generation, you can use:

```typescript
// In dashboard-admin component
import { IotLogsService } from '@sdk/core/services/iot-logs.service';

export class DashboardAdminPage {
  constructor(private iotLogsService: IotLogsService) {}

  loadStats() {
    // Get all stats
    this.iotLogsService.iotLogsControllerGetStats().subscribe(stats => {
      console.log('Total:', stats.total);
      console.log('By Label:', stats.byLabel);
    });

    // Get stats with filters
    this.iotLogsService.iotLogsControllerGetStats({
      ownerId: 'uuid-owner',
      startDate: '2025-11-01T00:00:00.000Z',
      endDate: '2025-11-23T23:59:59.999Z',
      label: 'error'
    }).subscribe(stats => {
      console.log('Filtered stats:', stats);
    });
  }

  loadLogs() {
    // Get paginated logs
    this.iotLogsService.iotLogsControllerFindAll({
      page: 1,
      limit: 100,
      deviceId: 'NODE-001'
    }).subscribe(result => {
      console.log('Logs:', result.data);
      console.log('Total:', result.total);
    });
  }
}
```

## 📝 Notes

1. **Table Already Exists**: No migration needed - using existing `iot_log` table
2. **Enum Values**: Using lowercase (telemetry, event, etc.) to match database
3. **Relations**: device_id links to nodes.code for owner/project context
4. **Performance**: All indexes already exist for optimal query performance
5. **Filtering**: Supports combining multiple filters (AND logic)
6. **Date Filtering**: Uses ISO 8601 format with BETWEEN clause
7. **Pagination**: Default 100 items per page, customizable

## ✅ Checklist

- [x] Create entity matching existing table structure
- [x] Create DTOs for request/response
- [x] Create service with filtering logic
- [x] Create controller with Swagger documentation
- [x] Create module
- [x] Update AppModule
- [x] Update entities index
- [x] Verify no compilation errors
- [ ] Generate SDK (user will do this)
- [ ] Test endpoints
- [ ] Integrate with Angular dashboard-admin

## 🚀 Next Steps

1. **Start Backend**: `npm run start:dev`
2. **Test Endpoints**: Use curl commands above
3. **Check Swagger**: http://localhost:3000/api
4. **Generate SDK**: User will run `npm run generate-sdk` in Angular project
5. **Integrate Frontend**: Use generated service in dashboard-admin component

---

**Status**: ✅ Implementation Complete
**Date**: November 23, 2025
**Ready for**: SDK Generation & Testing
