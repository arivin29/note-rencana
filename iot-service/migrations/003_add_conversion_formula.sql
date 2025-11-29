-- Add conversion_formula field to sensor_types table
-- This allows dynamic formulas per sensor type

ALTER TABLE sensor_types 
ADD COLUMN conversion_formula TEXT;

COMMENT ON COLUMN sensor_types.conversion_formula IS 
'JavaScript expression for converting raw sensor value to engineered value. 
Use lowercase "x" as the variable representing the raw value (e.g., voltage reading).
Examples:
  - Linear: "(x - 0.5) * 2.5" converts 0.5-4.5V to 0-10 bar
  - Non-linear: "Math.pow(x, 2) * 1.5" for quadratic conversion
  - Division: "x / 7.5" for pulse counter to L/min
Supported: Basic arithmetic (+,-,*,/,%), Math functions (Math.pow, Math.sqrt, etc.)
Security: Dangerous patterns (require, eval, process, fs) are blocked.';

-- Example formulas for common sensor types:

-- Pressure sensor (voltage to bar)
-- Formula explanation: x = voltage (0.5V-4.5V range), output = bar (0-10 bar)
-- Calculation: (x - 0.5) * 2.5
--   When x = 0.5V → (0.5 - 0.5) * 2.5 = 0 bar
--   When x = 3.3V → (3.3 - 0.5) * 2.5 = 7.0 bar
--   When x = 4.5V → (4.5 - 0.5) * 2.5 = 10 bar
-- INSERT INTO sensor_types (id_sensor_type, category, default_unit, conversion_formula) 
-- VALUES (
--   'pressure-type-uuid',
--   'pressure',
--   'bar',
--   '(x - 0.5) * 2.5'
-- );

-- Temperature sensor (voltage to celsius)
-- INSERT INTO sensor_types (id_sensor_type, category, default_unit, conversion_formula) 
-- VALUES (
--   'temperature-type-uuid',
--   'temperature',
--   '°C',
--   '(x * 10) - 50'  -- 0-5V → -50 to 50°C
-- );

-- Flow rate (pulse count to L/min)
-- INSERT INTO sensor_types (id_sensor_type, category, default_unit, conversion_formula) 
-- VALUES (
--   'flow-type-uuid',
--   'flow',
--   'L/min',
--   'x / 7.5'  -- 7.5 pulses per liter
-- );
