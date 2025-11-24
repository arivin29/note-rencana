-- Create iot_logs table with relations to nodes
CREATE TABLE IF NOT EXISTS iot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255),
    label VARCHAR(50) NOT NULL DEFAULT 'LOG',
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add check constraint for label enum
ALTER TABLE iot_logs 
ADD CONSTRAINT chk_iot_logs_label 
CHECK (label IN (
    'TELEMETRY', 
    'EVENT', 
    'PAIRING', 
    'ERROR', 
    'WARNING', 
    'COMMAND', 
    'RESPONSE', 
    'DEBUG', 
    'INFO', 
    'LOG'
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_iot_logs_device_id ON iot_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_logs_label ON iot_logs(label);
CREATE INDEX IF NOT EXISTS idx_iot_logs_processed ON iot_logs(processed);
CREATE INDEX IF NOT EXISTS idx_iot_logs_timestamp ON iot_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_iot_logs_created_at ON iot_logs(created_at);

-- Add foreign key to nodes table (device_id -> nodes.code)
-- This allows us to get owner and project information through node relations
ALTER TABLE iot_logs
ADD CONSTRAINT fk_iot_logs_node
FOREIGN KEY (device_id)
REFERENCES nodes(code)
ON DELETE SET NULL;

-- Add index for the foreign key
CREATE INDEX IF NOT EXISTS idx_iot_logs_node_fk ON iot_logs(device_id);

-- Add comment to table
COMMENT ON TABLE iot_logs IS 'IoT device logs from gateway, linked to nodes for owner/project context';
COMMENT ON COLUMN iot_logs.device_id IS 'Node code (references nodes.code)';
COMMENT ON COLUMN iot_logs.label IS 'Log category: TELEMETRY, EVENT, PAIRING, ERROR, WARNING, COMMAND, RESPONSE, DEBUG, INFO, LOG';
COMMENT ON COLUMN iot_logs.payload IS 'Raw log payload in JSON format';
COMMENT ON COLUMN iot_logs.processed IS 'Flag indicating if log has been processed';
COMMENT ON COLUMN iot_logs.notes IS 'Optional processing notes';
COMMENT ON COLUMN iot_logs.timestamp IS 'Log timestamp from device';
COMMENT ON COLUMN iot_logs.created_at IS 'Record creation timestamp in database';
