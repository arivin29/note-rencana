-- Migration: Create anomaly_results table for ML anomaly detection
-- Date: 2026-02-27

CREATE TABLE IF NOT EXISTS anomaly_results (
    id_anomaly_result UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sensor reference
    id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
    
    -- Detection timestamp
    detected_at TIMESTAMPTZ NOT NULL,
    
    -- Values
    actual_value DOUBLE PRECISION NOT NULL,
    expected_value DOUBLE PRECISION,
    
    -- Anomaly metrics
    anomaly_score DOUBLE PRECISION NOT NULL,
    anomaly_grade TEXT NOT NULL CHECK (anomaly_grade IN ('mild', 'moderate', 'severe', 'critical')),
    anomaly_type TEXT NOT NULL,
    
    -- OpenSearch detector info
    detector_id TEXT,
    detector_name TEXT,
    opensearch_result JSONB,
    
    -- Link to alert if generated
    id_alert_event UUID REFERENCES alert_events(id_alert_event) ON DELETE SET NULL,
    
    -- Acknowledgment tracking
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    note TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_anomaly_results_channel_time ON anomaly_results(id_sensor_channel, detected_at DESC);
CREATE INDEX idx_anomaly_results_detector_time ON anomaly_results(detector_id, detected_at DESC);
CREATE INDEX idx_anomaly_results_grade ON anomaly_results(anomaly_grade) WHERE anomaly_grade IN ('severe', 'critical');
CREATE INDEX idx_anomaly_results_unack ON anomaly_results(is_acknowledged) WHERE is_acknowledged = FALSE;

-- Comments
COMMENT ON TABLE anomaly_results IS 'Stores ML anomaly detection results from OpenSearch';
COMMENT ON COLUMN anomaly_results.anomaly_score IS 'Score from 0.0 to 1.0, higher = more anomalous';
COMMENT ON COLUMN anomaly_results.anomaly_grade IS 'mild (0.5-0.7), moderate (0.7-0.85), severe (0.85-0.95), critical (>0.95)';
COMMENT ON COLUMN anomaly_results.opensearch_result IS 'Raw JSON result from OpenSearch ML detector';
