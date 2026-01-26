-- ============================================
-- Widget Builder Database Setup
-- Date: 2026-01-26
-- ============================================

-- STEP 1: Drop old dashboard_widgets table (tidak dipakai lagi)
-- Backup dulu jika perlu: CREATE TABLE dashboard_widgets_backup AS SELECT * FROM dashboard_widgets;
DROP TABLE IF EXISTS dashboard_widgets CASCADE;

-- STEP 2: Create new dashboards table (custom dashboards dengan SQL queries)
CREATE TABLE IF NOT EXISTS custom_dashboards (
    id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_config JSONB DEFAULT '{}',
    time_range VARCHAR(20) DEFAULT '6h',
    refresh_interval INTEGER DEFAULT 60,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id_user) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_owner ON custom_dashboards(id_owner);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_created_by ON custom_dashboards(created_by);

-- STEP 3: Create widgets table
CREATE TABLE IF NOT EXISTS custom_widgets (
    id_widget UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dashboard UUID NOT NULL REFERENCES custom_dashboards(id_dashboard) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    
    -- Position in grid layout
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    cols INTEGER DEFAULT 6,
    rows INTEGER DEFAULT 4,
    
    -- SQL Query (SELECT only)
    sql_query TEXT NOT NULL,
    
    -- Complete widget configuration as JSONB
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id_user) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_widgets_dashboard ON custom_widgets(id_dashboard);
CREATE INDEX IF NOT EXISTS idx_custom_widgets_type ON custom_widgets(widget_type);

-- STEP 4: Create widget query templates (reusable SQL snippets)
CREATE TABLE IF NOT EXISTS widget_query_templates (
    id_template UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID REFERENCES owners(id_owner) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sql_template TEXT NOT NULL,
    widget_type VARCHAR(50),
    default_config JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id_user) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_widget_templates_owner ON widget_query_templates(id_owner);

-- STEP 5: Add comments for documentation
COMMENT ON TABLE custom_dashboards IS 'Custom dashboards with SQL-based widgets';
COMMENT ON TABLE custom_widgets IS 'Widgets with custom SQL queries and configurations';
COMMENT ON TABLE widget_query_templates IS 'Reusable SQL query templates for widgets';

COMMENT ON COLUMN custom_widgets.widget_type IS 'line-chart, bar-chart, gauge, pie-chart, value-card, data-table';
COMMENT ON COLUMN custom_widgets.config IS 'JSON config: mapping, series, xAxis, yAxis, thresholds, display';
COMMENT ON COLUMN custom_widgets.sql_query IS 'SELECT query only - validated before execution';

-- STEP 6: Insert system query templates
INSERT INTO widget_query_templates (name, description, sql_template, widget_type, default_config, is_system) VALUES
(
    'Telemetry Time Series',
    'Basic time series query for sensor data',
    'SELECT timestamp, temperature, humidity
FROM telemetry_data t
JOIN nodes n ON t.id_node = n.id_node
WHERE timestamp > NOW() - INTERVAL ''${timeRange}''
ORDER BY timestamp',
    'line-chart',
    '{"mapping": {"xField": "timestamp", "yFields": ["temperature", "humidity"]}}',
    true
),
(
    'Node Status Distribution',
    'Count nodes by connectivity status',
    'SELECT connectivity_status as status, COUNT(*) as count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ''${ownerId}''
GROUP BY connectivity_status',
    'pie-chart',
    '{"mapping": {"labelField": "status", "valueField": "count"}}',
    true
),
(
    'Sensor Latest Values',
    'Get latest value for each sensor',
    'SELECT s.name as sensor_name, 
       sl.value,
       sl.created_at as timestamp
FROM sensor_logs sl
JOIN sensors s ON sl.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ''${ownerId}''
  AND sl.created_at > NOW() - INTERVAL ''1 hour''
ORDER BY sl.created_at DESC
LIMIT 100',
    'data-table',
    '{}',
    true
),
(
    'Alert Events Count',
    'Count alert events by status',
    'SELECT status, COUNT(*) as count
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN nodes n ON ar.id_node = n.id_node
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ''${ownerId}''
  AND ae.triggered_at > NOW() - INTERVAL ''${timeRange}''
GROUP BY status',
    'bar-chart',
    '{"mapping": {"xField": "status", "yFields": ["count"]}}',
    true
);

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify setup:
-- SELECT COUNT(*) FROM custom_dashboards;
-- SELECT COUNT(*) FROM custom_widgets;
-- SELECT COUNT(*) FROM widget_query_templates;
-- \d custom_dashboards
-- \d custom_widgets
