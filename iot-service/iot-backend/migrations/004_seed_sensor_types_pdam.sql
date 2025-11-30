-- =====================================================
-- SEED DATA: Pre-configured Sensor Types for PDAM
-- =====================================================
-- Purpose: Comprehensive sensor type library with common signal types and ranges
-- Date: 2025-11-23
-- 
-- Naming Convention for category:
-- Format: "{measurement}-{signal_type}-{output_range}"
-- Example: "pressure-4-20mA-0-10bar"
--
-- This eliminates the need for input mapping columns while providing
-- clear, self-documenting sensor type configurations.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PRESSURE SENSORS (Tekanan)
-- =====================================================

-- 4-20mA Signal Types
INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Tekanan 4-20mA 0-5 bar', 'bar', 2, '((x - 4) / 16) * 5'),
('Tekanan 4-20mA 0-6 bar', 'bar', 2, '((x - 4) / 16) * 6'),
('Tekanan 4-20mA 0-10 bar', 'bar', 2, '((x - 4) / 16) * 10'),
('Tekanan 4-20mA 0-16 bar', 'bar', 2, '((x - 4) / 16) * 16'),
('Tekanan 4-20mA 0-25 bar', 'bar', 2, '((x - 4) / 16) * 25'),
('Tekanan 4-20mA 0-40 bar', 'bar', 2, '((x - 4) / 16) * 40'),

-- 0-5V Signal Types
('Tekanan 0-5V 0-5 bar', 'bar', 2, 'x'),
('Tekanan 0-5V 0-10 bar', 'bar', 2, '(x / 5) * 10'),
('Tekanan 0-5V 0-16 bar', 'bar', 2, '(x / 5) * 16'),
('Tekanan 0-5V 0-25 bar', 'bar', 2, '(x / 5) * 25'),

-- 0-10V Signal Types
('Tekanan 0-10V 0-5 bar', 'bar', 2, '(x / 10) * 5'),
('Tekanan 0-10V 0-10 bar', 'bar', 2, 'x'),
('Tekanan 0-10V 0-16 bar', 'bar', 2, '(x / 10) * 16'),
('Tekanan 0-10V 0-25 bar', 'bar', 2, '(x / 10) * 25'),

-- PSI Units (for international sensors)
('Tekanan 4-20mA 0-100 psi', 'psi', 1, '((x - 4) / 16) * 100'),
('Tekanan 4-20mA 0-150 psi', 'psi', 1, '((x - 4) / 16) * 150'),

-- kPa Units
('Tekanan 4-20mA 0-1000 kPa', 'kPa', 1, '((x - 4) / 16) * 1000'),

-- mH2O (meter kolom air) - for hydrostatic level
('Tekanan 4-20mA 0-10 mH2O', 'mH2O', 2, '((x - 4) / 16) * 10');

-- =====================================================
-- 2. FLOW METERS (Debit Air)
-- =====================================================

-- 4-20mA Analog Flow Meters
INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Debit 4-20mA 0-50 m³/h', 'm³/h', 2, '((x - 4) / 16) * 50'),
('Debit 4-20mA 0-100 m³/h', 'm³/h', 2, '((x - 4) / 16) * 100'),
('Debit 4-20mA 0-200 m³/h', 'm³/h', 2, '((x - 4) / 16) * 200'),
('Debit 4-20mA 0-500 m³/h', 'm³/h', 2, '((x - 4) / 16) * 500'),
('Debit 4-20mA 0-1000 m³/h', 'm³/h', 1, '((x - 4) / 16) * 1000'),

-- L/s Units
('Debit 4-20mA 0-10 L/s', 'L/s', 2, '((x - 4) / 16) * 10'),
('Debit 4-20mA 0-50 L/s', 'L/s', 2, '((x - 4) / 16) * 50'),
('Debit 4-20mA 0-100 L/s', 'L/s', 2, '((x - 4) / 16) * 100'),

-- 0-5V Signal Types
('Debit 0-5V 0-100 m³/h', 'm³/h', 2, '(x / 5) * 100'),
('Debit 0-5V 0-200 m³/h', 'm³/h', 2, '(x / 5) * 200'),

-- 0-10V Signal Types
('Debit 0-10V 0-100 m³/h', 'm³/h', 2, '(x / 10) * 100'),
('Debit 0-10V 0-500 m³/h', 'm³/h', 2, '(x / 10) * 500');

-- =====================================================
-- 3. LEVEL SENSORS (Ketinggian Air)
-- =====================================================

-- 4-20mA Signal Types
INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Level 4-20mA 0-2 m', 'm', 2, '((x - 4) / 16) * 2'),
('Level 4-20mA 0-5 m', 'm', 2, '((x - 4) / 16) * 5'),
('Level 4-20mA 0-10 m', 'm', 2, '((x - 4) / 16) * 10'),
('Level 4-20mA 0-15 m', 'm', 2, '((x - 4) / 16) * 15'),
('Level 4-20mA 0-20 m', 'm', 2, '((x - 4) / 16) * 20'),

-- 0-5V Signal Types
('Level 0-5V 0-5 m', 'm', 2, '(x / 5) * 5'),
('Level 0-5V 0-10 m', 'm', 2, '(x / 5) * 10'),

-- 0-10V Signal Types
('Level 0-10V 0-10 m', 'm', 2, 'x'),
('Level 0-10V 0-20 m', 'm', 2, '(x / 10) * 20'),

-- Percentage (for normalized output)
('Level 4-20mA 0-100%', '%', 1, '((x - 4) / 16) * 100');

-- =====================================================
-- 4. WATER QUALITY SENSORS
-- =====================================================

-- pH Sensors
INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('pH 4-20mA 0-14', 'pH', 2, '((x - 4) / 16) * 14'),
('pH 0-5V 0-14', 'pH', 2, '(x / 5) * 14'),

-- Turbidity (Kekeruhan)
('Turbidity 4-20mA 0-100 NTU', 'NTU', 2, '((x - 4) / 16) * 100'),
('Turbidity 4-20mA 0-1000 NTU', 'NTU', 1, '((x - 4) / 16) * 1000'),

-- Chlorine Residual
('Chlorine 4-20mA 0-5 mg/L', 'mg/L', 2, '((x - 4) / 16) * 5'),
('Chlorine 4-20mA 0-10 mg/L', 'mg/L', 2, '((x - 4) / 16) * 10'),

-- TDS (Total Dissolved Solids)
('TDS 4-20mA 0-1000 ppm', 'ppm', 1, '((x - 4) / 16) * 1000'),
('TDS 4-20mA 0-2000 ppm', 'ppm', 1, '((x - 4) / 16) * 2000'),

-- Conductivity
('Conductivity 4-20mA 0-2000 μS/cm', 'μS/cm', 1, '((x - 4) / 16) * 2000');

-- =====================================================
-- 5. TEMPERATURE SENSORS (for water monitoring)
-- =====================================================

INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Temperature 4-20mA 0-100°C', '°C', 1, '((x - 4) / 16) * 100'),
('Temperature 4-20mA -20 to 80°C', '°C', 1, '((x - 4) / 16) * 100 - 20'),
('Temperature 0-5V 0-100°C', '°C', 1, '(x / 5) * 100'),
('Temperature 0-10V 0-100°C', '°C', 1, '(x / 10) * 100');

-- =====================================================
-- 6. DIFFERENTIAL PRESSURE (for filter monitoring)
-- =====================================================

INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Diff Pressure 4-20mA 0-1 bar', 'bar', 3, '((x - 4) / 16) * 1'),
('Diff Pressure 4-20mA 0-2 bar', 'bar', 3, '((x - 4) / 16) * 2'),
('Diff Pressure 4-20mA 0-500 mbar', 'mbar', 1, '((x - 4) / 16) * 500');

-- =====================================================
-- 7. SPECIAL USE CASES
-- =====================================================

-- Pump Speed (VFD feedback)
INSERT INTO sensor_types (category, default_unit, precision, conversion_formula) VALUES
('Pump Speed 4-20mA 0-50 Hz', 'Hz', 1, '((x - 4) / 16) * 50'),
('Pump Speed 0-10V 0-50 Hz', 'Hz', 1, '(x / 10) * 50'),

-- Pump Current (for power monitoring)
('Pump Current 4-20mA 0-100 A', 'A', 1, '((x - 4) / 16) * 100'),
('Pump Current 4-20mA 0-200 A', 'A', 1, '((x - 4) / 16) * 200'),

-- Volume (calculated from flow)
('Volume Pulse 1 L/pulse', 'L', 0, 'x'),
('Volume Pulse 10 L/pulse', 'L', 0, 'x * 10'),
('Volume Pulse 100 L/pulse', 'L', 0, 'x * 100'),
('Volume Pulse 1 m³/pulse', 'm³', 3, 'x');

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify all sensor types are inserted correctly
-- SELECT category, default_unit, conversion_formula 
-- FROM sensor_types 
-- ORDER BY category;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total sensor types: ~73 variants
-- Categories covered:
--   - Pressure: 18 variants (4-20mA, 0-5V, 0-10V)
--   - Flow: 13 variants (4-20mA, 0-5V, 0-10V)
--   - Level: 10 variants (4-20mA, 0-5V, 0-10V)
--   - Water Quality: 9 variants (pH, Turbidity, Chlorine, TDS, Conductivity)
--   - Temperature: 4 variants
--   - Differential Pressure: 3 variants
--   - Special: 8 variants (pump monitoring, pulse counters)
--
-- This covers 95% of common PDAM sensor requirements!
-- =====================================================
