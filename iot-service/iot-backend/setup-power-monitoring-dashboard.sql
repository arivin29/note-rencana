-- =====================================================
-- Dashboard: Power & Water Monitoring System
-- Owner ID: c73a0425-34e5-4ed3-a435-eb740f915648
-- Sensors: POWER METER, Tekanan, TUF2000 (Flow), VSD
-- =====================================================

-- Generate dashboard UUID
DO $$
DECLARE
    v_dashboard_id UUID := gen_random_uuid();
    v_owner_id UUID := 'c73a0425-34e5-4ed3-a435-eb740f915648';
BEGIN

-- 1. Create Dashboard
INSERT INTO custom_dashboards (
    id_dashboard, id_owner, name, description, 
    layout_config, time_range, refresh_interval, 
    is_default, is_active
) VALUES (
    v_dashboard_id,
    v_owner_id,
    'Power & Water Monitoring',
    'Real-time monitoring dashboard for Power Meter, Pressure, Flow Rate, and VSD parameters',
    '{"columns": 12, "rowHeight": 80}'::jsonb,
    '6h',
    30,
    true,
    true
);

-- =====================================================
-- ROW 1: STAT CARDS (4 cards - Pressure, Debit, Power, Frequency)
-- =====================================================

-- Widget 1: Pressure Stat Card
INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Tekanan',
    'stat-card',
    0, 0, 3, 2,
    'SELECT 
        latest_value as value,
        ''bar'' as unit
    FROM sensor_channels 
    WHERE id_sensor_channel = ''75f89f25-a1b2-4e5b-b0d7-4107f689710f''',
    'postgresql',
    '{
        "title": "Tekanan",
        "mapping": {"valueField": "value"},
        "yAxis": {"unit": "bar", "decimals": 2},
        "display": {
            "statCardOptions": {
                "layout": "with-icon",
                "icon": "fa-tachometer-alt",
                "iconColor": "#5794f2",
                "prefix": "",
                "suffix": "",
                "showTrend": false,
                "thresholdColors": true,
                "fontSize": "large",
                "valueColor": "#ffffff"
            }
        },
        "thresholds": [
            {"value": 0.5, "color": "#f2495c", "label": "Low"},
            {"value": 1.0, "color": "#ff9830", "label": "Normal"},
            {"value": 2.0, "color": "#73bf69", "label": "High"}
        ]
    }'::jsonb,
    true
);

-- Widget 2: Debit (Flow Rate) Stat Card
INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Debit Air',
    'stat-card',
    3, 0, 3, 2,
    'SELECT 
        latest_value as value,
        ''m³/h'' as unit
    FROM sensor_channels 
    WHERE id_sensor_channel = ''26561b91-c0bb-400f-8d0d-77f8bfe9443b''',
    'postgresql',
    '{
        "title": "Debit Air",
        "mapping": {"valueField": "value"},
        "yAxis": {"unit": "m³/h", "decimals": 2},
        "display": {
            "statCardOptions": {
                "layout": "with-icon",
                "icon": "fa-tint",
                "iconColor": "#4ec5d4",
                "prefix": "",
                "suffix": "",
                "showTrend": false,
                "thresholdColors": true,
                "fontSize": "large",
                "valueColor": "#ffffff"
            }
        },
        "thresholds": [
            {"value": 5, "color": "#f2495c", "label": "Low"},
            {"value": 10, "color": "#ff9830", "label": "Normal"},
            {"value": 15, "color": "#73bf69", "label": "High"}
        ]
    }'::jsonb,
    true
);

-- Widget 3: Output Power (VSD) Stat Card
INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Output Power',
    'stat-card',
    6, 0, 3, 2,
    'SELECT 
        latest_value as value,
        ''kW'' as unit
    FROM sensor_channels 
    WHERE id_sensor_channel = ''577a621f-35b2-483f-90a6-f190ee4b19c3''',
    'postgresql',
    '{
        "title": "Output Power",
        "mapping": {"valueField": "value"},
        "yAxis": {"unit": "kW", "decimals": 3},
        "display": {
            "statCardOptions": {
                "layout": "with-icon",
                "icon": "fa-bolt",
                "iconColor": "#ff9830",
                "prefix": "",
                "suffix": "",
                "showTrend": false,
                "thresholdColors": true,
                "fontSize": "large",
                "valueColor": "#ffffff"
            }
        },
        "thresholds": [
            {"value": 0.2, "color": "#73bf69", "label": "Low"},
            {"value": 0.5, "color": "#ff9830", "label": "Normal"},
            {"value": 1.0, "color": "#f2495c", "label": "High"}
        ]
    }'::jsonb,
    true
);

-- Widget 4: RPM (VSD) Stat Card
INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Motor RPM',
    'stat-card',
    9, 0, 3, 2,
    'SELECT 
        latest_value as value,
        ''RPM'' as unit
    FROM sensor_channels 
    WHERE id_sensor_channel = ''f2833c34-1fcf-41be-a56a-496f24728a6a''',
    'postgresql',
    '{
        "title": "Motor RPM",
        "mapping": {"valueField": "value"},
        "yAxis": {"unit": "RPM", "decimals": 0},
        "display": {
            "statCardOptions": {
                "layout": "with-icon",
                "icon": "fa-sync-alt",
                "iconColor": "#b877d9",
                "prefix": "",
                "suffix": "",
                "showTrend": false,
                "thresholdColors": false,
                "fontSize": "large",
                "valueColor": "#73bf69"
            }
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 2: 3-Phase Voltage Chart (Line Chart)
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Tegangan 3 Phase (L1, L2, L3)',
    'line-chart',
    0, 2, 6, 4,
    'SELECT 
        bucket as timestamp,
        metric_code as series,
        avg_value as value
    FROM mv_sensor_telemetry_10min
    WHERE id_sensor_channel IN (
        ''36879534-4b3c-4820-b2cc-642fdad5ea16'',
        ''fd3b05d5-2e14-4b17-8f88-e025092c4e8c'',
        ''cd2bfe6b-0a82-45fb-bc39-1f3b4fe6dd81''
    )
    AND bucket >= NOW() - INTERVAL ''6 hours''
    ORDER BY bucket',
    'postgresql',
    '{
        "title": "Tegangan 3 Phase",
        "mapping": {"xField": "timestamp", "yField": "value", "seriesField": "series"},
        "series": [
            {"field": "Voltage L1", "label": "L1", "color": "#f2495c", "unit": "V", "decimals": 1},
            {"field": "Voltage L2", "label": "L2", "color": "#ff9830", "unit": "V", "decimals": 1},
            {"field": "Voltage L3", "label": "L3", "color": "#73bf69", "unit": "V", "decimals": 1}
        ],
        "yAxis": {"label": "Voltage", "unit": "V", "decimals": 1},
        "display": {
            "showLegend": true,
            "legendPosition": "top",
            "lineStyle": "smooth",
            "lineWidth": 2,
            "fillOpacity": 10,
            "showPoints": "auto"
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 2: 3-Phase Current Chart (Line Chart)
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Arus 3 Phase (L1, L2, L3)',
    'line-chart',
    6, 2, 6, 4,
    'SELECT 
        bucket as timestamp,
        metric_code as series,
        avg_value as value
    FROM mv_sensor_telemetry_10min
    WHERE id_sensor_channel IN (
        ''1e8023c9-db70-46d4-85c3-f773333a0f0b'',
        ''904cf148-66c8-4cf4-b2c7-a723b32b0f95'',
        ''1580a674-f07d-4bdb-9086-6489a35e4378''
    )
    AND bucket >= NOW() - INTERVAL ''6 hours''
    ORDER BY bucket',
    'postgresql',
    '{
        "title": "Arus 3 Phase",
        "mapping": {"xField": "timestamp", "yField": "value", "seriesField": "series"},
        "series": [
            {"field": "Current L1", "label": "L1", "color": "#f2495c", "unit": "A", "decimals": 2},
            {"field": "Current L2", "label": "L2", "color": "#ff9830", "unit": "A", "decimals": 2},
            {"field": "Current L3", "label": "L3", "color": "#73bf69", "unit": "A", "decimals": 2}
        ],
        "yAxis": {"label": "Current", "unit": "A", "decimals": 2},
        "display": {
            "showLegend": true,
            "legendPosition": "top",
            "lineStyle": "smooth",
            "lineWidth": 2,
            "fillOpacity": 10,
            "showPoints": "auto"
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 3: Line Voltage Chart (AB, BC, CA)
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Tegangan Line (AB, BC, CA)',
    'line-chart',
    0, 6, 6, 4,
    'SELECT 
        bucket as timestamp,
        metric_code as series,
        avg_value as value
    FROM mv_sensor_telemetry_10min
    WHERE id_sensor_channel IN (
        ''a81c60c2-39da-4dcc-81ae-8d09d6b6bca4'',
        ''3164933c-6a42-4f51-a4e4-1eceac98b85b'',
        ''5fdff5ad-f09a-4251-91ec-cfccde5ed746''
    )
    AND bucket >= NOW() - INTERVAL ''6 hours''
    ORDER BY bucket',
    'postgresql',
    '{
        "title": "Tegangan Line",
        "mapping": {"xField": "timestamp", "yField": "value", "seriesField": "series"},
        "series": [
            {"field": "ab_line", "label": "AB", "color": "#5794f2", "unit": "V", "decimals": 1},
            {"field": "bc_line", "label": "BC", "color": "#b877d9", "unit": "V", "decimals": 1},
            {"field": "ca_line", "label": "CA", "color": "#4ec5d4", "unit": "V", "decimals": 1}
        ],
        "yAxis": {"label": "Line Voltage", "unit": "V", "decimals": 1},
        "display": {
            "showLegend": true,
            "legendPosition": "top",
            "lineStyle": "smooth",
            "lineWidth": 2,
            "fillOpacity": 10,
            "showPoints": "auto"
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 3: VSD Parameters Chart
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'VSD Parameters',
    'line-chart',
    6, 6, 6, 4,
    'SELECT 
        bucket as timestamp,
        metric_code as series,
        avg_value as value
    FROM mv_sensor_telemetry_10min
    WHERE id_sensor_channel IN (
        ''d8517744-d7e5-4fa4-8e0b-9e190ce85604'',
        ''8dc02d4d-e8d9-4a0b-963d-018f38cdf7e9'',
        ''777c317b-017e-4186-923c-69a6c88a647b''
    )
    AND bucket >= NOW() - INTERVAL ''6 hours''
    ORDER BY bucket',
    'postgresql',
    '{
        "title": "VSD Parameters",
        "mapping": {"xField": "timestamp", "yField": "value", "seriesField": "series"},
        "series": [
            {"field": "Running Frequency", "label": "Frequency", "color": "#73bf69", "unit": "Hz", "decimals": 2},
            {"field": "Voltage", "label": "Voltage", "color": "#5794f2", "unit": "V", "decimals": 0},
            {"field": "output_current", "label": "Current", "color": "#ff9830", "unit": "A", "decimals": 3}
        ],
        "yAxis": {"label": "Values", "unit": "", "decimals": 2},
        "display": {
            "showLegend": true,
            "legendPosition": "top",
            "lineStyle": "smooth",
            "lineWidth": 2,
            "fillOpacity": 10,
            "showPoints": "auto"
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 4: Pressure & Flow Trend
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Tekanan & Debit Trend',
    'line-chart',
    0, 10, 8, 4,
    'SELECT 
        bucket as timestamp,
        metric_code as series,
        avg_value as value
    FROM mv_sensor_telemetry_10min
    WHERE id_sensor_channel IN (
        ''75f89f25-a1b2-4e5b-b0d7-4107f689710f'',
        ''26561b91-c0bb-400f-8d0d-77f8bfe9443b''
    )
    AND bucket >= NOW() - INTERVAL ''6 hours''
    ORDER BY bucket',
    'postgresql',
    '{
        "title": "Tekanan & Debit Trend",
        "mapping": {"xField": "timestamp", "yField": "value", "seriesField": "series"},
        "series": [
            {"field": "pressure", "label": "Tekanan", "color": "#5794f2", "unit": "bar", "decimals": 2},
            {"field": "Debit", "label": "Debit", "color": "#73bf69", "unit": "m³/h", "decimals": 2}
        ],
        "yAxis": {"label": "Value", "unit": "", "decimals": 2},
        "display": {
            "showLegend": true,
            "legendPosition": "top",
            "lineStyle": "smooth",
            "lineWidth": 2,
            "fillOpacity": 20,
            "showPoints": "auto"
        }
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 4: Frequency Gauge
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Running Frequency',
    'gauge',
    8, 10, 4, 4,
    'SELECT 
        latest_value as value
    FROM sensor_channels 
    WHERE id_sensor_channel = ''d8517744-d7e5-4fa4-8e0b-9e190ce85604''',
    'postgresql',
    '{
        "title": "Running Frequency",
        "mapping": {"valueField": "value"},
        "yAxis": {"min": 0, "max": 60, "unit": "Hz", "decimals": 1},
        "thresholds": [
            {"value": 0, "color": "#f2495c", "label": "Low"},
            {"value": 30, "color": "#ff9830", "label": "Normal"},
            {"value": 50, "color": "#73bf69", "label": "High"}
        ]
    }'::jsonb,
    true
);

-- =====================================================
-- ROW 5: Recent Telemetry Table
-- =====================================================

INSERT INTO custom_widgets (
    id_widget, id_dashboard, name, widget_type,
    position_x, position_y, cols, rows,
    sql_query, data_source, config, is_active
) VALUES (
    gen_random_uuid(),
    v_dashboard_id,
    'Recent Telemetry Data',
    'table',
    0, 14, 12, 4,
    'SELECT 
        sc.metric_code as "Metric",
        sc.latest_value as "Value",
        sc.unit as "Unit",
        s.sensor_code as "Sensor",
        sc.updated_at as "Last Update"
    FROM sensor_channels sc
    JOIN sensors s ON s.id_sensor = sc.id_sensor
    WHERE s.id_sensor IN (
        ''12474050-e81a-4313-9c73-775b0d793890'',
        ''b8bb9540-e160-467d-a4a0-b9fb560b68a7'',
        ''a00f806f-1993-4fe4-8282-0d86ead71290'',
        ''2d2f5339-a89a-49f3-a399-2116023f08f2''
    )
    ORDER BY sc.updated_at DESC',
    'postgresql',
    '{
        "title": "Recent Telemetry Data",
        "display": {
            "tableOptions": {
                "striped": true,
                "hover": true,
                "bordered": false,
                "compact": true,
                "sortable": true,
                "fontSize": 12,
                "columns": [
                    {"field": "Metric", "displayName": "Metric", "align": "left", "visible": true, "type": "text"},
                    {"field": "Value", "displayName": "Value", "align": "right", "visible": true, "type": "number", "decimals": 2},
                    {"field": "Unit", "displayName": "Unit", "align": "center", "visible": true, "type": "text"},
                    {"field": "Sensor", "displayName": "Sensor", "align": "left", "visible": true, "type": "text"},
                    {"field": "Last Update", "displayName": "Last Update", "align": "center", "visible": true, "type": "date", "dateFormat": "HH:mm:ss"}
                ]
            }
        }
    }'::jsonb,
    true
);

RAISE NOTICE 'Dashboard created with ID: %', v_dashboard_id;

END $$;

-- Verify the dashboard was created
SELECT 
    d.id_dashboard,
    d.name,
    d.description,
    COUNT(w.id_widget) as widget_count
FROM custom_dashboards d
LEFT JOIN custom_widgets w ON w.id_dashboard = d.id_dashboard
WHERE d.id_owner = 'c73a0425-34e5-4ed3-a435-eb740f915648'
GROUP BY d.id_dashboard, d.name, d.description;
