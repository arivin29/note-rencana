-- Migration: Create forecast_results table for ML predictions
-- Date: 2026-02-27

CREATE TABLE IF NOT EXISTS forecast_results (
    id_forecast_result UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sensor reference
    id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
    
    -- Batch info (semua forecast dalam 1 run berbagi batch_id)
    forecast_batch_id TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    
    -- Forecast data
    forecast_time TIMESTAMPTZ NOT NULL,       -- Waktu yang diprediksi
    predicted_value DOUBLE PRECISION NOT NULL, -- Nilai prediksi
    lower_bound DOUBLE PRECISION,              -- Confidence interval bawah
    upper_bound DOUBLE PRECISION,              -- Confidence interval atas
    confidence DOUBLE PRECISION,               -- Confidence level (0.0 - 1.0)
    
    -- Model info
    model_type TEXT,                           -- 'opensearch_rcf', 'arima', etc
    model_metadata JSONB,                      -- Additional model info
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE,           -- True = forecast terbaru untuk slot ini
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_forecast_channel_time ON forecast_results(id_sensor_channel, forecast_time);
CREATE INDEX idx_forecast_batch ON forecast_results(forecast_batch_id);
CREATE INDEX idx_forecast_current ON forecast_results(id_sensor_channel, is_current) WHERE is_current = TRUE;
CREATE INDEX idx_forecast_generated ON forecast_results(generated_at DESC);

-- Unique constraint: hanya 1 current forecast per channel per time slot
CREATE UNIQUE INDEX idx_forecast_unique_current 
    ON forecast_results(id_sensor_channel, forecast_time) 
    WHERE is_current = TRUE;

-- Comments
COMMENT ON TABLE forecast_results IS 'Stores ML forecast predictions for sensor channels';
COMMENT ON COLUMN forecast_results.forecast_batch_id IS 'Groups all forecasts generated in one run (UUID)';
COMMENT ON COLUMN forecast_results.forecast_time IS 'The future timestamp being predicted';
COMMENT ON COLUMN forecast_results.predicted_value IS 'The predicted sensor value for forecast_time';
COMMENT ON COLUMN forecast_results.lower_bound IS 'Lower bound of prediction interval (for anomaly detection)';
COMMENT ON COLUMN forecast_results.upper_bound IS 'Upper bound of prediction interval (for anomaly detection)';
COMMENT ON COLUMN forecast_results.is_current IS 'True if this is the latest forecast for this time slot';

-- Function to mark old forecasts as not current when new batch arrives
CREATE OR REPLACE FUNCTION mark_old_forecasts_not_current()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forecast_results
    SET is_current = FALSE
    WHERE id_sensor_channel = NEW.id_sensor_channel
      AND forecast_time = NEW.forecast_time
      AND id_forecast_result != NEW.id_forecast_result
      AND is_current = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forecast_mark_old
    AFTER INSERT ON forecast_results
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION mark_old_forecasts_not_current();
