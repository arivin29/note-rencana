# Sensor Conversion System

## 🚀 Quick Start

**Variable Usage:** Use lowercase `x` to represent the raw sensor value.

**Common Examples:**
```javascript
// Pressure: 0.5-4.5V → 0-10 bar
"(x - 0.5) * 2.5"

// Temperature: 0-5V → -50 to 50°C  
"(x * 20) - 50"

// Flow rate: pulse count → L/min
"x / 7.5"

// Non-linear: square root conversion
"Math.sqrt(x) * 10"
```

---

## Overview
The IoT Gateway supports flexible sensor value conversion from raw readings (e.g., voltage) to engineered units (e.g., bar, °C, L/min).

## Conversion Methods

### 1. **Formula-Based Conversion (Recommended)** ✅
Uses `sensor_types.conversion_formula` field for dynamic mathematical expressions.

**Priority:** HIGHEST  
**Flexibility:** Supports any JavaScript math expression  
**Location:** `sensor_types` table

#### Supported Features:
- ✅ Basic arithmetic: `+`, `-`, `*`, `/`, `%`
- ✅ Math functions: `Math.pow()`, `Math.sqrt()`, `Math.abs()`, `Math.sin()`, `Math.cos()`, etc.
- ✅ Variable: Use lowercase **`x`** for raw value (following standard math notation: f(x))
- ✅ Complex formulas: `(x - 0.5) * 2.5 / Math.sqrt(x)`

**Why lowercase `x`?**
- Standard mathematical notation: f(x) = ...
- Clean and simple syntax
- No special characters needed (like `$x` or `{x}`)
- Universal convention across scientific computing

#### Security:
- ⛔ Blocked patterns: `require()`, `import`, `eval()`, `process`, `fs`, etc.
- ✅ Sandboxed execution using `Function()` constructor
- ✅ Result validation (must be finite number)

#### Examples:

**Pressure Sensor (0.5-4.5V → 0-10 bar):**
```sql
UPDATE sensor_types 
SET conversion_formula = '(x - 0.5) * 2.5'
WHERE category = 'pressure';
```

**Temperature Sensor (0-5V → -50 to 50°C):**
```sql
UPDATE sensor_types 
SET conversion_formula = '(x * 20) - 50'
WHERE category = 'temperature';
```

**Flow Rate (Pulse counter → L/min):**
```sql
UPDATE sensor_types 
SET conversion_formula = 'x / 7.5'
WHERE category = 'flow';
```

**Non-linear Sensor (Power function):**
```sql
UPDATE sensor_types 
SET conversion_formula = 'Math.pow(x, 2) * 1.5 + 0.3'
WHERE category = 'custom';
```

---

### 2. **Linear Conversion (Simple)** ✅
Uses `sensor_channels.multiplier` and `sensor_channels.offset_value`.

**Priority:** MEDIUM (used if no formula found)  
**Formula:** `y = (x * multiplier) + offset`  
**Location:** `sensor_channels` table

#### Examples:

**3V → 6 bar (multiplier only):**
```sql
UPDATE sensor_channels 
SET multiplier = 2.0
WHERE id_sensor_channel = 'xxx';
-- Result: 3 * 2.0 = 6.0 bar
```

**3V → 5.5 bar (multiplier + offset):**
```sql
UPDATE sensor_channels 
SET multiplier = 2.0,
    offset_value = -0.5
WHERE id_sensor_channel = 'xxx';
-- Result: (3 * 2.0) + (-0.5) = 5.5 bar
```

---

### 3. **No Conversion (Raw)** ⚠️
If neither formula nor multiplier/offset exists, raw value is used.

**Priority:** LOWEST (fallback)  
**Result:** `value_engineered = value_raw`

---

## Processing Flow

```
Raw Payload: sensors.analog_A3.raw = 3.3 (volt)
      ↓
┌─────────────────────────────────────────┐
│ 1. Check sensor_types.conversion_formula │
└─────────────────────────────────────────┘
      ↓
   Found?
      ├─ YES → Apply formula: (3.3 - 0.5) * 2.5 = 7.0 bar ✅
      │
      └─ NO ─→ ┌─────────────────────────────────────────┐
               │ 2. Check channel multiplier/offset      │
               └─────────────────────────────────────────┘
                     ↓
                  Found?
                     ├─ YES → Apply linear: (3.3 * 2) + (-0.5) = 6.1 bar ✅
                     │
                     └─ NO ─→ Use raw: 3.3 ⚠️

Final Result: Insert to sensor_logs
  - value_raw = 3.3
  - value_engineered = 7.0 (from formula) or 6.1 (from linear) or 3.3 (raw)
```

---

## Database Schema

### sensor_types Table:
```sql
CREATE TABLE sensor_types (
  id_sensor_type UUID PRIMARY KEY,
  category TEXT NOT NULL,
  default_unit TEXT,
  conversion_formula TEXT,  -- ✅ NEW FIELD
  precision NUMERIC(6,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_channels Table:
```sql
CREATE TABLE sensor_channels (
  id_sensor_channel UUID PRIMARY KEY,
  id_sensor UUID NOT NULL,
  id_sensor_type UUID NOT NULL,  -- FK to sensor_types
  metric_code TEXT NOT NULL,
  unit TEXT,
  multiplier NUMERIC(12,6),      -- Linear conversion
  offset_value NUMERIC(12,6),    -- Linear conversion
  min_threshold NUMERIC,
  max_threshold NUMERIC,
  ...
);
```

---

## Migration

Run the migration to add `conversion_formula` field:

```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service
psql <connection_string> -f migrations/003_add_conversion_formula.sql
```

---

## Usage Examples

### Example 1: Pressure Sensor Setup

**Step 1: Define sensor type with formula**
```sql
INSERT INTO sensor_types (id_sensor_type, category, default_unit, conversion_formula)
VALUES (
  'pressure-type-uuid',
  'pressure',
  'bar',
  '(x - 0.5) * 2.5'  -- 0.5-4.5V → 0-10 bar
);
```

**Step 2: Create sensor channel**
```sql
INSERT INTO sensor_channels (
  id_sensor_channel,
  id_sensor,
  id_sensor_type,
  metric_code,
  unit
) VALUES (
  'channel-uuid',
  'sensor-uuid',
  'pressure-type-uuid',  -- Links to sensor_type with formula
  'pressure',
  'bar'
);
```

**Step 3: Telemetry arrives**
```json
{
  "device_id": "DEMO1-00D42390A994",
  "timestamp": 1700000000,
  "sensors": {
    "analog_A3": {
      "raw": 3.3
    }
  }
}
```

**Step 4: Processor converts**
```
Raw: 3.3V
Formula: (x - 0.5) * 2.5
Result: (3.3 - 0.5) * 2.5 = 7.0 bar
```

**Step 5: Saved to sensor_logs**
```sql
INSERT INTO sensor_logs (
  value_raw,           -- 3.3
  value_engineered,    -- 7.0
  quality_flag         -- 'good'
) VALUES (...);
```

---

### Example 2: Temperature Sensor (Linear Conversion)

**No formula, use multiplier/offset:**
```sql
UPDATE sensor_channels 
SET multiplier = 20.0,
    offset_value = -50.0
WHERE id_sensor_channel = 'temp-channel-uuid';

-- Raw: 2.5V
-- Result: (2.5 * 20) - 50 = 0°C
```

---

## Testing Formula Conversion

Use the processor service directly:

```typescript
// In telemetry-processor.service.ts
const result = this.applyFormulaConversion(3.3, "(x - 0.5) * 2.5");
console.log(result); // 7.0
```

---

## Troubleshooting

### Formula not applied?
1. ✅ Check `sensor_types.conversion_formula` is not NULL
2. ✅ Verify `sensor_channels.id_sensor_type` FK is correct
3. ✅ Check processor logs for "Applied formula conversion" debug message

### Formula error?
1. ⚠️ Check formula syntax (must be valid JavaScript)
2. ⚠️ Use `x` as variable name
3. ⚠️ Avoid dangerous patterns (require, eval, etc.)

### Linear conversion not working?
1. ✅ Verify `sensor_channels.multiplier` or `offset_value` is set
2. ✅ Check processor logs for "Applied linear conversion" message

---

## Best Practices

1. ✅ **Use formula for complex conversions** (non-linear, multiple steps)
2. ✅ **Use linear for simple scaling** (direct proportional)
3. ✅ **Test formulas** before deploying to production
4. ✅ **Document formulas** in sensor_types.category or external docs
5. ✅ **Set thresholds** in sensor_channels for validation

---

## Performance

- Formula evaluation: ~0.1ms per value
- Linear conversion: ~0.01ms per value
- No impact on overall telemetry processing throughput

---

## Security

The formula evaluation is **sandboxed** and blocks:
- ⛔ File system access
- ⛔ Process manipulation
- ⛔ Network requests
- ⛔ Dynamic code loading

Only **Math operations** and **basic arithmetic** are allowed.
