-- =============================================================
-- SEED DASHBOARDS: PDAM TEBO (ownerCode: 9VSIK)
-- Owner:   4cabf383-cb99-47e2-9c6c-9ad4bbf543fd
-- Project: 1414bdba-000b-4e17-b877-557136f8ef2a (Cabang Tebo)
-- Nodes:   6x HELIO (tekanan/bar only)
-- Generated: 2026-03-02
-- =============================================================

-- Cleanup existing
DELETE FROM custom_widgets WHERE id_dashboard IN (SELECT id_dashboard FROM custom_dashboards WHERE id_owner = '4cabf383-cb99-47e2-9c6c-9ad4bbf543fd');
DELETE FROM custom_dashboards WHERE id_owner = '4cabf383-cb99-47e2-9c6c-9ad4bbf543fd';

DO $$
DECLARE
  v_owner_id UUID := '4cabf383-cb99-47e2-9c6c-9ad4bbf543fd';
  v_project_id UUID := '1414bdba-000b-4e17-b877-557136f8ef2a';
  v_layout JSONB;
  d_overview UUID;
  d_tekanan UUID;
  d_health UUID;
BEGIN
  v_layout := jsonb_build_object('variables', jsonb_build_object('projectId', v_project_id::text));

  -- =============================================================
  -- DASHBOARD A: OVERVIEW
  -- =============================================================
  INSERT INTO custom_dashboards (id_owner, name, description, layout_config, time_range, refresh_interval, is_default, is_active)
  VALUES (v_owner_id, 'Overview', 'Ringkasan keseluruhan status sensor dan node PDAM Tebo', v_layout, '24h', 30, true, true)
  RETURNING id_dashboard INTO d_overview;

  -- W-A1: Stat Card - Total Node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Total Node', 'stat-card', 0, 0, 2, 2,
    'SELECT count() AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}''',
    'clickhouse',
    '{"title": "Total Node", "mapping": {"valueField": "value"}, "display": {"icon": "router", "color": "#4A90D9", "suffix": " unit"}}'::jsonb);

  -- W-A2: Stat Card - Node Online
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Node Online', 'stat-card', 2, 0, 2, 2,
    'SELECT count() AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}'' AND last_seen > now() - INTERVAL 10 MINUTE',
    'clickhouse',
    '{"title": "Node Online", "mapping": {"valueField": "value"}, "display": {"icon": "wifi", "color": "#27AE60", "suffix": " unit"}}'::jsonb);

  -- W-A3: Stat Card - Node Degraded
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Node Degraded', 'stat-card', 4, 0, 2, 2,
    'SELECT count() AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}'' AND last_seen <= now() - INTERVAL 10 MINUTE',
    'clickhouse',
    '{"title": "Node Degraded", "mapping": {"valueField": "value"}, "display": {"icon": "wifi_off", "color": "#E74C3C", "suffix": " unit"}}'::jsonb);

  -- W-A4: Stat Card - Rata-rata Tekanan
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Rata-rata Tekanan', 'stat-card', 6, 0, 2, 2,
    'SELECT round(avg(eng_value), 2) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND lower(metric_code) = ''tekanan''',
    'clickhouse',
    '{"title": "Rata-rata Tekanan", "mapping": {"valueField": "value"}, "display": {"icon": "compress", "color": "#8E44AD", "suffix": " bar"}}'::jsonb);

  -- W-A5: Stat Card - Tekanan Max
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Tekanan Max (Live)', 'stat-card', 8, 0, 2, 2,
    'SELECT round(max(eng_value), 2) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND lower(metric_code) = ''tekanan''',
    'clickhouse',
    '{"title": "Tekanan Max", "mapping": {"valueField": "value"}, "display": {"icon": "arrow_upward", "color": "#E67E22", "suffix": " bar"}}'::jsonb);

  -- W-A6: Stat Card - Tekanan Min
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Tekanan Min (Live)', 'stat-card', 10, 0, 2, 2,
    'SELECT round(min(eng_value), 2) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND lower(metric_code) = ''tekanan''',
    'clickhouse',
    '{"title": "Tekanan Min", "mapping": {"valueField": "value"}, "display": {"icon": "arrow_downward", "color": "#2980B9", "suffix": " bar"}}'::jsonb);

  -- W-A7: Multi-line - Trend Tekanan Semua Node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Trend Tekanan Semua Node', 'multi-line-chart', 0, 2, 8, 4,
    'SELECT time_bucket, node_code, round(avgMerge(eng_avg_state), 3) AS tekanan FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket, node_code ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Trend Tekanan Semua Node", "mapping": {"xField": "time_bucket", "yField": "tekanan", "seriesField": "node_code"}, "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Tekanan", "unit": "bar", "decimals": 2, "min": 0, "max": null, "scale": "linear"}, "display": {"showLegend": true, "legendPosition": "bottom", "lineStyle": "smooth", "lineWidth": 2, "fillOpacity": 0.05, "showPoints": "auto", "tooltipMode": "all"}}'::jsonb);

  -- W-A8: Table - Status Terkini
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Status Terkini Semua Node', 'table', 8, 2, 4, 4,
    'SELECT node_code AS "Node", round(eng_value, 3) AS "Tekanan (bar)", formatDateTime(last_update, ''%Y-%m-%d %H:%i'') AS "Update Terakhir", if(last_update > now() - INTERVAL 10 MINUTE, ''Online'', ''Degraded'') AS "Status" FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' ORDER BY node_code',
    'clickhouse',
    '{"title": "Status Terkini Semua Node"}'::jsonb);

  -- W-A9: Bar Chart - Perbandingan Tekanan per Node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Perbandingan Tekanan per Node', 'bar-chart', 0, 6, 6, 4,
    'SELECT node_code AS label, round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND lower(metric_code) = ''tekanan'' ORDER BY node_code',
    'clickhouse',
    '{"title": "Perbandingan Tekanan per Node (Live)", "mapping": {"xField": "label", "yField": "value"}, "yAxis": {"label": "Tekanan", "unit": "bar"}}'::jsonb);

  -- W-A10: Multi-line - Min/Max/Avg Tekanan
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_overview, 'Min/Max/Avg Tekanan', 'multi-line-chart', 6, 6, 6, 4,
    'SELECT time_bucket, round(avgMerge(eng_avg_state), 3) AS avg_tekanan, round(minMerge(eng_min_state), 3) AS min_tekanan, round(maxMerge(eng_max_state), 3) AS max_tekanan FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Statistik Tekanan (Semua Node)", "mapping": {"xField": "time_bucket", "yFields": ["avg_tekanan", "min_tekanan", "max_tekanan"]}, "series": [{"field": "avg_tekanan", "label": "Rata-rata", "color": "#3498DB", "unit": "bar", "decimals": 3, "visible": true}, {"field": "min_tekanan", "label": "Minimum", "color": "#27AE60", "unit": "bar", "decimals": 3, "visible": true}, {"field": "max_tekanan", "label": "Maksimum", "color": "#E74C3C", "unit": "bar", "decimals": 3, "visible": true}], "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Tekanan", "unit": "bar", "decimals": 3, "min": 0, "max": null, "scale": "linear"}, "display": {"showLegend": true, "legendPosition": "bottom", "lineStyle": "smooth", "lineWidth": 2, "fillOpacity": 0.1, "showPoints": "never", "tooltipMode": "all"}}'::jsonb);


  -- =============================================================
  -- DASHBOARD B: TEKANAN ANALYSIS
  -- =============================================================
  INSERT INTO custom_dashboards (id_owner, name, description, layout_config, time_range, refresh_interval, is_default, is_active)
  VALUES (v_owner_id, 'Tekanan Analysis', 'Analisis detail tekanan per node dengan gauge, trend dan statistik', v_layout, '24h', 30, false, true)
  RETURNING id_dashboard INTO d_tekanan;

  -- W-B1..B6: Gauges per node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3505', 'gauge', 0, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-350544503213269'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3505", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 5, "decimals": 2, "scale": "linear"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3536-935', 'gauge', 2, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-353691843830935'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3536-935", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 5, "decimals": 2, "scale": "linear"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3536-016', 'gauge', 4, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-353691843831016'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3536-016", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 5, "decimals": 2, "scale": "linear"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3570-872', 'gauge', 6, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-357073298204872'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3570-872", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 10, "decimals": 2, "scale": "linear"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3570-240', 'gauge', 8, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-357073298536240'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3570-240", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 5, "decimals": 2, "scale": "linear"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Tekanan HELIO-3570-905', 'gauge', 10, 0, 2, 3,
    'SELECT round(eng_value, 3) AS value FROM sensor_channel_latest FINAL WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-357073299572905'' LIMIT 1',
    'clickhouse',
    '{"title": "HELIO-3570-905", "mapping": {"valueField": "value"}, "thresholds": [{"mode": "manual", "value": 0, "label": "Low", "color": "#3498DB", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 0.5, "label": "Normal", "color": "#27AE60", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 2.0, "label": "High", "color": "#E67E22", "lineStyle": "solid", "field": ""}, {"mode": "manual", "value": 4.0, "label": "Critical", "color": "#E74C3C", "lineStyle": "solid", "field": ""}], "yAxis": {"label": "bar", "unit": "bar", "min": 0, "max": 5, "decimals": 2, "scale": "linear"}}'::jsonb);

  -- W-B7..B9: Line Charts per node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Trend HELIO-3505', 'line-chart', 0, 3, 4, 3,
    'SELECT time_bucket, round(avgMerge(eng_avg_state), 3) AS tekanan FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-350544503213269'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Trend HELIO-3505", "mapping": {"xField": "time_bucket", "yField": "tekanan"}, "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Tekanan", "unit": "bar", "decimals": 3, "min": 0, "max": null, "scale": "linear"}, "series": [{"field": "tekanan", "label": "Tekanan", "color": "#3498DB", "unit": "bar", "decimals": 3, "visible": true}], "display": {"showLegend": false, "lineStyle": "smooth", "lineWidth": 2, "fillOpacity": 0.15, "showPoints": "never", "tooltipMode": "single"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Trend HELIO-3536-935', 'line-chart', 4, 3, 4, 3,
    'SELECT time_bucket, round(avgMerge(eng_avg_state), 3) AS tekanan FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-353691843830935'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Trend HELIO-3536-935", "mapping": {"xField": "time_bucket", "yField": "tekanan"}, "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Tekanan", "unit": "bar", "decimals": 3, "min": 0, "max": null, "scale": "linear"}, "series": [{"field": "tekanan", "label": "Tekanan", "color": "#27AE60", "unit": "bar", "decimals": 3, "visible": true}], "display": {"showLegend": false, "lineStyle": "smooth", "lineWidth": 2, "fillOpacity": 0.15, "showPoints": "never", "tooltipMode": "single"}}'::jsonb);

  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Trend HELIO-3536-016', 'line-chart', 8, 3, 4, 3,
    'SELECT time_bucket, round(avgMerge(eng_avg_state), 3) AS tekanan FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND node_code = ''HELIO-353691843831016'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Trend HELIO-3536-016", "mapping": {"xField": "time_bucket", "yField": "tekanan"}, "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Tekanan", "unit": "bar", "decimals": 3, "min": 0, "max": null, "scale": "linear"}, "series": [{"field": "tekanan", "label": "Tekanan", "color": "#E67E22", "unit": "bar", "decimals": 3, "visible": true}], "display": {"showLegend": false, "lineStyle": "smooth", "lineWidth": 2, "fillOpacity": 0.15, "showPoints": "never", "tooltipMode": "single"}}'::jsonb);

  -- W-B10: Table - Statistik Tekanan
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_tekanan, 'Statistik Tekanan per Node', 'table', 0, 6, 12, 3,
    'SELECT node_code AS "Node", round(avgMerge(eng_avg_state), 3) AS "Rata-rata (bar)", round(minMerge(eng_min_state), 3) AS "Min (bar)", round(maxMerge(eng_max_state), 3) AS "Max (bar)", sum(countMerge(sample_count_state)) AS "Jumlah Sample" FROM sensor_telemetry_10min WHERE owner_code = ''${ownerCode}'' AND time_bucket BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY node_code ORDER BY node_code',
    'clickhouse',
    '{"title": "Statistik Tekanan per Node (Periode Terpilih)"}'::jsonb);


  -- =============================================================
  -- DASHBOARD C: NODE HEALTH
  -- =============================================================
  INSERT INTO custom_dashboards (id_owner, name, description, layout_config, time_range, refresh_interval, is_default, is_active)
  VALUES (v_owner_id, 'Node Health', 'Monitoring kesehatan node: konektivitas, signal quality, data freshness', v_layout, '24h', 30, false, true)
  RETURNING id_dashboard INTO d_health;

  -- W-C1: Online Ratio
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Online Ratio', 'stat-card', 0, 0, 3, 2,
    'SELECT concat(toString(countIf(last_seen > now() - INTERVAL 10 MINUTE)), '' / '', toString(count())) AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}''',
    'clickhouse',
    '{"title": "Online / Total", "mapping": {"valueField": "value"}, "display": {"icon": "cell_tower", "color": "#27AE60", "suffix": " node"}}'::jsonb);

  -- W-C2: Avg Signal Quality
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Avg Signal Quality', 'stat-card', 3, 0, 3, 2,
    'SELECT round(avg(signal_quality), 0) AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}''',
    'clickhouse',
    '{"title": "Rata-rata Signal Quality", "mapping": {"valueField": "value"}, "display": {"icon": "signal_cellular_alt", "color": "#4A90D9", "suffix": " dBm"}}'::jsonb);

  -- W-C3: Stale Node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Node Paling Lama Tidak Update', 'stat-card', 6, 0, 3, 2,
    'SELECT node_code AS value FROM node_latest FINAL WHERE owner_code = ''${ownerCode}'' ORDER BY last_seen ASC LIMIT 1',
    'clickhouse',
    '{"title": "Node Paling Stale", "mapping": {"valueField": "value"}, "display": {"icon": "warning", "color": "#E74C3C", "suffix": ""}}'::jsonb);

  -- W-C4: Data Points Hari Ini
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Data Points (Hari Ini)', 'stat-card', 9, 0, 3, 2,
    'SELECT formatReadableQuantity(count()) AS value FROM sensor_telemetry WHERE owner_code = ''${ownerCode}'' AND event_time >= today()',
    'clickhouse',
    '{"title": "Data Points Hari Ini", "mapping": {"valueField": "value"}, "display": {"icon": "analytics", "color": "#8E44AD", "suffix": ""}}'::jsonb);

  -- W-C5: Table - Detail Node Health
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Detail Node Health', 'table', 0, 2, 12, 4,
    'SELECT node_code AS "Node", node_model AS "Model", formatDateTime(last_seen, ''%Y-%m-%d %H:%i:%s'') AS "Last Seen", signal_quality AS "Signal (dBm)", firmware_version AS "Firmware", total_channels AS "Channels", if(last_seen > now() - INTERVAL 10 MINUTE, ''🟢 Online'', if(last_seen > now() - INTERVAL 1 HOUR, ''🟡 Degraded'', ''🔴 Offline'')) AS "Status" FROM node_latest FINAL WHERE owner_code = ''${ownerCode}'' ORDER BY last_seen DESC',
    'clickhouse',
    '{"title": "Detail Node Health"}'::jsonb);

  -- W-C6: Bar - Data Throughput per Node
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Data Throughput per Node (Hari Ini)', 'bar-chart', 0, 6, 6, 4,
    'SELECT node_code AS label, count() AS value FROM sensor_telemetry WHERE owner_code = ''${ownerCode}'' AND event_time >= today() GROUP BY node_code ORDER BY node_code',
    'clickhouse',
    '{"title": "Data Throughput per Node (Hari Ini)", "mapping": {"xField": "label", "yField": "value"}, "yAxis": {"label": "Jumlah Data Points", "unit": "", "decimals": 0}}'::jsonb);

  -- W-C7: Multi-line - Data Volume per Jam
  INSERT INTO custom_widgets (id_dashboard, name, widget_type, position_x, position_y, cols, rows, sql_query, data_source, config)
  VALUES (d_health, 'Data Volume per Jam', 'multi-line-chart', 6, 6, 6, 4,
    'SELECT toStartOfHour(event_time) AS time_bucket, node_code, count() AS data_points FROM sensor_telemetry WHERE owner_code = ''${ownerCode}'' AND event_time BETWEEN ''${fromTime}'' AND ''${toTime}'' GROUP BY time_bucket, node_code ORDER BY time_bucket',
    'clickhouse',
    '{"title": "Data Volume per Jam", "mapping": {"xField": "time_bucket", "yField": "data_points", "seriesField": "node_code"}, "xAxis": {"label": "Waktu", "timeFormat": "HH:mm"}, "yAxis": {"label": "Data Points", "unit": "", "decimals": 0}, "display": {"showLegend": true, "legendPosition": "bottom", "lineStyle": "straight", "lineWidth": 2, "fillOpacity": 0, "showPoints": "never", "tooltipMode": "all"}}'::jsonb);

  RAISE NOTICE 'Created 3 dashboards for PDAM TEBO:';
  RAISE NOTICE '  Overview:         %', d_overview;
  RAISE NOTICE '  Tekanan Analysis: %', d_tekanan;
  RAISE NOTICE '  Node Health:      %', d_health;
  RAISE NOTICE 'Total widgets: 27';
END $$;
