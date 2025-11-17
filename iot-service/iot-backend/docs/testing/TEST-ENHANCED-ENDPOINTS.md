# 🧪 Test Plan - Enhanced Endpoints

> **Testing Phase 1 Enhancements**
> **Date**: November 12, 2025
> **Server**: http://localhost:3000
> **Swagger UI**: http://localhost:3000/api

---

## 🎯 Test Objectives

1. ✅ Verify all 8 new endpoints are accessible
2. ✅ Check response structure matches DTOs
3. ✅ Validate aggregation queries return correct data
4. ✅ Test with empty database (no data scenario)
5. ✅ Test error handling (invalid IDs)
6. ✅ Document actual responses for frontend team

---

## 📋 Test Checklist

### 1. ✅ Sensors Module Enhancements

#### Test 1.1: GET /api/sensors/statistics/overview
**Purpose:** Aggregate sensor statistics

**Test Steps:**
1. Open Swagger UI: http://localhost:3000/api
2. Find `Sensors` section
3. Click `GET /api/sensors/statistics/overview`
4. Click "Try it out"
5. Click "Execute"

**Expected Response Structure:**
```json
{
  "totalSensors": 0,
  "activeSensors": 0,
  "sensorsNeedingCalibration": 0,
  "sensorsByCatalog": [],
  "sensorsByNode": [],
  "calibrationOverview": {
    "calibrated": 0,
    "needsCalibration": 0,
    "overdue": 0,
    "percentage": 0
  }
}
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

**Issues Found:** None / [Describe issues]

---

#### Test 1.2: GET /api/sensors/:id/dashboard
**Purpose:** Get sensor dashboard data

**Prerequisites:**
- Need at least 1 sensor in database
- Get sensor ID from: `GET /api/sensors`

**Test Steps:**
1. First, get sensor list: `GET /api/sensors`
2. Copy a sensor `idSensor` (UUID)
3. Open `GET /api/sensors/{id}/dashboard`
4. Click "Try it out"
5. Paste sensor ID
6. Click "Execute"

**Expected Response Structure:**
```json
{
  "sensor": {
    "idSensor": "uuid",
    "label": "string",
    "sensorChannels": [...],
    "calibrationStatus": {...}
  },
  "channels": [
    {
      "idSensorChannel": "uuid",
      "metricCode": "string",
      "unit": "string",
      "latestValue": null,
      "status": "active"
    }
  ],
  "recentActivity": [
    {
      "timestamp": "ISO8601",
      "type": "update|installation",
      "description": "string"
    }
  ],
  "health": {
    "overall": "good|warning|critical",
    "calibrationStatus": "good|warning|critical",
    "channelStatus": "active|no-channels",
    "lastReading": null
  }
}
```

**Test with Invalid ID:**
- Use fake UUID: `00000000-0000-0000-0000-000000000000`
- Expected: 404 Not Found

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

#### Test 1.3: GET /api/sensors/:id/channels
**Purpose:** List all channels for a sensor

**Test Steps:**
1. Use same sensor ID from Test 1.2
2. Open `GET /api/sensors/{id}/channels`
3. Click "Try it out"
4. Paste sensor ID
5. Click "Execute"

**Expected Response Structure:**
```json
[
  {
    "idSensorChannel": "uuid",
    "metricCode": "FLOW_RATE",
    "unit": "m3/h",
    "minThreshold": 0,
    "maxThreshold": 100,
    "sensorType": {
      "idSensorType": "uuid",
      "category": "flow"
    }
  }
]
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

### 2. ✅ Nodes Module Enhancements

#### Test 2.1: GET /api/nodes/statistics/overview
**Purpose:** Aggregate node statistics

**Test Steps:**
1. Open `GET /api/nodes/statistics/overview`
2. Click "Try it out"
3. Click "Execute"

**Expected Response Structure:**
```json
{
  "totalNodes": 0,
  "onlineNodes": 0,
  "offlineNodes": 0,
  "degradedNodes": 0,
  "nodesByModel": [
    {
      "modelName": "string",
      "count": 0,
      "percentage": 0
    }
  ],
  "nodesByProject": [
    {
      "idProject": "uuid",
      "projectName": "string",
      "nodeCount": 0
    }
  ],
  "connectivityOverview": {
    "online": 0,
    "offline": 0,
    "degraded": 0,
    "averageUptimePercentage": 0
  },
  "batteryOverview": {
    "lowBattery": 0,
    "mediumBattery": 0,
    "goodBattery": 0
  }
}
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

#### Test 2.2: GET /api/nodes/:id/dashboard
**Purpose:** Get node dashboard data

**Prerequisites:**
- Need at least 1 node in database
- Get node ID from: `GET /api/nodes`

**Test Steps:**
1. First, get node list: `GET /api/nodes`
2. Copy a node `idNode` (UUID)
3. Open `GET /api/nodes/{id}/dashboard`
4. Click "Try it out"
5. Paste node ID
6. Click "Execute"

**Expected Response Structure:**
```json
{
  "node": {
    "idNode": "uuid",
    "code": "NODE-001",
    "connectivityStatus": "online|offline|degraded",
    "sensors": [...]
  },
  "sensorsWithData": [
    {
      "idSensor": "uuid",
      "sensorCode": "string",
      "catalogName": "string",
      "status": "active",
      "channels": [
        {
          "idSensorChannel": "uuid",
          "metricCode": "string",
          "unit": "string",
          "latestValue": null,
          "timestamp": null,
          "status": "active"
        }
      ]
    }
  ],
  "recentActivity": [
    {
      "timestamp": "ISO8601",
      "type": "update|installation|telemetry",
      "description": "string"
    }
  ],
  "health": {
    "overall": "healthy|warning|critical",
    "connectivity": "healthy|warning|critical",
    "battery": "unknown",
    "sensors": "active|no-sensors",
    "lastTelemetry": "ISO8601"
  },
  "uptime": {
    "percentage": 0,
    "totalHours": 0,
    "onlineHours": 0,
    "lastOnline": "ISO8601",
    "lastOffline": null
  }
}
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

#### Test 2.3: GET /api/nodes/:id/sensors
**Purpose:** List all sensors attached to node

**Test Steps:**
1. Use same node ID from Test 2.2
2. Open `GET /api/nodes/{id}/sensors`
3. Click "Try it out"
4. Paste node ID
5. Click "Execute"

**Expected Response Structure:**
```json
[
  {
    "idSensor": "uuid",
    "code": "SNS-001",
    "catalog": {
      "idSensorCatalog": "uuid",
      "modelName": "string",
      "vendor": "string"
    },
    "installDate": "ISO8601",
    "status": "active",
    "channelCount": 0,
    "channels": [
      {
        "idSensorChannel": "uuid",
        "metricCode": "string",
        "unit": "string",
        "sensorType": {
          "idSensorType": "uuid",
          "category": "string"
        }
      }
    ]
  }
]
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

### 3. ✅ Sensor Channels Module Enhancements

#### Test 3.1: GET /api/sensor-channels/statistics/overview
**Purpose:** Aggregate channel statistics

**Test Steps:**
1. Open `GET /api/sensor-channels/statistics/overview`
2. Click "Try it out"
3. Click "Execute"

**Expected Response Structure:**
```json
{
  "totalChannels": 0,
  "activeChannels": 0,
  "channelsBySensorType": [
    {
      "category": "pressure|flow|temperature",
      "count": 0,
      "percentage": 0
    }
  ],
  "channelsBySensor": [
    {
      "idSensor": "uuid",
      "sensorCode": "string",
      "channelCount": 0
    }
  ],
  "thresholdOverview": {
    "totalWithThresholds": 0,
    "minThresholdSet": 0,
    "maxThresholdSet": 0,
    "bothThresholdsSet": 0
  },
  "aggregationMethods": [
    {
      "method": "avg|sum|min|max",
      "count": 0
    }
  ]
}
```

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

#### Test 3.2: GET /api/sensor-channels/:id/readings
**Purpose:** Get time-series readings

**Prerequisites:**
- Need at least 1 sensor channel in database
- Get channel ID from: `GET /api/sensor-channels`

**Test Steps:**
1. Get channel list: `GET /api/sensor-channels`
2. Copy a channel `idSensorChannel` (UUID)
3. Open `GET /api/sensor-channels/{id}/readings`
4. Click "Try it out"
5. Paste channel ID
6. Optional: Add query params:
   - startTime: `2025-11-11T00:00:00Z`
   - endTime: `2025-11-12T00:00:00Z`
   - aggregation: `5m`
7. Click "Execute"

**Expected Response Structure:**
```json
{
  "channel": {
    "idSensorChannel": "uuid",
    "metricCode": "string",
    "unit": "string",
    "sensorCode": "string",
    "nodeCode": "string"
  },
  "dataPoints": [],
  "statistics": {
    "min": 0,
    "max": 0,
    "avg": 0,
    "count": 0,
    "stdDev": 0
  },
  "gaps": [],
  "message": "Time-series data will be available when sensor_logs table is populated"
}
```

**Note:** This is a placeholder endpoint - will return empty data until sensor_logs is populated

**Status:** ⬜ Not Tested
**Actual Response:**
```
[Paste actual response here]
```

---

## 🔧 Error Scenarios to Test

### Invalid UUID Format
**Test:** Use invalid UUID format like `"abc123"`
**Expected:** 400 Bad Request with validation error

**Endpoints to test:**
- [ ] GET /api/sensors/abc123/dashboard
- [ ] GET /api/nodes/abc123/sensors
- [ ] GET /api/sensor-channels/abc123/readings

---

### Non-existent Resource
**Test:** Use valid UUID that doesn't exist: `00000000-0000-0000-0000-000000000000`
**Expected:** 404 Not Found

**Endpoints to test:**
- [ ] GET /api/sensors/00000000-0000-0000-0000-000000000000/dashboard
- [ ] GET /api/nodes/00000000-0000-0000-0000-000000000000/dashboard
- [ ] GET /api/sensor-channels/00000000-0000-0000-0000-000000000000/readings

---

## 📊 Performance Checks

### Response Time Targets
- Statistics endpoints: < 500ms
- Dashboard endpoints: < 1000ms
- List endpoints: < 300ms

**Measure in Swagger UI:** Look at "Duration" in response

| Endpoint | Target | Actual | Status |
|----------|--------|--------|--------|
| GET /sensors/statistics/overview | < 500ms | - | ⬜ |
| GET /nodes/statistics/overview | < 500ms | - | ⬜ |
| GET /sensor-channels/statistics/overview | < 500ms | - | ⬜ |
| GET /sensors/:id/dashboard | < 1000ms | - | ⬜ |
| GET /nodes/:id/dashboard | < 1000ms | - | ⬜ |

---

## 🎯 Data Validation

### Empty Database Scenario
**Current State:** Database may be empty or have minimal data

**What to verify:**
- ✅ Endpoints return successfully (200 OK)
- ✅ Counts are 0 (not null or undefined)
- ✅ Arrays are empty [] (not null)
- ✅ Percentages are 0 (not NaN)
- ✅ No SQL errors in console

---

## 📝 Test Results Summary

Fill this after testing:

### ✅ Passed Tests
- [ ] All 8 endpoints accessible
- [ ] Correct HTTP status codes
- [ ] Response structure matches DTOs
- [ ] No compilation errors
- [ ] No SQL errors

### ⚠️ Issues Found
1. [Issue description]
2. [Issue description]

### 🔄 Action Items
1. [ ] Fix issue #1
2. [ ] Add missing field #2
3. [ ] Optimize slow query #3

---

## 🚀 Next Steps After Testing

**If all tests pass:**
1. ✅ Mark Tasks 1-3 as complete
2. ✅ Update ENHANCEMENT-PHASE1-COMPLETE.md with test results
3. ✅ Proceed to Phase 2 (Dashboard Module - Tasks 4-7)
4. ✅ Share API docs with frontend team

**If issues found:**
1. ⚠️ Document issues in this file
2. ⚠️ Fix issues one by one
3. ⚠️ Re-test fixed endpoints
4. ⚠️ Re-run build to verify

---

## 📞 Quick Reference

**Server URLs:**
- API Base: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api
- Health Check: http://localhost:3000/api (GET)

**Testing Order:**
1. Statistics endpoints (no prerequisites)
2. Detail endpoints (need existing data)
3. Error scenarios
4. Performance checks

**Common UUIDs for Testing:**
- Fake UUID (should fail): `00000000-0000-0000-0000-000000000000`
- Invalid format (should fail): `abc123`

---

**Test Started:** [Date/Time]
**Test Completed:** [Date/Time]
**Tester:** [Name]
**Overall Status:** ⬜ Not Started / 🔄 In Progress / ✅ Passed / ⚠️ Issues Found
