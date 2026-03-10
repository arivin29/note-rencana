# 21 — Dashboard Catalog & Category System

> **Version:** 1.0.0  
> **Tanggal:** 2 Maret 2026  
> **Status:** Design  
> **Referensi:** [20-DMA-OPERATOR-DASHBOARD.md](./20-DMA-OPERATOR-DASHBOARD.md) (detail widget DMA)

---

## 1. Filosofi

Satu owner bisa punya **banyak dashboard**, masing-masing punya tujuan spesifik.  
Bukan "1 dashboard besar dengan semua widget", tapi **dashboard per konteks kerja**.

Bayangkan operator/manajer buka browser:
- Tab 1: Overview semua DMA → mana yang bermasalah?
- Tab 2: DMA Cilandak detail → apa yang terjadi di sini?
- Tab 3: Alarm Center → apa yang harus ditindak sekarang?
- Tab 4: Tekanan Analysis → bagaimana tren tekanan cross-DMA?

---

## 2. Kategori Dashboard

### 2.1 Peta Kategori

```
┌──────────────────────────────────────────────────────┐
│                    OWNER SCOPE                        │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ A. OVERVIEW │  │ B. ALARM    │  │ C. NODE     │  │
│  │ Semua DMA   │  │ CENTER      │  │ HEALTH      │  │
│  │ (1 per      │  │ (1 per      │  │ (1 per      │  │
│  │  owner)     │  │  owner)     │  │  owner)     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ D. TEKANAN  │  │ E. DEBIT    │  │ F. POWER    │  │
│  │ ANALYSIS    │  │ ANALYSIS    │  │ & VSD       │  │
│  │ (1 per      │  │ (1 per      │  │ (1 per      │  │
│  │  owner)     │  │  owner)     │  │  owner)     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                       │
│               PROJECT (DMA) SCOPE                     │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │ G. DMA      │  │ H. DMA      │  × N DMA          │
│  │ OPERATOR    │  │ ANALYTICS   │                    │
│  │ (1 per DMA) │  │ (1 per DMA) │                    │
│  └─────────────┘  └─────────────┘                    │
│                                                       │
│               MANAGEMENT SCOPE                        │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │ I. KPI &    │  │ J. ML       │                    │
│  │ EXECUTIVE   │  │ ANOMALY     │                    │
│  │ (1 per      │  │ (1 per      │                    │
│  │  owner)     │  │  owner)     │                    │
│  └─────────────┘  └─────────────┘                    │
└──────────────────────────────────────────────────────┘
```

### 2.2 Ringkasan per Kategori

| ID | Kategori | Scope | Target User | Jumlah per Owner | Purpose |
|----|----------|-------|-------------|-----------------|---------|
| **A** | Overview | Owner | Semua | 1 | Bird's eye view semua DMA |
| **B** | Alarm Center | Owner | Operator | 1 | Semua alarm aktif, history, ACK |
| **C** | Node Health | Owner | Teknisi | 1 | Connectivity, signal, maintenance |
| **D** | Tekanan Analysis | Owner | Operator + Mgmt | 1 | Cross-DMA pressure monitoring |
| **E** | Debit Analysis | Owner | Operator + Mgmt | 1 | Cross-DMA flow monitoring |
| **F** | Power & VSD | Owner | Operator + Mgmt | 1 | Electrical & pump monitoring |
| **G** | DMA Operator | Project | Operator | 1 per DMA | Detail operasional per DMA |
| **H** | DMA Analytics | Project | Management | 1 per DMA | Trend & historis per DMA |
| **I** | KPI & Executive | Owner | Management | 1 | Ringkasan KPI bulanan |
| **J** | ML & Anomaly | Owner | Mgmt + Operator | 1 | Anomaly detection results |

**Contoh:** Owner dengan 5 DMA → minimal **5 + 6 + 5 = 16 dashboard**  
(6 owner-scope + 5 DMA operator + 5 DMA analytics)

---

## 3. Dashboard Entity Extension

### 3.1 Tambah `category` di `layout_config`

Tidak perlu ubah schema. Simpan kategori di `layout_config`:

```json
{
  "layout_config": {
    "columns": 12,
    "rowHeight": 80,
    "category": "dma-operator",
    "projectId": "uuid-dma-cilandak",
    "tags": ["tekanan", "debit", "operator"]
  }
}
```

**Category values:**

| Category Key | Label |
|-------------|-------|
| `overview` | Overview |
| `alarm-center` | Alarm Center |
| `node-health` | Node Health |
| `tekanan-analysis` | Tekanan Analysis |
| `debit-analysis` | Debit Analysis |
| `power-vsd` | Power & VSD |
| `dma-operator` | DMA Operator |
| `dma-analytics` | DMA Analytics |
| `kpi-executive` | KPI & Executive |
| `ml-anomaly` | ML & Anomaly |

### 3.2 Dashboard Navigation (Frontend)

```
┌─────────────────────────────────────────────────┐
│  SIDEBAR / TOP NAV                               │
│                                                   │
│  📊 Dashboard                                    │
│  ├── 🏠 Overview                                 │
│  ├── 🔔 Alarm Center                            │
│  ├── 📡 Node Health                             │
│  ├── 📈 Monitoring                              │
│  │   ├── Tekanan                                │
│  │   ├── Debit                                  │
│  │   └── Power & VSD                            │
│  ├── 📍 Per DMA                                 │
│  │   ├── DMA Cilandak                           │
│  │   │   ├── Operator View                      │
│  │   │   └── Analytics                          │
│  │   ├── DMA Pondok Indah                       │
│  │   │   ├── Operator View                      │
│  │   │   └── Analytics                          │
│  │   └── DMA Kebayoran                          │
│  │       ├── Operator View                      │
│  │       └── Analytics                          │
│  ├── 📊 KPI & Executive                         │
│  └── 🤖 ML & Anomaly                            │
└─────────────────────────────────────────────────┘
```

---

## 4. Detail Per Kategori

---

### A. OVERVIEW — Bird's Eye View

> **Tujuan:** Buka → langsung tahu kondisi seluruh DMA  
> **Refresh:** 30 detik  
> **Default time range:** Real-time (latest)

#### Widget Layout (12 widget)

```
ROW 0 (y=0, h=2) — KPI Cards
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ A1   │ │ A2   │ │ A3   │ │ A4   │ │ A5   │ │ A6   │
│Total │ │Online│ │Alarm │ │Avg P │ │Avg Q │ │Data  │
│DMA   │ │Node  │ │Aktif │ │(bar) │ │(m³/h)│ │Rate  │
│stat  │ │stat  │ │stat  │ │stat  │ │stat  │ │stat  │
│2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘

ROW 2 (y=2, h=5) — DMA Status Grid
┌──────────────────────────────────────────────────────┐
│ A7 — DMA Status Cards (table)                        │
│                                                       │
│ DMA         │ Nodes  │ Alarm │ Avg P │ Avg Q │ Status│
│ Cilandak    │ 5/5 🟢 │   0   │ 2.83  │ 12.4  │  ✓   │
│ Pondok Indah│ 3/4 🟡 │   2   │ 1.12  │  8.7  │  ⚠   │
│ Kebayoran   │ 4/4 🟢 │   0   │ 3.01  │ 10.2  │  ✓   │
│                                               12×5    │
└──────────────────────────────────────────────────────┘

ROW 7 (y=7, h=4) — Trend & Alarm
┌──────────────────────────┐ ┌──────────────────────────┐
│ A8 — Tekanan per DMA     │ │ A9 — Debit per DMA       │
│ multi-line-chart         │ │ multi-line-chart          │
│ (1 line = 1 DMA avg)    │ │ (1 line = 1 DMA avg)     │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 11 (y=11, h=4) — Alarm & Activity
┌──────────────────────────┐ ┌──────────────────────────┐
│ A10 — Latest Alarms      │ │ A11 — Node Offline List  │
│ table (top 10)           │ │ table (offline only)     │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 15 (y=15, h=3)
┌──────────────────────────────────────────────────────┐
│ A12 — Alarm Heatmap (per DMA × per hari)             │
│ heatmap 12×3                                         │
└──────────────────────────────────────────────────────┘
```

#### Key Queries

**A1 — Total DMA (stat-card, postgresql)**
```sql
SELECT COUNT(*) AS value
FROM projects
WHERE id_owner = '${ownerId}' AND status = 'active'
```

**A2 — Node Online (stat-card, clickhouse)**
```sql
SELECT
  countIf(last_seen > now() - INTERVAL 10 MINUTE) AS value,
  count() AS total
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
```

**A7 — DMA Status Grid (table, clickhouse)**
```sql
SELECT
  project_code AS "DMA",
  count() AS "Total Node",
  countIf(last_seen > now() - INTERVAL 10 MINUTE) AS "Online",
  countIf(last_seen <= now() - INTERVAL 10 MINUTE) AS "Offline"
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
GROUP BY project_code
ORDER BY project_code
```

> **Note:** Avg tekanan/debit per DMA perlu JOIN dari `sensor_channel_latest`.

**A8 — Tekanan per DMA Trend (multi-line-chart, clickhouse)**
```sql
SELECT
  time_bucket AS time,
  project_code AS series,
  round(avgMerge(eng_avg_state), 2) AS value
FROM iot.sensor_telemetry_10min
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY time_bucket, project_code
ORDER BY time_bucket ASC
```

---

### B. ALARM CENTER

> **Tujuan:** Semua alarm di satu tempat — filter, ACK, history  
> **Refresh:** 15 detik  
> **Default time range:** 7 hari

#### Widget Layout (8 widget)

```
ROW 0 (y=0, h=2) — Alarm Summary
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ B1     │ │ B2     │ │ B3     │ │ B4     │
│Open    │ │Critical│ │Warning │ │Ackd    │
│Total   │ │Count   │ │Count   │ │Today   │
│stat 3×2│ │stat 3×2│ │stat 3×2│ │stat 3×2│
└────────┘ └────────┘ └────────┘ └────────┘

ROW 2 (y=2, h=5) — Active Alarms
┌──────────────────────────────────────────────────────┐
│ B5 — Active Alarms (table, postgresql)               │
│                                                       │
│ Waktu  │ DMA │ Node │ Sensor │ Metric │ Val │ Sev    │
│ 14:30  │ CIL │ N-01 │ Pres-1 │ bar    │ 4.5 │ CRIT   │
│ 14:15  │ PON │ N-03 │ Flow-1 │ m³/h   │ 0.2 │ WARN   │
│ ...                                          12×5    │
└──────────────────────────────────────────────────────┘

ROW 7 (y=7, h=4) — Timeline & Distribution
┌──────────────────────────┐ ┌──────────────────────────┐
│ B6 — Alarm Timeline      │ │ B7 — Alarm by DMA        │
│ bar-chart (daily stack)  │ │ pie-chart                │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 11 (y=11, h=5) — Alarm History
┌──────────────────────────────────────────────────────┐
│ B8 — Alarm History Full (table, postgresql)          │
│ With all statuses, sortable                   12×5   │
└──────────────────────────────────────────────────────┘
```

#### Key Queries

**B1 — Open Alarm Count (stat-card, postgresql)**
```sql
SELECT COUNT(*) AS value
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = '${ownerId}'
  AND ae.status = 'open'
```

**B5 — Active Alarms (table, postgresql)**
```sql
SELECT
  ae.triggered_at AS "Waktu",
  p.name AS "DMA",
  n.code AS "Node",
  s.label AS "Sensor",
  sc.metric_code AS "Metric",
  round(ae.value::numeric, 2) AS "Nilai",
  ar.severity AS "Severity",
  ae.status AS "Status"
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = '${ownerId}'
  AND ae.status IN ('open', 'acknowledged')
ORDER BY ae.triggered_at DESC
LIMIT 100
```

**B7 — Alarm Distribution per DMA (pie-chart, postgresql)**
```sql
SELECT
  p.name AS label,
  COUNT(*) AS value
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = '${ownerId}'
  AND ae.triggered_at >= NOW() - INTERVAL '${timeRange}'
GROUP BY p.name
ORDER BY value DESC
```

---

### C. NODE HEALTH

> **Tujuan:** Monitoring kesehatan device — connectivity, signal, battery, maintenance  
> **Refresh:** 60 detik  
> **Default time range:** 24 jam

#### Widget Layout (8 widget)

```
ROW 0 (y=0, h=2) — Summary Cards
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ C1   │ │ C2   │ │ C3   │ │ C4   │ │ C5   │ │ C6   │
│Total │ │Online│ │Delay │ │Offl  │ │Avg   │ │Maint │
│Node  │ │Count │ │Count │ │Count │ │Signal│ │Due   │
│2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘

ROW 2 (y=2, h=6) — Node Table
┌──────────────────────────────────────────────────────┐
│ C7 — Node Status Table (table, clickhouse)           │
│                                                       │
│ Node  │ DMA │ Status │ Last Seen │ Signal │ FW │ Ch  │
│ N-001 │ CIL │ 🟢 On  │ 2m ago   │ -72    │3.1 │ 6   │
│ N-002 │ CIL │ 🟢 On  │ 5m ago   │ -68    │3.1 │ 4   │
│ N-003 │ PON │ 🔴 Off │ 3h ago   │ -95    │2.9 │ 4   │
│ ...                                          12×6    │
└──────────────────────────────────────────────────────┘

ROW 8 (y=8, h=4)
┌──────────────────────────┐ ┌──────────────────────────┐
│ C8 — Signal Quality Trend│ │ C9 — Connectivity Pie    │
│ multi-line-chart         │ │ pie-chart                │
│ (per node signal over    │ │ (online/delayed/offline) │
│  24h)                    │ │                          │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**C3 — Delayed Nodes (stat-card, clickhouse)**
```sql
SELECT count() AS value
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND last_seen <= now() - INTERVAL 10 MINUTE
  AND last_seen > now() - INTERVAL 1 HOUR
```

**C6 — Maintenance Due (stat-card, postgresql)**
```sql
SELECT COUNT(*) AS value
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = '${ownerId}'
  AND n.next_maintenance_at <= NOW() + INTERVAL '7 days'
  AND n.status = 'active'
```

**C7 — Full Node Table (table, clickhouse)**
```sql
SELECT
  node_code AS "Node",
  project_code AS "DMA",
  CASE
    WHEN last_seen > now() - INTERVAL 10 MINUTE THEN '🟢 Online'
    WHEN last_seen > now() - INTERVAL 1 HOUR THEN '🟡 Delayed'
    ELSE '🔴 Offline'
  END AS "Status",
  last_seen AS "Last Seen",
  signal_quality AS "Signal (dBm)",
  firmware_version AS "Firmware",
  active_channels AS "Channels"
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
ORDER BY
  CASE WHEN last_seen > now() - INTERVAL 10 MINUTE THEN 3
       WHEN last_seen > now() - INTERVAL 1 HOUR THEN 2
       ELSE 1 END ASC,
  last_seen DESC
```

---

### D. TEKANAN ANALYSIS

> **Tujuan:** Fokus monitoring tekanan semua DMA — trend, perbandingan, threshold breach  
> **Refresh:** 30 detik  
> **Default time range:** 24 jam

#### Widget Layout (9 widget)

```
ROW 0 (y=0, h=2) — Summary
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ D1     │ │ D2     │ │ D3     │ │ D4     │
│Avg     │ │Min     │ │Max     │ │Breach  │
│Tekanan │ │Tekanan │ │Tekanan │ │Count   │
│stat 3×2│ │stat 3×2│ │stat 3×2│ │stat 3×2│
└────────┘ └────────┘ └────────┘ └────────┘

ROW 2 (y=2, h=5) — Main Chart
┌──────────────────────────────────────────────────────┐
│ D5 — Tekanan All Nodes (multi-line-chart)            │
│ Setiap node = 1 line, color-coded per DMA            │
│ Threshold lines: min normal, max normal              │
│ clickhouse, 12×5                                     │
└──────────────────────────────────────────────────────┘

ROW 7 (y=7, h=4) — Comparison
┌──────────────────────────┐ ┌──────────────────────────┐
│ D6 — DMA Avg Comparison  │ │ D7 — Distribution        │
│ bar-chart (horizontal)   │ │ pie-chart                │
│ Avg tekanan per DMA      │ │ Normal/Warning/Critical  │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 11 (y=11, h=4) — Detail
┌──────────────────────────┐ ┌──────────────────────────┐
│ D8 — Min/Max per Node    │ │ D9 — Threshold Breach    │
│ table                    │ │ table (events log)       │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**D1 — Avg Tekanan Global (stat-card, clickhouse)**
```sql
SELECT round(avg(eng_value), 2) AS value
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
```

**D4 — Threshold Breach Count (stat-card, clickhouse)**
```sql
SELECT count() AS value
FROM iot.sensor_channel_latest FINAL AS scl
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
  AND (eng_value < 1.0 OR eng_value > 4.0)
```

**D5 — Tekanan All Nodes Trend (multi-line-chart, clickhouse)**
```sql
SELECT
  time_bucket AS time,
  concat(project_code, ' / ', node_code) AS series,
  round(avgMerge(eng_avg_state), 3) AS value
FROM iot.sensor_telemetry_10min
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY time_bucket, project_code, node_code
ORDER BY time_bucket ASC
```

**D6 — DMA Avg Comparison (bar-chart, clickhouse)**
```sql
SELECT
  project_code AS label,
  round(avg(eng_value), 2) AS value
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
GROUP BY project_code
ORDER BY value DESC
```

**D8 — Min/Max per Node Table (table, clickhouse)**
```sql
SELECT
  project_code AS "DMA",
  node_code AS "Node",
  sensor_label AS "Sensor",
  round(avgMerge(eng_avg_state), 2) AS "Avg (bar)",
  round(minMerge(eng_min_state), 2) AS "Min (bar)",
  round(maxMerge(eng_max_state), 2) AS "Max (bar)",
  countMerge(sample_count_state) AS "Samples"
FROM iot.sensor_telemetry_10min
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY project_code, node_code, sensor_label
ORDER BY project_code, node_code
```

---

### E. DEBIT ANALYSIS

> **Tujuan:** Sama seperti Tekanan Analysis, tapi untuk metrik debit/flow  
> **Refresh:** 30 detik  
> **Default time range:** 24 jam

#### Widget Layout — Mirror dari D, ganti filter

Sama persis dengan **D. Tekanan Analysis**, dengan perbedaan:

| Aspek | Tekanan (D) | Debit (E) |
|-------|------------|-----------|
| Filter metric_unit | `= 'bar'` | `IN ('m3/h', 'm³/h')` |
| Unit display | `bar` | `m³/h` |
| Threshold normal | 1.0 – 4.0 bar | 0.5 – 30 m³/h |
| Widget labels | "Tekanan" | "Debit" |

**9 widget** (E1–E9), layout identik.

---

### F. POWER & VSD

> **Tujuan:** Monitoring electrical — VSD frequency, current, power consumption, status pompa  
> **Refresh:** 30 detik  
> **Default time range:** 24 jam

#### Widget Layout (10 widget)

```
ROW 0 (y=0, h=2) — Summary
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ F1   │ │ F2   │ │ F3   │ │ F4   │ │ F5   │ │ F6   │
│Total │ │Total │ │Avg   │ │Avg   │ │Avg   │ │VSD   │
│Power │ │kWh   │ │Freq  │ │Curr  │ │Volt  │ │Active│
│(kW)  │ │Today │ │(Hz)  │ │(A)   │ │(V)   │ │Count │
│2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘

ROW 2 (y=2, h=4) — Power Trend
┌──────────────────────────┐ ┌──────────────────────────┐
│ F7 — Power Consumption   │ │ F8 — VSD Frequency       │
│ multi-line-chart (kW)    │ │ multi-line-chart (Hz)    │
│ per DMA                  │ │ per pump                 │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 6 (y=6, h=4) — Current & Voltage
┌──────────────────────────┐ ┌──────────────────────────┐
│ F9 — Current per Pump    │ │ F10 — VSD Status Table   │
│ multi-line-chart (A)     │ │ table                    │
│ 6×4                      │ │ Node│Pump│Freq│I│Status   │
│                          │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**F1 — Total Power Now (stat-card, clickhouse)**
```sql
SELECT round(sum(eng_value), 1) AS value
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND metric_unit IN ('kW', 'kWh')
```

**F3 — Avg VSD Frequency (stat-card, clickhouse)**
```sql
SELECT round(avg(eng_value), 1) AS value
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND metric_unit = 'Hz'
```

**F10 — VSD Status Table (table, clickhouse)**
```sql
SELECT
  project_code AS "DMA",
  node_code AS "Node",
  sensor_label AS "Pump",
  metric_code AS "Metric",
  round(eng_value, 1) AS "Value",
  metric_unit AS "Unit",
  last_update AS "Last Update"
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '${ownerCode}'
  AND metric_unit IN ('Hz', 'A', 'ampere', 'kW', 'volt')
ORDER BY project_code, node_code, metric_code
```

---

### G. DMA OPERATOR (Per DMA)

> Lihat **[20-DMA-OPERATOR-DASHBOARD.md](./20-DMA-OPERATOR-DASHBOARD.md)** untuk detail lengkap.

**15 widget:** 6 stat-cards + 2 trend charts + 4 gauges + 2 tables + 1 bar-chart  
**Filter:** `project_id = '${projectId}'`

---

### H. DMA ANALYTICS (Per DMA)

> **Tujuan:** Analisis historis per DMA — trend mingguan, perbandingan antar node, export  
> **Refresh:** 300 detik  
> **Default time range:** 7 hari

#### Widget Layout (8 widget)

```
ROW 0 (y=0, h=2) — Period Summary
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ H1     │ │ H2     │ │ H3     │ │ H4     │
│Avg P   │ │Avg Q   │ │Total   │ │Alarm   │
│Period  │ │Period  │ │kWh     │ │Count   │
│stat 3×2│ │stat 3×2│ │stat 3×2│ │stat 3×2│
└────────┘ └────────┘ └────────┘ └────────┘

ROW 2 (y=2, h=5) — Long Term Trends
┌──────────────────────────┐ ┌──────────────────────────┐
│ H5 — Tekanan Weekly      │ │ H6 — Debit Weekly        │
│ multi-line-chart         │ │ multi-line-chart          │
│ (1hour / daily table)    │ │ (1hour / daily table)     │
│ 6×5                      │ │ 6×5                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 7 (y=7, h=5) — Node Comparison & History
┌──────────────────────────┐ ┌──────────────────────────┐
│ H7 — Node Avg Comparison │ │ H8 — Daily Summary Table │
│ bar-chart (per node      │ │ table (date × avg × min  │
│ avg tekanan + debit)     │ │ × max × samples)         │
│ 6×5                      │ │ 6×5                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**H1 — Period Avg Tekanan (stat-card, clickhouse)**
```sql
SELECT round(avgMerge(eng_avg_state), 2) AS value
FROM iot.sensor_telemetry_1hour
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
```

**H5 — Tekanan Weekly Trend (multi-line-chart, clickhouse)**
```sql
SELECT
  time_bucket AS time,
  node_code AS series,
  round(avgMerge(eng_avg_state), 2) AS value
FROM iot.sensor_telemetry_1hour
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
  AND time_bucket >= now() - INTERVAL ${timeRange}
GROUP BY time_bucket, node_code
ORDER BY time_bucket ASC
```

**H8 — Daily Summary Table (table, clickhouse)**
```sql
SELECT
  event_date AS "Tanggal",
  node_code AS "Node",
  round(avgMerge(eng_avg_state), 2) AS "Avg Tekanan",
  round(minMerge(eng_min_state), 2) AS "Min",
  round(maxMerge(eng_max_state), 2) AS "Max",
  countMerge(sample_count_state) AS "Samples"
FROM iot.sensor_telemetry_daily
WHERE project_id = '${projectId}'
  AND metric_unit = 'bar'
  AND event_date >= today() - 30
GROUP BY event_date, node_code
ORDER BY event_date DESC, node_code
```

---

### I. KPI & EXECUTIVE

> **Tujuan:** Ringkasan untuk manajemen — KPI, trend, ranking  
> **Refresh:** 300 detik  
> **Default time range:** 30 hari

#### Widget Layout (10 widget)

```
ROW 0 (y=0, h=2) — KPI Cards
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ I1   │ │ I2   │ │ I3   │ │ I4   │ │ I5   │ │ I6   │
│Uptime│ │Data  │ │Total │ │Alarm │ │Avg   │ │Power │
│%     │ │Rate% │ │DMA   │ │/Month│ │Tekan │ │Total │
│2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │ │2×2   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘

ROW 2 (y=2, h=5) — Monthly Trends
┌──────────────────────────┐ ┌──────────────────────────┐
│ I7 — Monthly Tekanan     │ │ I8 — Monthly Debit       │
│ multi-line-chart         │ │ multi-line-chart          │
│ (daily table, per DMA)   │ │ (daily table, per DMA)   │
│ 6×5                      │ │ 6×5                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 7 (y=7, h=4) — Rankings
┌──────────────────────────┐ ┌──────────────────────────┐
│ I9 — DMA Ranking Table   │ │ I10 — Alarm Trend Monthly│
│ table (ranked by alarm   │ │ bar-chart (daily alarm   │
│ count + uptime)          │ │ count, 30 days)          │
│ 6×4                      │ │ 6×4                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**I1 — Uptime Percentage (stat-card, clickhouse)**
```sql
SELECT
  round(
    countIf(last_seen > now() - INTERVAL 10 MINUTE) * 100.0 / count(),
    1
  ) AS value
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
```

**I2 — Data Rate % (stat-card, clickhouse)**
```sql
WITH
  expected AS (
    SELECT count() * 144 AS expected_daily
    FROM iot.node_latest FINAL
    WHERE owner_code = '${ownerCode}'
  ),
  actual AS (
    SELECT count() AS actual_count
    FROM iot.sensor_telemetry
    WHERE owner_code = '${ownerCode}'
      AND event_time >= now() - INTERVAL 1 DAY
  )
SELECT round(actual_count * 100.0 / greatest(expected_daily, 1), 1) AS value
FROM expected, actual
```

**I9 — DMA Ranking (table, mixed clickhouse + postgresql)**
```sql
SELECT
  project_code AS "DMA",
  count() AS "Total Node",
  countIf(last_seen > now() - INTERVAL 10 MINUTE) AS "Online",
  round(countIf(last_seen > now() - INTERVAL 10 MINUTE) * 100.0 / count(), 1) AS "Uptime %"
FROM iot.node_latest FINAL
WHERE owner_code = '${ownerCode}'
GROUP BY project_code
ORDER BY "Uptime %" DESC
```

---

### J. ML & ANOMALY

> **Tujuan:** Hasil anomaly detection & forecast dari ML pipeline  
> **Refresh:** 300 detik  
> **Default time range:** 7 hari

#### Widget Layout (8 widget)

```
ROW 0 (y=0, h=2) — ML Summary
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ J1     │ │ J2     │ │ J3     │ │ J4     │
│Anomaly │ │Critical│ │Forecast│ │Active  │
│Total 7d│ │Count   │ │Count   │ │Detector│
│stat 3×2│ │stat 3×2│ │stat 3×2│ │stat 3×2│
└────────┘ └────────┘ └────────┘ └────────┘

ROW 2 (y=2, h=5) — Anomaly Charts
┌──────────────────────────┐ ┌──────────────────────────┐
│ J5 — Anomaly Timeline    │ │ J6 — Anomaly by Device   │
│ bar-chart (daily count   │ │ pie-chart (which device   │
│ by grade)                │ │ has most anomalies)      │
│ 6×5                      │ │ 6×5                      │
└──────────────────────────┘ └──────────────────────────┘

ROW 7 (y=7, h=5) — Detail Tables
┌──────────────────────────┐ ┌──────────────────────────┐
│ J7 — Anomaly Results     │ │ J8 — Forecast Results    │
│ table (recent anomalies) │ │ table (upcoming          │
│ 6×5                      │ │ predictions)             │
│                          │ │ 6×5                      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Key Queries

**J1 — Anomaly Count 7d (stat-card, postgresql)**
```sql
SELECT COUNT(*) AS value
FROM anomaly_results
WHERE detected_at >= NOW() - INTERVAL '7 days'
```

**J5 — Anomaly Timeline (bar-chart, postgresql)**
```sql
SELECT
  DATE(detected_at) AS "date",
  anomaly_grade AS "severity",
  COUNT(*) AS "count"
FROM anomaly_results
WHERE detected_at >= NOW() - INTERVAL '${timeRange}'
GROUP BY DATE(detected_at), anomaly_grade
ORDER BY "date" ASC
```

**J7 — Anomaly Results Table (table, postgresql)**
```sql
SELECT
  detected_at AS "Detected",
  device_id AS "Device",
  sensor_key AS "Sensor",
  metric_code AS "Metric",
  round(actual_value::numeric, 2) AS "Actual",
  round(expected_value::numeric, 2) AS "Expected",
  round(anomaly_score::numeric, 2) AS "Score",
  anomaly_grade AS "Grade",
  anomaly_type AS "Type",
  note AS "Note"
FROM anomaly_results
WHERE detected_at >= NOW() - INTERVAL '${timeRange}'
ORDER BY detected_at DESC
LIMIT 100
```

---

## 5. Total Widget Count Summary

| Dashboard | Widgets | Data Sources |
|-----------|---------|-------------|
| A. Overview | 12 | CH + PG |
| B. Alarm Center | 8 | PG |
| C. Node Health | 9 | CH + PG |
| D. Tekanan Analysis | 9 | CH |
| E. Debit Analysis | 9 | CH |
| F. Power & VSD | 10 | CH |
| G. DMA Operator (×N) | 15 | CH + PG |
| H. DMA Analytics (×N) | 8 | CH |
| I. KPI & Executive | 10 | CH + PG |
| J. ML & Anomaly | 8 | PG |
| **TOTAL (fixed)** | **98** | |
| **TOTAL (5 DMA)** | **98 + (23×5) = 213** | |

---

## 6. Variable System — Required Extensions

### 6.1 Saat Ini Sudah Ada

| Variable | Source |
|----------|--------|
| `${timeRange}` | Time picker → ClickHouse interval |
| `${fromTime}` | Time picker → ISO timestamp |
| `${toTime}` | Time picker → ISO timestamp |
| `${ownerId}` | JWT `user.idOwner` |

### 6.2 Perlu Ditambahkan

| Variable | Source | Digunakan Oleh |
|----------|--------|---------------|
| `${ownerCode}` | Lookup dari `ownerId` → `owners.owner_code` | ClickHouse queries (semua dashboard owner-scope) |
| `${projectId}` | `dashboard.layout_config.projectId` atau filter UI | DMA Operator, DMA Analytics |
| `${nodeCode1}` .. `${nodeCodeN}` | Widget `config.variables` | Gauge per node |

### 6.3 Implementation Plan

```typescript
// widget-builder.service.ts → replaceVariables() method

// 1. Resolve ownerCode from ownerId
const owner = await this.ownerRepo.findOne({ where: { idOwner } });
variables['ownerCode'] = owner.ownerCode;

// 2. Resolve projectId from dashboard layout_config
if (dashboard.layoutConfig?.projectId) {
  variables['projectId'] = dashboard.layoutConfig.projectId;
}

// 3. Merge widget-level variables
if (widget.config?.variables) {
  Object.assign(variables, widget.config.variables);
}
```

---

## 7. Dashboard Provisioning Strategy

### 7.1 System Templates

Buat **10 template dashboard** yang auto-provisioned saat owner baru dibuat:

```typescript
// Seed function: createDefaultDashboards(ownerId, ownerCode)
const TEMPLATES = [
  { category: 'overview',          name: 'Overview',            scope: 'owner' },
  { category: 'alarm-center',      name: 'Alarm Center',        scope: 'owner' },
  { category: 'node-health',       name: 'Node Health',         scope: 'owner' },
  { category: 'tekanan-analysis',  name: 'Tekanan Monitoring',  scope: 'owner' },
  { category: 'debit-analysis',    name: 'Debit Monitoring',    scope: 'owner' },
  { category: 'power-vsd',         name: 'Power & VSD',         scope: 'owner' },
  { category: 'kpi-executive',     name: 'KPI & Executive',     scope: 'owner' },
  { category: 'ml-anomaly',        name: 'ML & Anomaly',        scope: 'owner' },
];

// Per-DMA templates (created when project is added):
// createDmaDashboards(ownerId, projectId, projectName)
const DMA_TEMPLATES = [
  { category: 'dma-operator',   name: '{projectName} — Operator' },
  { category: 'dma-analytics',  name: '{projectName} — Analytics' },
];
```

### 7.2 Auto-Provision Flow

```
Owner Created → 8 owner-scope dashboards created
                 ↓
Project Created → 2 DMA dashboards created (Operator + Analytics)
                 ↓
Each dashboard → N widgets created with SQL + config from template
```

### 7.3 Seed Script API Calls

```
POST /api/widget-builder/dashboards         → create dashboard
POST /api/widget-builder/dashboards/:id/widgets  → create widget (×N)
PATCH /api/widget-builder/dashboards/:id/widgets/positions → batch set positions
```

---

## 8. Implementasi Prioritas

| Priority | Dashboard | Kenapa Duluan | Est. Effort |
|----------|-----------|--------------|-------------|
| **P0** | G. DMA Operator | Core use case, sudah di-design detail | 3 hari |
| **P0** | A. Overview | Landing page, paling sering dilihat | 2 hari |
| **P1** | B. Alarm Center | Wajib untuk operasional | 2 hari |
| **P1** | D. Tekanan Analysis | Metrik utama PDAM | 2 hari |
| **P2** | C. Node Health | Maintenance penting | 1 hari |
| **P2** | E. Debit Analysis | Mirror dari tekanan, cepat | 1 hari |
| **P2** | F. Power & VSD | Kalau ada sensor power | 1 hari |
| **P3** | H. DMA Analytics | Historis, bisa nanti | 1 hari |
| **P3** | I. KPI & Executive | Management bisa tunggu | 2 hari |
| **P3** | J. ML & Anomaly | ML pipeline harus jalan dulu | 1 hari |

**Total estimated:** ~16 hari kerja (termasuk backend variable extension + seed script)

---

## 9. Appendix — Dashboard Entity Quick Reference

```json
{
  "id_dashboard": "uuid",
  "id_owner": "uuid",
  "name": "Overview",
  "description": "Bird's eye view semua DMA",
  "layout_config": {
    "columns": 12,
    "rowHeight": 80,
    "category": "overview",
    "projectId": null,
    "tags": ["all-dma", "summary"]
  },
  "time_range": "24h",
  "refresh_interval": 30,
  "is_default": true,
  "is_active": true
}
```

Widget:
```json
{
  "id_widget": "uuid",
  "id_dashboard": "uuid",
  "name": "Node Online",
  "widget_type": "stat-card",
  "position_x": 2,
  "position_y": 0,
  "cols": 2,
  "rows": 2,
  "sql_query": "SELECT countIf(...) AS value FROM iot.node_latest FINAL WHERE owner_code = '${ownerCode}'",
  "data_source": "clickhouse",
  "config": {
    "title": "Node Online",
    "mapping": { "valueField": "value" },
    "yAxis": { "unit": "", "decimals": 0 },
    "variables": {}
  }
}
```
