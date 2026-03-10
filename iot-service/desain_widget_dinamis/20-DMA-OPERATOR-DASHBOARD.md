# 20 — DMA Operator Dashboard Design

> **Target User:** Operator / Teknisi lapangan  
> **Scope:** Satu DMA (Project) — monitoring tekanan, debit, power, VSD  
> **Platform:** Widget-builder dinamis yang sudah ada (`custom_dashboards` + `custom_widgets`)  
> **Data Source:** ClickHouse (telemetry) + PostgreSQL (config & alerts)

---

## 1. Tujuan Dashboard

Operator buka dashboard → **langsung tahu**:

1. Apakah semua node di DMA ini **online**?
2. Berapa **tekanan** dan **debit** sekarang? Normal atau tidak?
3. Apakah ada **alarm** yang harus ditindak?
4. Bagaimana **tren** 24 jam terakhir — ada anomali?
5. Status **pompa/VSD** — jalan atau mati?
6. **Signal quality** — ada node yang sinyalnya lemah?

---

## 2. Dashboard Specification

### 2.1 Dashboard Entity

```json
{
  "name": "DMA Cilandak — Operator View",
  "description": "Dashboard monitoring operasional untuk DMA Cilandak. Menampilkan status node, tekanan, debit, alarm, dan tren 24 jam.",
  "layout_config": {
    "columns": 12,
    "rowHeight": 80,
    "compactType": "none",
    "margin": 10
  },
  "time_range": "24h",
  "refresh_interval": 30,
  "is_default": true
}
```

### 2.2 Variable Convention

Semua query menggunakan variable `${...}` yang diganti runtime oleh widget-builder:

| Variable | Source | Contoh Nilai |
|----------|--------|-------------|
| `${ownerId}` | JWT user.idOwner | `550e8400-...` |
| `${projectId}` | Dashboard context / manual set | UUID DMA ini |
| `${timeRange}` | Time picker | `24 HOUR` (CH) / `24 hours` (PG) |
| `${fromTime}` | Time picker | `2026-03-01T00:00:00Z` |
| `${toTime}` | Time picker | `2026-03-01T23:59:59Z` |

> **Catatan:** `${projectId}` belum ada di variable system saat ini.  
> **Action item:** Tambahkan support `${projectId}` di `widget-builder.service.ts` → ambil dari `dashboard.layout_config.projectId` atau dari request parameter.

---

## 3. Widget Layout (Grid 12 Kolom)

```
ROW 0 (y=0, rows=2)
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ W1     │ │ W2     │ │ W3     │ │ W4     │ │ W5     │ │ W6     │
│Node ON │ │Alarm   │ │Avg P   │ │Avg Q   │ │Power   │ │Signal  │
│stat-   │ │stat-   │ │stat-   │ │stat-   │ │stat-   │ │stat-   │
│card    │ │card    │ │card    │ │card    │ │card    │ │card    │
│2×2     │ │2×2     │ │2×2     │ │2×2     │ │2×2     │ │2×2     │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘

ROW 2 (y=2, rows=4)
┌──────────────────────────┐ ┌──────────────────────────┐
│ W7                       │ │ W8                       │
│ Tekanan Trend 24h        │ │ Debit Trend 24h          │
│ multi-line-chart         │ │ multi-line-chart          │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 6 (y=6, rows=3)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ W9       │ │ W10      │ │ W11      │ │ W12      │
│ Gauge    │ │ Gauge    │ │ Gauge    │ │ Gauge    │
│ Tekanan  │ │ Tekanan  │ │ Debit    │ │ Debit    │
│ Node 1   │ │ Node 2   │ │ Node 1   │ │ Node 2   │
│ 3×3      │ │ 3×3      │ │ 3×3      │ │ 3×3      │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

ROW 9 (y=9, rows=4)
┌──────────────────────────┐ ┌──────────────────────────┐
│ W13                      │ │ W14                      │
│ Active Alarms            │ │ Node Status              │
│ table                    │ │ table                    │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 13 (y=13, rows=4)
┌─────────────────────────────────────────────────────────┐
│ W15                                                      │
│ Alarm Timeline (7 hari)                                  │
│ bar-chart (stacked by severity)                          │
│ 12×4                                                     │
└─────────────────────────────────────────────────────────┘
```

**Total: 15 widget**

---

## 4. Widget Detail — Query & Config

### W1 — Node Online Count

| Property | Value |
|----------|-------|
| **name** | `Node Online` |
| **widget_type** | `stat-card` |
| **position** | `x:0, y:0, cols:2, rows:2` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  countIf(last_seen > now() - INTERVAL 10 MINUTE) AS value,
  count() AS total
FROM iot.node_latest FINAL
WHERE project_id = '${projectId}'
```

**Config:**
```json
{
  "title": "Node Online",
  "mapping": {
    "valueField": "value"
  },
  "yAxis": {
    "unit": "",
    "decimals": 0
  },
  "templateConfig": {
    "settings": {
      "icon": "wifi",
      "suffix": "/ ${total}",
      "colorMode": "value"
    }
  }
}
```

---

### W2 — Active Alarm Count

| Property | Value |
|----------|-------|
| **name** | `Alarm Aktif` |
| **widget_type** | `stat-card` |
| **position** | `x:2, y:0, cols:2, rows:2` |
| **data_source** | `postgresql` |

**SQL Query:**
```sql
SELECT COUNT(*) AS value
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = '${projectId}'
  AND ae.status = 'open'
```

**Config:**
```json
{
  "title": "Alarm Aktif",
  "mapping": { "valueField": "value" },
  "yAxis": { "unit": "", "decimals": 0 },
  "templateConfig": {
    "settings": {
      "icon": "warning",
      "colorMode": "value",
      "warningThreshold": 1,
      "criticalThreshold": 5
    }
  }
}
```

---

### W3 — Rata-Rata Tekanan Terkini

| Property | Value |
|----------|-------|
| **name** | `Avg Tekanan` |
| **widget_type** | `stat-card` |
| **position** | `x:4, y:0, cols:2, rows:2` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  round(avg(eng_value), 2) AS value
FROM iot.sensor_channel_latest FINAL
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
```

**Config:**
```json
{
  "title": "Avg Tekanan",
  "mapping": { "valueField": "value" },
  "yAxis": { "unit": "bar", "decimals": 2 },
  "templateConfig": {
    "settings": {
      "icon": "speed",
      "warningThreshold": 1.5,
      "criticalThreshold": 0.5
    }
  }
}
```

---

### W4 — Rata-Rata Debit Terkini

| Property | Value |
|----------|-------|
| **name** | `Avg Debit` |
| **widget_type** | `stat-card` |
| **position** | `x:6, y:0, cols:2, rows:2` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  round(avg(eng_value), 2) AS value
FROM iot.sensor_channel_latest FINAL
WHERE project_id = '${projectId}'
  AND metric_unit IN ('m3/h', 'm³/h')
```

**Config:**
```json
{
  "title": "Avg Debit",
  "mapping": { "valueField": "value" },
  "yAxis": { "unit": "m³/h", "decimals": 2 },
  "templateConfig": {
    "settings": { "icon": "water_drop" }
  }
}
```

---

### W5 — Total Power Consumption

| Property | Value |
|----------|-------|
| **name** | `Power` |
| **widget_type** | `stat-card` |
| **position** | `x:8, y:0, cols:2, rows:2` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  round(sum(eng_value), 1) AS value
FROM iot.sensor_channel_latest FINAL
WHERE project_id = '${projectId}'
  AND metric_unit IN ('kW', 'kWh')
```

**Config:**
```json
{
  "title": "Power",
  "mapping": { "valueField": "value" },
  "yAxis": { "unit": "kW", "decimals": 1 },
  "templateConfig": {
    "settings": { "icon": "bolt" }
  }
}
```

---

### W6 — Average Signal Quality

| Property | Value |
|----------|-------|
| **name** | `Avg Signal` |
| **widget_type** | `stat-card` |
| **position** | `x:10, y:0, cols:2, rows:2` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  round(avg(signal_quality), 0) AS value
FROM iot.node_latest FINAL
WHERE project_id = '${projectId}'
```

**Config:**
```json
{
  "title": "Avg Signal",
  "mapping": { "valueField": "value" },
  "yAxis": { "unit": "dBm", "decimals": 0 },
  "templateConfig": {
    "settings": {
      "icon": "signal_cellular_alt",
      "warningThreshold": -90,
      "criticalThreshold": -100
    }
  }
}
```

---

### W7 — Tekanan Trend 24 Jam (Multi-Line)

| Property | Value |
|----------|-------|
| **name** | `Tekanan Trend` |
| **widget_type** | `multi-line-chart` |
| **position** | `x:0, y:2, cols:6, rows:4` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  time_bucket AS time,
  node_code AS series,
  round(avgMerge(eng_avg_state), 3) AS value,
  round(minMerge(eng_min_state), 3) AS min_val,
  round(maxMerge(eng_max_state), 3) AS max_val
FROM iot.sensor_telemetry_10min
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY time_bucket, node_code
ORDER BY time_bucket ASC
```

**Config:**
```json
{
  "title": "Tekanan — Trend ${timeRange}",
  "mapping": {
    "xField": "time",
    "yField": "value",
    "seriesField": "series"
  },
  "xAxis": {
    "label": "Waktu",
    "timeFormat": "HH:mm"
  },
  "yAxis": {
    "label": "Tekanan",
    "unit": "bar",
    "decimals": 2,
    "min": 0,
    "max": null,
    "scale": "linear"
  },
  "thresholds": [
    {
      "mode": "manual",
      "value": 1.0,
      "label": "Min Normal",
      "color": "#FFA500",
      "lineStyle": "dashed"
    },
    {
      "mode": "manual",
      "value": 4.0,
      "label": "Max Normal",
      "color": "#FF0000",
      "lineStyle": "dashed"
    }
  ],
  "display": {
    "showLegend": true,
    "legendPosition": "bottom",
    "lineStyle": "smooth",
    "lineWidth": 2,
    "fillOpacity": 0.1,
    "showPoints": "auto",
    "tooltipMode": "all"
  }
}
```

---

### W8 — Debit Trend 24 Jam (Multi-Line)

| Property | Value |
|----------|-------|
| **name** | `Debit Trend` |
| **widget_type** | `multi-line-chart` |
| **position** | `x:6, y:2, cols:6, rows:4` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  time_bucket AS time,
  node_code AS series,
  round(avgMerge(eng_avg_state), 2) AS value,
  round(minMerge(eng_min_state), 2) AS min_val,
  round(maxMerge(eng_max_state), 2) AS max_val
FROM iot.sensor_telemetry_10min
WHERE project_id = '${projectId}'
  AND metric_unit IN ('m3/h', 'm³/h')
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY time_bucket, node_code
ORDER BY time_bucket ASC
```

**Config:**
```json
{
  "title": "Debit — Trend ${timeRange}",
  "mapping": {
    "xField": "time",
    "yField": "value",
    "seriesField": "series"
  },
  "xAxis": {
    "label": "Waktu",
    "timeFormat": "HH:mm"
  },
  "yAxis": {
    "label": "Debit",
    "unit": "m³/h",
    "decimals": 2,
    "min": 0,
    "max": null,
    "scale": "linear"
  },
  "display": {
    "showLegend": true,
    "legendPosition": "bottom",
    "lineStyle": "smooth",
    "lineWidth": 2,
    "fillOpacity": 0.1,
    "showPoints": "auto",
    "tooltipMode": "all"
  }
}
```

---

### W9–W12 — Gauge Per Node (Tekanan & Debit)

Gauge ditampilkan per node supaya operator bisa lihat **nilai aktual sekarang** dengan konteks threshold.

#### W9 — Gauge Tekanan Node 1

| Property | Value |
|----------|-------|
| **name** | `Tekanan — ${nodeCode}` |
| **widget_type** | `gauge` |
| **position** | `x:0, y:6, cols:3, rows:3` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  round(eng_value, 2) AS value,
  sensor_label AS label,
  node_code
FROM iot.sensor_channel_latest FINAL
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
  AND node_code = '${nodeCode1}'
LIMIT 1
```

**Config:**
```json
{
  "title": "Tekanan — Node 1",
  "mapping": { "valueField": "value" },
  "yAxis": {
    "label": "Tekanan",
    "unit": "bar",
    "decimals": 2,
    "min": 0,
    "max": 6
  },
  "thresholds": [
    { "mode": "manual", "value": 1.0, "label": "Low", "color": "#FFA500", "lineStyle": "solid" },
    { "mode": "manual", "value": 4.0, "label": "High", "color": "#FF0000", "lineStyle": "solid" }
  ]
}
```

> **W10** — Sama, ganti `${nodeCode1}` → `${nodeCode2}`, posisi `x:3`  
> **W11** — Gauge Debit Node 1: filter `metric_unit IN ('m3/h', 'm³/h')`, posisi `x:6`, max=50  
> **W12** — Gauge Debit Node 2: sama, posisi `x:9`

**Catatan:** Jika DMA punya >2 node, gauge bisa di-generate otomatis lewat template. Atau gunakan multi-line chart saja dan hapus gauge row.

---

### W13 — Active Alarms Table

| Property | Value |
|----------|-------|
| **name** | `Alarm Aktif` |
| **widget_type** | `table` |
| **position** | `x:0, y:9, cols:6, rows:4` |
| **data_source** | `postgresql` |

**SQL Query:**
```sql
SELECT
  ae.triggered_at AS "Waktu",
  n.code AS "Node",
  s.label AS "Sensor",
  sc.metric_code AS "Metric",
  ae.value AS "Nilai",
  ar.severity AS "Severity",
  ae.status AS "Status",
  ae.note AS "Catatan"
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = '${projectId}'
  AND ae.status IN ('open', 'acknowledged')
ORDER BY ae.triggered_at DESC
LIMIT 50
```

**Config:**
```json
{
  "title": "Alarm Aktif",
  "mapping": {
    "columns": ["Waktu", "Node", "Sensor", "Metric", "Nilai", "Severity", "Status"]
  }
}
```

---

### W14 — Node Status Table

| Property | Value |
|----------|-------|
| **name** | `Status Node` |
| **widget_type** | `table` |
| **position** | `x:6, y:9, cols:6, rows:4` |
| **data_source** | `clickhouse` |

**SQL Query:**
```sql
SELECT
  node_code AS "Node",
  device_id AS "Device ID",
  CASE
    WHEN last_seen > now() - INTERVAL 10 MINUTE THEN '🟢 Online'
    WHEN last_seen > now() - INTERVAL 1 HOUR THEN '🟡 Delayed'
    ELSE '🔴 Offline'
  END AS "Status",
  last_seen AS "Terakhir Kirim",
  signal_quality AS "Signal (dBm)",
  firmware_version AS "Firmware",
  active_channels AS "Channel Aktif"
FROM iot.node_latest FINAL
WHERE project_id = '${projectId}'
ORDER BY last_seen DESC
```

**Config:**
```json
{
  "title": "Status Node",
  "mapping": {
    "columns": ["Node", "Status", "Terakhir Kirim", "Signal (dBm)", "Channel Aktif"]
  }
}
```

---

### W15 — Alarm Timeline (7 Hari)

| Property | Value |
|----------|-------|
| **name** | `Alarm Timeline` |
| **widget_type** | `bar-chart` |
| **position** | `x:0, y:13, cols:12, rows:4` |
| **data_source** | `postgresql` |

**SQL Query:**
```sql
SELECT
  DATE(ae.triggered_at) AS "date",
  ar.severity AS "severity",
  COUNT(*) AS "count"
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = '${projectId}'
  AND ae.triggered_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(ae.triggered_at), ar.severity
ORDER BY "date" ASC
```

**Config:**
```json
{
  "title": "Alarm per Hari (7 Hari Terakhir)",
  "mapping": {
    "xField": "date",
    "yField": "count",
    "seriesField": "severity"
  },
  "xAxis": {
    "label": "Tanggal",
    "timeFormat": "dd MMM"
  },
  "yAxis": {
    "label": "Jumlah Alarm",
    "unit": "",
    "decimals": 0,
    "min": 0
  },
  "series": [
    { "field": "critical", "label": "Critical", "color": "#FF4444", "unit": "", "decimals": 0, "visible": true },
    { "field": "warning",  "label": "Warning",  "color": "#FFA500", "unit": "", "decimals": 0, "visible": true },
    { "field": "info",     "label": "Info",     "color": "#4488FF", "unit": "", "decimals": 0, "visible": true }
  ],
  "display": {
    "showLegend": true,
    "legendPosition": "top"
  }
}
```

---

## 5. Query Time Range Strategy

Widget-builder sudah support time range. Strategi per widget:

| Widget | Default Time | ClickHouse Table | Auto Refresh |
|--------|-------------|-----------------|-------------|
| W1–W6 (stat-cards) | latest | `sensor_channel_latest FINAL` / `node_latest FINAL` | 30s |
| W7–W8 (trend lines) | `${timeRange}` dari picker | `sensor_telemetry_10min` (≤24h), `sensor_telemetry_1hour` (≤7d), `sensor_telemetry_daily` (≤30d) | 60s |
| W9–W12 (gauges) | latest | `sensor_channel_latest FINAL` | 30s |
| W13 (alarm table) | — | PostgreSQL `alert_events` | 30s |
| W14 (node table) | — | `node_latest FINAL` | 30s |
| W15 (alarm timeline) | 7 hari | PostgreSQL `alert_events` | 300s |

### Smart Table Selection (untuk trend widget W7, W8)

```
if timeRange <= 6h   → sensor_telemetry_10min  (resolusi 10 menit)
if timeRange <= 7d   → sensor_telemetry_1hour   (resolusi 1 jam)
if timeRange <= 90d  → sensor_telemetry_daily   (resolusi 1 hari)
```

> **Action item:** Bisa di-handle di frontend: simpan 3 variant SQL di config, pilih berdasarkan time range yang dipilih user. Atau buat backend endpoint khusus yang auto-select table.

---

## 6. Action Items — Backend

### 6.1 Tambah `${projectId}` Variable Support

File: `iot-backend/src/modules/widget-builder/widget-builder.service.ts`

```typescript
// Di method replaceVariables():
// Tambahkan support ${projectId} dari:
// 1. dto.variables?.projectId  (explicit)
// 2. dashboard.layout_config?.projectId  (dashboard-level setting)
```

### 6.2 Tambah `${nodeCode1}`, `${nodeCode2}` Variable Support

Untuk gauge per node, perlu variable custom:

```typescript
// Di widget config / variables:
{
  "variables": {
    "nodeCode1": "NODE-DMA-CIL-001",
    "nodeCode2": "NODE-DMA-CIL-002"
  }
}
```

Ini sudah di-support via `dto.variables` di `ExecuteQueryDto`. Tinggal simpan di widget config dan kirim saat execute.

### 6.3 Widget Config — Simpan Variables di Widget

Tambah field `variables` di `CustomWidget.config`:

```json
{
  "config": {
    "title": "...",
    "mapping": { "..." },
    "variables": {
      "projectId": "uuid-dma-cilandak",
      "nodeCode1": "NODE-001",
      "nodeCode2": "NODE-002"
    }
  }
}
```

Frontend widget-container harus memasukkan `config.variables` ke `ExecuteQueryDto.variables` saat memanggil query.

---

## 7. Action Items — Frontend

### 7.1 Widget Container Enhancement

File: `iot-angular/.../widget-container/widget-container.component.ts`

```typescript
// Saat loadData(), merge variables dari widget config:
const variables = {
  ...(this.widget.config?.variables || {}),
  // tambahkan projectId dari dashboard context jika ada
  projectId: this.dashboardProjectId
};

this.widgetBuilderService.executeQuery({
  sql: this.widget.sqlQuery,
  dataSource: this.widget.dataSource,
  timeRange: this.selectedTimeRange,
  variables: variables
});
```

### 7.2 Dashboard-Level Project Selector

Tambah dropdown di dashboard-view toolbar:
- Ambil list project dari `/api/projects?idOwner=${ownerId}`
- Simpan `selectedProjectId` di dashboard context
- Broadcast ke semua widget-container sebagai `${projectId}`

### 7.3 Auto-Refresh per Widget

Widget-container sudah support refresh. Pastikan:
- Stat-card & gauge: `setInterval(30000)` 
- Trend chart: `setInterval(60000)`
- Table: `setInterval(30000)`
- Alarm timeline: `setInterval(300000)`

---

## 8. Provisioning Script

Untuk mempercepat setup, buat seed script yang membuat dashboard + 15 widget via API:

```bash
# POST /api/widget-builder/dashboards
# → returns dashboardId
# Loop POST /api/widget-builder/dashboards/${dashboardId}/widgets
# → create each of the 15 widgets with SQL + config
```

> Detailnya bisa dibuat sebagai NestJS seeder atau bash script yang memanggil curl.

---

## 9. Screenshot Target (Mockup ASCII)

```
╔═══════════════════════════════════════════════════════════════════╗
║  DMA Cilandak — Operator View          [24h ▼] [⟳ 30s] [✏ Edit]║
╠═══════════════════════════════════════════════════════════════════╣
║ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         ║
║ │  5/5 │ │   0  │ │ 2.83 │ │12.40 │ │ 4.2  │ │ -72  │         ║
║ │ Node │ │Alarm │ │ bar  │ │m³/h  │ │ kW   │ │ dBm  │         ║
║ │Online│ │Aktif │ │Tekan │ │Debit │ │Power │ │Signal│         ║
║ │  🟢  │ │  ✓   │ │  📊  │ │  💧  │ │  ⚡  │ │  📶  │         ║
║ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         ║
║                                                                   ║
║ ┌─────────────────────────┐ ┌─────────────────────────┐         ║
║ │ Tekanan Trend           │ │ Debit Trend             │         ║
║ │                         │ │                         │         ║
║ │ 3.2 ─── NODE-001       │ │ 15 ─── NODE-001        │         ║
║ │ 2.8 ─·─ NODE-002       │ │ 12 ─·─ NODE-002        │         ║
║ │ 2.4 ─── NODE-003       │ │  8 ─── NODE-003        │         ║
║ │ ─────────────────────── │ │ ─────────────────────── │         ║
║ │ 00:00  06:00  12:00  18 │ │ 00:00  06:00  12:00  18│         ║
║ │ ---- Min Normal (1 bar) │ │                         │         ║
║ │ ---- Max Normal (4 bar) │ │                         │         ║
║ └─────────────────────────┘ └─────────────────────────┘         ║
║                                                                   ║
║ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                        ║
║ │ 2.83  │ │ 3.12  │ │ 12.4  │ │ 8.7   │                        ║
║ │  bar  │ │  bar  │ │ m³/h  │ │ m³/h  │                        ║
║ │ ╭───╮ │ │ ╭───╮ │ │ ╭───╮ │ │ ╭───╮ │                        ║
║ │ │ ▋ │ │ │ │ ▋ │ │ │ │ ▋ │ │ │ │ ▋ │ │                        ║
║ │ ╰───╯ │ │ ╰───╯ │ │ ╰───╯ │ │ ╰───╯ │                        ║
║ │Node-01│ │Node-02│ │Node-01│ │Node-02│                        ║
║ └───────┘ └───────┘ └───────┘ └───────┘                        ║
║                                                                   ║
║ ┌─────────────────────────┐ ┌─────────────────────────┐         ║
║ │ Alarm Aktif             │ │ Status Node             │         ║
║ │─────────────────────────│ │─────────────────────────│         ║
║ │Waktu  │Node │Sev │Stat │ │Node   │Status │Last Seen│         ║
║ │14:30  │N-01 │CRIT│open │ │N-001  │🟢 On  │2m ago   │         ║
║ │13:15  │N-03 │WARN│open │ │N-002  │🟢 On  │5m ago   │         ║
║ │12:00  │N-02 │WARN│ack  │ │N-003  │🟡 Dly │45m ago  │         ║
║ └─────────────────────────┘ └─────────────────────────┘         ║
║                                                                   ║
║ ┌───────────────────────────────────────────────────────┐       ║
║ │ Alarm per Hari (7 Hari Terakhir)                      │       ║
║ │                                                       │       ║
║ │    ██                                                 │       ║
║ │    ██                    ██                            │       ║
║ │ ██ ██ ██    ██    ██ ██ ██ ██                         │       ║
║ │ ██ ██ ██ ██ ██ ██ ██ ██ ██ ██                         │       ║
║ │ 23  24  25  26  27  28  01  Feb/Mar                   │       ║
║ │ ■ Critical  ■ Warning  ■ Info                         │       ║
║ └───────────────────────────────────────────────────────┘       ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 10. Fase Selanjutnya (Setelah Operator v1)

| Fase | Tambahan | Effort |
|------|----------|--------|
| **v1.1** | Power & VSD detail widgets (freq, current, running status) | +4 widget |
| **v1.2** | Anomaly overlay pada trend chart (ML anomaly markers) | config change |
| **v2** | Management dashboard (KPI summary, DMA comparison) | New dashboard |
| **v2.1** | Export PDF/Excel dari dashboard | New feature |
| **v3** | SCADA-lite per DMA (diagram alir + live values) | Custom component |

---

## Appendix A — Full Widget Position Summary

| # | Widget Name | Type | x | y | cols | rows | Data Source |
|---|------------|------|---|---|------|------|-------------|
| W1 | Node Online | stat-card | 0 | 0 | 2 | 2 | clickhouse |
| W2 | Alarm Aktif | stat-card | 2 | 0 | 2 | 2 | postgresql |
| W3 | Avg Tekanan | stat-card | 4 | 0 | 2 | 2 | clickhouse |
| W4 | Avg Debit | stat-card | 6 | 0 | 2 | 2 | clickhouse |
| W5 | Power | stat-card | 8 | 0 | 2 | 2 | clickhouse |
| W6 | Avg Signal | stat-card | 10 | 0 | 2 | 2 | clickhouse |
| W7 | Tekanan Trend | multi-line-chart | 0 | 2 | 6 | 4 | clickhouse |
| W8 | Debit Trend | multi-line-chart | 6 | 2 | 6 | 4 | clickhouse |
| W9 | Gauge Tekanan N1 | gauge | 0 | 6 | 3 | 3 | clickhouse |
| W10 | Gauge Tekanan N2 | gauge | 3 | 6 | 3 | 3 | clickhouse |
| W11 | Gauge Debit N1 | gauge | 6 | 6 | 3 | 3 | clickhouse |
| W12 | Gauge Debit N2 | gauge | 9 | 6 | 3 | 3 | clickhouse |
| W13 | Alarm Aktif | table | 0 | 9 | 6 | 4 | postgresql |
| W14 | Status Node | table | 6 | 9 | 6 | 4 | clickhouse |
| W15 | Alarm Timeline | bar-chart | 0 | 13 | 12 | 4 | postgresql |

---

## Appendix B — ClickHouse Table Quick Reference

| Table | Resolusi | TTL | Kapan Dipakai |
|-------|---------|-----|---------------|
| `sensor_channel_latest FINAL` | Terkini | ∞ | Stat-card, gauge (nilai sekarang) |
| `node_latest FINAL` | Terkini | ∞ | Node online count, signal quality |
| `sensor_telemetry` | Raw | 2 tahun | Zoom in < 1 jam |
| `sensor_telemetry_10min` | 10 menit | 6 bulan | Trend 1–24 jam |
| `sensor_telemetry_1hour` | 1 jam | 1 tahun | Trend 1–7 hari |
| `sensor_telemetry_daily` | 1 hari | 3 tahun | Trend > 7 hari |

**Penting:** Tabel `_10min`, `_1hour`, `_daily` menggunakan `AggregatingMergeTree`. Query HARUS pakai `-Merge` combinator:
```sql
avgMerge(eng_avg_state)   -- bukan avg(eng_avg_state)
minMerge(eng_min_state)   -- bukan min(eng_min_state)
maxMerge(eng_max_state)   -- bukan max(eng_max_state)
countMerge(sample_count_state)  -- bukan count(sample_count_state)
```
