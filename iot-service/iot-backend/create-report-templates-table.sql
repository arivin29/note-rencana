-- Create report_templates table for storing user-saved report configurations
-- Run this migration in PostgreSQL

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    id_user UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_report_templates_owner ON report_templates(id_owner);
CREATE INDEX IF NOT EXISTS idx_report_templates_user ON report_templates(id_user);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);

-- Add comment for documentation
COMMENT ON TABLE report_templates IS 'User-saved report configurations for reusable reports';
COMMENT ON COLUMN report_templates.config IS 'JSONB containing: projectId, nodeIds, sensorChannelIds, rangeType, aggregation';

-- Example config structure:
-- {
--   "projectId": "uuid",
--   "nodeIds": ["uuid1", "uuid2"],
--   "sensorChannelIds": ["uuid1", "uuid2"],
--   "rangeType": "1d" | "1w" | "1M" | "custom",
--   "aggregation": "raw" | "1m" | "10m" | "1h" | "1d"
-- }
