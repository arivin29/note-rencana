# 📋 08 - API Specification

> **Document:** REST API Specification  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 8.1 API Overview

### Base URL
```
Production: https://api.example.com/api
Development: http://localhost:3000/api
```

### Authentication
All endpoints require JWT Bearer token (except public dashboards).

```http
Authorization: Bearer <jwt_token>
```

### Common Response Format

```typescript
// Success Response
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}

// Error Response
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}

// Paginated Response
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

## 8.2 Dashboard Endpoints

### GET /dashboards
Get list of dashboards with optional filters.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search by name/description |
| idProject | uuid | No | Filter by project |
| idOwner | uuid | No | Filter by owner (admin only) |
| isTemplate | boolean | No | Filter templates only |
| sortBy | string | No | Sort field: name, created_at, updated_at |
| sortOrder | string | No | ASC or DESC |
| skip | number | No | Offset for pagination |
| take | number | No | Limit (default: 20, max: 100) |

**Response:**
```json
{
  "items": [
    {
      "idDashboard": "550e8400-e29b-41d4-a716-446655440001",
      "idOwner": "550e8400-e29b-41d4-a716-446655440000",
      "idProject": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Production Monitoring",
      "description": "Real-time production line dashboard",
      "thumbnailUrl": null,
      "isPublic": false,
      "isTemplate": false,
      "widgetCount": 8,
      "createdAt": "2026-01-25T10:00:00Z",
      "updatedAt": "2026-01-25T14:30:00Z",
      "project": {
        "idProject": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Factory A"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

---

### GET /dashboards/:id
Get single dashboard with all widgets.

**Response:**
```json
{
  "idDashboard": "550e8400-e29b-41d4-a716-446655440001",
  "idOwner": "550e8400-e29b-41d4-a716-446655440000",
  "idProject": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Production Monitoring",
  "description": "Real-time production line dashboard",
  "thumbnailUrl": null,
  "isPublic": false,
  "isTemplate": false,
  "settings": {
    "refreshInterval": 30,
    "theme": "light",
    "timeRange": {
      "type": "relative",
      "value": "1h"
    }
  },
  "layout": {
    "columns": 12,
    "rowHeight": 50,
    "margin": [10, 10]
  },
  "widgets": [
    {
      "idWidget": "550e8400-e29b-41d4-a716-446655440010",
      "widgetType": "line-chart",
      "title": "Temperature Trend",
      "gridPosition": { "x": 0, "y": 0 },
      "gridSize": { "w": 6, "h": 4 },
      "dataSource": {
        "type": "sensor",
        "nodeId": "node-uuid",
        "sensorId": "sensor-uuid",
        "channelKey": "temperature",
        "aggregation": "avg",
        "groupBy": "minute"
      },
      "config": {
        "yAxisLabel": "Temperature (°C)",
        "lineColor": "#1890ff",
        "showLegend": true
      },
      "refreshIntervalSec": 30
    }
  ],
  "owner": {
    "idOwner": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp"
  },
  "project": {
    "idProject": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Factory A"
  },
  "createdAt": "2026-01-25T10:00:00Z",
  "updatedAt": "2026-01-25T14:30:00Z"
}
```

---

### POST /dashboards
Create new dashboard.

**Request Body:**
```json
{
  "name": "New Dashboard",
  "description": "Dashboard description",
  "idProject": "550e8400-e29b-41d4-a716-446655440002",
  "settings": {
    "refreshInterval": 30,
    "theme": "light",
    "timeRange": {
      "type": "relative",
      "value": "1h"
    }
  },
  "layout": {
    "columns": 12,
    "rowHeight": 50,
    "margin": [10, 10]
  }
}
```

**Response:** Created dashboard object (same as GET /dashboards/:id)

---

### PUT /dashboards/:id
Update dashboard properties.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "idProject": "550e8400-e29b-41d4-a716-446655440002",
  "settings": {
    "refreshInterval": 60,
    "theme": "dark",
    "timeRange": {
      "type": "relative",
      "value": "24h"
    }
  },
  "layout": {
    "columns": 12,
    "rowHeight": 60,
    "margin": [15, 15]
  },
  "isPublic": true
}
```

**Response:** Updated dashboard object

---

### DELETE /dashboards/:id
Delete dashboard and all its widgets.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard deleted successfully"
}
```

---

### POST /dashboards/:id/duplicate
Duplicate dashboard with all widgets.

**Response:** New dashboard object (duplicate)

---

### GET /dashboards/templates
Get available dashboard templates.

**Response:**
```json
{
  "items": [
    {
      "idDashboard": "template-uuid-1",
      "name": "Basic IoT Monitoring",
      "description": "Template with common IoT widgets",
      "widgetCount": 6,
      "thumbnailUrl": "/assets/templates/basic-iot.png"
    },
    {
      "idDashboard": "template-uuid-2",
      "name": "Environmental Monitoring",
      "description": "Temperature, humidity, and air quality",
      "widgetCount": 8,
      "thumbnailUrl": "/assets/templates/env-monitoring.png"
    }
  ]
}
```

---

### POST /dashboards/from-template/:templateId
Create new dashboard from template.

**Request Body:**
```json
{
  "name": "My New Dashboard",
  "description": "Based on template",
  "idProject": "project-uuid"
}
```

**Response:** New dashboard object with template widgets

---

## 8.3 Widget Endpoints

### GET /dashboards/:dashboardId/widgets
Get all widgets for a dashboard.

**Response:**
```json
{
  "items": [
    {
      "idWidget": "widget-uuid-1",
      "idDashboard": "dashboard-uuid",
      "widgetType": "line-chart",
      "title": "Temperature Trend",
      "gridPosition": { "x": 0, "y": 0 },
      "gridSize": { "w": 6, "h": 4 },
      "dataSource": { ... },
      "config": { ... },
      "refreshIntervalSec": 30,
      "zIndex": 0,
      "isVisible": true,
      "createdAt": "2026-01-25T10:00:00Z",
      "updatedAt": "2026-01-25T10:00:00Z"
    }
  ]
}
```

---

### POST /dashboards/:dashboardId/widgets
Create new widget.

**Request Body:**
```json
{
  "widgetType": "gauge",
  "title": "Current Temperature",
  "gridPosition": { "x": 6, "y": 0 },
  "gridSize": { "w": 3, "h": 3, "minW": 2, "minH": 2 },
  "dataSource": {
    "type": "sensor",
    "nodeId": "node-uuid",
    "sensorId": "sensor-uuid",
    "channelKey": "temperature",
    "aggregation": "last"
  },
  "config": {
    "min": 0,
    "max": 100,
    "unit": "°C",
    "thresholds": [
      { "value": 30, "color": "#52c41a" },
      { "value": 60, "color": "#faad14" },
      { "value": 100, "color": "#f5222d" }
    ]
  },
  "refreshIntervalSec": 30
}
```

**Response:** Created widget object

---

### PUT /dashboards/:dashboardId/widgets/:id
Update widget.

**Request Body:**
```json
{
  "title": "Updated Title",
  "gridPosition": { "x": 0, "y": 4 },
  "gridSize": { "w": 4, "h": 3 },
  "dataSource": { ... },
  "config": { ... },
  "refreshIntervalSec": 60
}
```

**Response:** Updated widget object

---

### PUT /dashboards/:dashboardId/widgets/bulk/positions
Bulk update widget positions (for drag-drop operations).

**Request Body:**
```json
{
  "positions": [
    { "idWidget": "widget-uuid-1", "x": 0, "y": 0, "w": 6, "h": 4 },
    { "idWidget": "widget-uuid-2", "x": 6, "y": 0, "w": 3, "h": 3 },
    { "idWidget": "widget-uuid-3", "x": 9, "y": 0, "w": 3, "h": 3 },
    { "idWidget": "widget-uuid-4", "x": 0, "y": 4, "w": 12, "h": 4 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 4
}
```

---

### DELETE /dashboards/:dashboardId/widgets/:id
Delete widget.

**Response:**
```json
{
  "success": true,
  "message": "Widget deleted successfully"
}
```

---

### POST /dashboards/:dashboardId/widgets/:id/duplicate
Duplicate widget within same dashboard.

**Response:** New widget object (duplicate)

---

## 8.4 Widget Data Endpoints

### GET /widget-data/:widgetId
Get data for a specific widget.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | No | Start time (ISO 8601) |
| to | string | No | End time (ISO 8601) |

**Response (Time Series):**
```json
{
  "widgetId": "widget-uuid",
  "dataType": "timeseries",
  "data": [
    { "timestamp": "2026-01-25T09:00:00Z", "value": 25.5 },
    { "timestamp": "2026-01-25T09:01:00Z", "value": 25.7 },
    { "timestamp": "2026-01-25T09:02:00Z", "value": 25.6 }
  ],
  "meta": {
    "nodeId": "node-uuid",
    "nodeName": "Production Node 1",
    "sensorId": "sensor-uuid",
    "sensorName": "Environmental Sensor",
    "channelKey": "temperature",
    "channelLabel": "Temperature",
    "unit": "°C",
    "aggregation": "avg",
    "groupBy": "minute",
    "from": "2026-01-25T09:00:00Z",
    "to": "2026-01-25T10:00:00Z",
    "pointCount": 60
  }
}
```

**Response (Single Value):**
```json
{
  "widgetId": "widget-uuid",
  "dataType": "single",
  "data": {
    "value": 25.7,
    "timestamp": "2026-01-25T10:00:00Z"
  },
  "meta": {
    "nodeId": "node-uuid",
    "sensorId": "sensor-uuid",
    "channelKey": "temperature",
    "unit": "°C"
  }
}
```

**Response (Table):**
```json
{
  "widgetId": "widget-uuid",
  "dataType": "table",
  "data": [
    {
      "timestamp": "2026-01-25T10:00:00Z",
      "temperature": 25.7,
      "humidity": 65.2,
      "pressure": 1013.25
    },
    {
      "timestamp": "2026-01-25T09:59:00Z",
      "temperature": 25.5,
      "humidity": 65.0,
      "pressure": 1013.20
    }
  ],
  "meta": {
    "columns": ["timestamp", "temperature", "humidity", "pressure"],
    "total": 100
  }
}
```

---

### POST /widget-data/query
Query data with custom parameters (for preview/testing).

**Request Body:**
```json
{
  "dataSource": {
    "type": "sensor",
    "nodeId": "node-uuid",
    "sensorId": "sensor-uuid",
    "channelKey": "temperature",
    "aggregation": "avg",
    "groupBy": "hour"
  },
  "timeRange": {
    "from": "2026-01-24T00:00:00Z",
    "to": "2026-01-25T00:00:00Z"
  },
  "widgetType": "line-chart"
}
```

**Response:** Same format as GET /widget-data/:widgetId

---

### GET /widget-data/preview/:widgetType
Get sample/preview data for widget configuration.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| nodeId | uuid | Yes | Node ID |
| sensorId | uuid | Yes | Sensor ID |
| channelKey | string | Yes | Channel key |

**Response:** Sample data for the widget type

---

## 8.5 Dashboard Sharing Endpoints

### GET /dashboards/:id/shares
Get sharing list for dashboard.

**Response:**
```json
{
  "items": [
    {
      "id": "share-uuid-1",
      "idDashboard": "dashboard-uuid",
      "sharedToOwnerId": "owner-uuid-2",
      "permission": "view",
      "createdAt": "2026-01-25T10:00:00Z",
      "sharedToOwner": {
        "idOwner": "owner-uuid-2",
        "name": "Partner Corp"
      }
    }
  ]
}
```

---

### POST /dashboards/:id/shares
Share dashboard with another owner.

**Request Body:**
```json
{
  "sharedToOwnerId": "owner-uuid-2",
  "permission": "view"
}
```

**Response:** Created share object

---

### DELETE /dashboards/:id/shares/:shareId
Remove share.

**Response:**
```json
{
  "success": true,
  "message": "Share removed successfully"
}
```

---

## 8.6 Data Source Helper Endpoints

### GET /data-sources/nodes
Get available nodes for data source selection.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| idProject | uuid | No | Filter by project |

**Response:**
```json
{
  "items": [
    {
      "idNode": "node-uuid-1",
      "name": "Production Node 1",
      "projectName": "Factory A",
      "status": "online"
    },
    {
      "idNode": "node-uuid-2",
      "name": "Production Node 2",
      "projectName": "Factory A",
      "status": "offline"
    }
  ]
}
```

---

### GET /data-sources/nodes/:nodeId/sensors
Get sensors for a node.

**Response:**
```json
{
  "items": [
    {
      "idSensor": "sensor-uuid-1",
      "name": "Environmental Sensor",
      "channels": [
        { "key": "temperature", "label": "Temperature", "unit": "°C" },
        { "key": "humidity", "label": "Humidity", "unit": "%" },
        { "key": "pressure", "label": "Pressure", "unit": "hPa" }
      ]
    },
    {
      "idSensor": "sensor-uuid-2",
      "name": "Power Meter",
      "channels": [
        { "key": "voltage", "label": "Voltage", "unit": "V" },
        { "key": "current", "label": "Current", "unit": "A" },
        { "key": "power", "label": "Power", "unit": "W" }
      ]
    }
  ]
}
```

---

## 8.7 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `DASHBOARD_NOT_FOUND` | 404 | Dashboard not found |
| `WIDGET_NOT_FOUND` | 404 | Widget not found |
| `ACCESS_DENIED` | 403 | No permission to access resource |
| `INVALID_DATA_SOURCE` | 400 | Invalid data source configuration |
| `INVALID_WIDGET_TYPE` | 400 | Unknown widget type |
| `DUPLICATE_NAME` | 409 | Dashboard name already exists |
| `MAX_WIDGETS_EXCEEDED` | 400 | Maximum widgets per dashboard exceeded |
| `INVALID_TIME_RANGE` | 400 | Invalid time range parameters |

---

## 8.8 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /widget-data/* | 100 | 1 minute |
| POST /widget-data/query | 30 | 1 minute |
| Other endpoints | 60 | 1 minute |

---

## 8.9 OpenAPI Specification

Full OpenAPI 3.0 spec will be auto-generated by NestJS Swagger module and available at:

```
GET /api/docs        # Swagger UI
GET /api/docs-json   # OpenAPI JSON
GET /api/docs-yaml   # OpenAPI YAML
```

---

## Navigation

⬅️ [Previous: Widget System](./07-WIDGET-SYSTEM.md) | [Back to Index](./00-INDEX.md) | [Next: Real-time Architecture](./09-REALTIME-ARCHITECTURE.md) ➡️
