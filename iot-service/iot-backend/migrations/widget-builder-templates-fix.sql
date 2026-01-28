-- ============================================
-- Widget Builder Query Templates Fix
-- Date: 2026-01-26
-- Memperbaiki query templates menggunakan tabel yang benar: sensor_logs
-- ============================================

-- Hapus template yang salah
DELETE FROM widget_query_templates WHERE is_system = true;

-- Insert template yang benar sesuai struktur database
INSERT INTO widget_query_templates (name, description, sql_template, widget_type, default_config, is_system) VALUES

-- 1. Time Series - Sensor Data over Time (Multi-line)
(
    'Sensor Time Series',
    'Time series data for multiple sensors/channels over time',
    'SELECT 
    date_trunc(''hour'', sl.ts) AS timestamp,
    sc.metric_code,
    AVG(sl.value_engineered) AS value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_owner = ''${ownerId}''
  AND sl.ts >= NOW() - INTERVAL ''${timeRange}''
GROUP BY date_trunc(''hour'', sl.ts), sc.metric_code
ORDER BY timestamp',
    'multi-line-chart',
    '{"mapping": {"xField": "timestamp", "yFields": ["value"], "seriesField": "metric_code"}}',
    true
),

-- 2. Single Sensor Time Series (Line Chart)
(
    'Single Sensor Trend',
    'Single sensor value trend over time',
    'SELECT 
    sl.ts AS timestamp,
    sl.value_engineered AS value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_owner = ''${ownerId}''
  AND sc.metric_code = ''${metricCode}''
  AND sl.ts >= NOW() - INTERVAL ''${timeRange}''
ORDER BY sl.ts',
    'line-chart',
    '{"mapping": {"xField": "timestamp", "yFields": ["value"]}}',
    true
),

-- 3. Node Status Distribution (Pie Chart)
(
    'Node Status Distribution',
    'Count nodes by connectivity status',
    'SELECT 
    COALESCE(connectivity_status, ''unknown'') as status, 
    COUNT(*) as count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ''${ownerId}''
GROUP BY connectivity_status',
    'pie-chart',
    '{"mapping": {"labelField": "status", "valueField": "count"}}',
    true
),

-- 4. Latest Sensor Values (Table)
(
    'Sensor Latest Values',
    'Get latest value for each sensor channel',
    'SELECT DISTINCT ON (sc.id_sensor_channel)
    s.label AS sensor_name,
    sc.metric_code,
    sl.value_engineered AS value,
    sc.unit,
    sl.ts AS timestamp,
    sl.quality_flag AS status
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.id_owner = ''${ownerId}''
  AND sl.ts >= NOW() - INTERVAL ''1 hour''
ORDER BY sc.id_sensor_channel, sl.ts DESC',
    'table',
    '{"mapping": {"columns": ["sensor_name", "metric_code", "value", "unit", "timestamp", "status"]}}',
    true
),

-- 5. Average Values by Sensor (Bar Chart)
(
    'Average Values by Sensor',
    'Compare average values across sensors',
    'SELECT 
    s.label AS sensor_name,
    sc.metric_code,
    ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.id_owner = ''${ownerId}''
  AND sl.ts >= NOW() - INTERVAL ''${timeRange}''
GROUP BY s.label, sc.metric_code
ORDER BY avg_value DESC',
    'bar-chart',
    '{"mapping": {"xField": "sensor_name", "yFields": ["avg_value"]}}',
    true
),

-- 6. Current Gauge Value
(
    'Current Sensor Value',
    'Single current value for gauge display',
    'SELECT 
    sl.value_engineered AS value,
    sc.unit,
    sc.min_threshold,
    sc.max_threshold
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_owner = ''${ownerId}''
  AND sc.metric_code = ''${metricCode}''
ORDER BY sl.ts DESC
LIMIT 1',
    'gauge',
    '{"mapping": {"valueField": "value", "minField": "min_threshold", "maxField": "max_threshold"}}',
    true
),

-- 7. Stat Card - Count/Sum/Average
(
    'Sensor Statistics',
    'Statistical summary for stat card',
    'SELECT 
    COUNT(*) AS total_readings,
    ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value,
    ROUND(MAX(sl.value_engineered)::numeric, 2) AS max_value,
    ROUND(MIN(sl.value_engineered)::numeric, 2) AS min_value
FROM sensor_logs sl
WHERE sl.id_owner = ''${ownerId}''
  AND sl.ts >= NOW() - INTERVAL ''${timeRange}''',
    'stat-card',
    '{"mapping": {"valueField": "avg_value", "labelField": "total_readings"}}',
    true
),

-- 8. Alert Events Count
(
    'Alert Events Summary',
    'Count alert events by status',
    'SELECT 
    ae.status,
    COUNT(*) as count
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ''${ownerId}''
  AND ae.triggered_at >= NOW() - INTERVAL ''${timeRange}''
GROUP BY ae.status',
    'bar-chart',
    '{"mapping": {"xField": "status", "yFields": ["count"]}}',
    true
),

-- 9. Node Health Overview
(
    'Node Health Overview',
    'Node health status summary',
    'SELECT 
    n.name AS node_name,
    n.connectivity_status,
    n.last_seen_at,
    COUNT(DISTINCT s.id_sensor) AS sensor_count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
LEFT JOIN sensors s ON s.id_node = n.id_node
WHERE p.id_owner = ''${ownerId}''
GROUP BY n.id_node, n.name, n.connectivity_status, n.last_seen_at
ORDER BY n.name',
    'table',
    '{"mapping": {"columns": ["node_name", "connectivity_status", "last_seen_at", "sensor_count"]}}',
    true
),

-- 10. Hourly Data Volume
(
    'Hourly Data Volume',
    'Data ingestion rate per hour',
    'SELECT 
    date_trunc(''hour'', sl.ts) AS hour,
    COUNT(*) AS record_count
FROM sensor_logs sl
WHERE sl.id_owner = ''${ownerId}''
  AND sl.ts >= NOW() - INTERVAL ''${timeRange}''
GROUP BY date_trunc(''hour'', sl.ts)
ORDER BY hour',
    'bar-chart',
    '{"mapping": {"xField": "hour", "yFields": ["record_count"]}}',
    true
);

-- Verifikasi
SELECT name, widget_type, is_system FROM widget_query_templates WHERE is_system = true;
