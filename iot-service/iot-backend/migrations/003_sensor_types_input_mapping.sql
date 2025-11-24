-- Migration: Add Input Signal Mapping columns to sensor_types
-- Date: 2025-11-23
-- Purpose: Support automatic conversion formula generation for various sensor signals

-- Step 1: Add new columns
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS input_signal_type VARCHAR(50);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS input_min_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS input_max_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS output_min_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS output_max_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS output_unit VARCHAR(50);
ALTER TABLE sensor_types ADD COLUMN IF NOT EXISTS custom_formula TEXT;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN sensor_types.input_signal_type IS 'Type of sensor output signal: 4-20mA, 0-5V, 0-10V, 1-5V, pulse, digital';
COMMENT ON COLUMN sensor_types.input_min_value IS 'Minimum value of input signal (e.g., 4 for 4-20mA)';
COMMENT ON COLUMN sensor_types.input_max_value IS 'Maximum value of input signal (e.g., 20 for 4-20mA)';
COMMENT ON COLUMN sensor_types.output_min_value IS 'Minimum physical measurement value (e.g., 0 bar)';
COMMENT ON COLUMN sensor_types.output_max_value IS 'Maximum physical measurement value (e.g., 10 bar)';
COMMENT ON COLUMN sensor_types.output_unit IS 'Physical measurement unit (bar, psi, L/s, m³/h, etc)';
COMMENT ON COLUMN sensor_types.custom_formula IS 'Optional custom formula override (if auto-generated formula is not suitable)';

-- Step 3: Create index for common queries
CREATE INDEX IF NOT EXISTS idx_sensor_types_category ON sensor_types(category);
CREATE INDEX IF NOT EXISTS idx_sensor_types_signal_type ON sensor_types(input_signal_type);

COMMIT;
