# Quick Reference: Common Sensor Formulas

## Standard Signal Types

### 4-20mA (Most Common Industrial)
```javascript
Formula: ((x - 4) / 16) * OUTPUT_RANGE

// Examples:
((x - 4) / 16) * 10      // 0-10 bar
((x - 4) / 16) * 16      // 0-16 bar  
((x - 4) / 16) * 100     // 0-100 m³/h
((x - 4) / 16) * 5       // 0-5 meter
```

**When to use:** Most industrial sensors (Endress+Hauser, Siemens, ABB, Wika)

### 0-5V
```javascript
Formula: (x / 5) * OUTPUT_RANGE

// Examples:
(x / 5) * 10      // 0-10 bar
(x / 5) * 25      // 0-25 bar
(x / 5) * 100     // 0-100 m³/h
```

**When to use:** Voltage output sensors, often cheaper alternatives

### 0-10V
```javascript
Formula: (x / 10) * OUTPUT_RANGE

// Examples:
x                  // 0-10 bar (1:1 mapping)
(x / 10) * 16      // 0-16 bar
(x / 10) * 500     // 0-500 m³/h
```

**When to use:** Higher voltage output, less noise susceptible

### 1-5V
```javascript
Formula: ((x - 1) / 4) * OUTPUT_RANGE

// Examples:
((x - 1) / 4) * 10      // 0-10 bar
((x - 1) / 4) * 100     // 0-100 m³/h
```

**When to use:** Some voltage sensors with offset

---

## Quick Calculation Examples

### Pressure Sensor: 4-20mA → 0-10 bar
| Input (mA) | Calculation | Output (bar) |
|------------|-------------|--------------|
| 4.0 | `((4 - 4) / 16) * 10` | 0.00 |
| 8.0 | `((8 - 4) / 16) * 10` | 2.50 |
| 12.0 | `((12 - 4) / 16) * 10` | 5.00 |
| 16.0 | `((16 - 4) / 16) * 10` | 7.50 |
| 20.0 | `((20 - 4) / 16) * 10` | 10.00 |

### Flow Meter: 4-20mA → 0-100 m³/h
| Input (mA) | Calculation | Output (m³/h) |
|------------|-------------|---------------|
| 4.0 | `((4 - 4) / 16) * 100` | 0.00 |
| 8.0 | `((8 - 4) / 16) * 100` | 25.00 |
| 12.0 | `((12 - 4) / 16) * 100` | 50.00 |
| 16.0 | `((16 - 4) / 16) * 100` | 75.00 |
| 20.0 | `((20 - 4) / 16) * 100` | 100.00 |

### Level Sensor: 0-5V → 0-10 meter
| Input (V) | Calculation | Output (m) |
|-----------|-------------|------------|
| 0.0 | `(0 / 5) * 10` | 0.00 |
| 1.25 | `(1.25 / 5) * 10` | 2.50 |
| 2.5 | `(2.5 / 5) * 10` | 5.00 |
| 3.75 | `(3.75 / 5) * 10` | 7.50 |
| 5.0 | `(5 / 5) * 10` | 10.00 |

---

## Common Sensors by Brand

### Endress+Hauser
- Pressure: 4-20mA, typically 0-10 bar or 0-16 bar
- Flow: 4-20mA, range varies by pipe size
- Level: 4-20mA, ultrasonic or radar

### Siemens
- SITRANS P (Pressure): 4-20mA, 0-16 bar common
- SITRANS F (Flow): 4-20mA
- SITRANS LU (Level): 4-20mA, ultrasonic

### Wika
- Pressure: 4-20mA or 0-10V
- Wide range options: 0-6, 0-10, 0-16, 0-25, 0-40 bar

### ABB
- ProcessMaster (Flow): 4-20mA
- Pressure transmitters: 4-20mA

### Danfoss
- MBS pressure transmitters: 4-20mA
- Common ranges: 0-6 bar, 0-10 bar

---

## Most Common PDAM Sensors

| Rank | Type | Signal | Range | Formula |
|------|------|--------|-------|---------|
| 🥇 1 | Pressure | 4-20mA | 0-10 bar | `((x-4)/16)*10` |
| 🥈 2 | Flow | 4-20mA | 0-100 m³/h | `((x-4)/16)*100` |
| 🥉 3 | Level | 4-20mA | 0-5 m | `((x-4)/16)*5` |
| 4 | Pressure | 4-20mA | 0-16 bar | `((x-4)/16)*16` |
| 5 | Level | 4-20mA | 0-10 m | `((x-4)/16)*10` |

---

## Special Cases

### Temperature with Negative Range
```javascript
// Example: -20°C to +80°C (total range = 100)
((x - 4) / 16) * 100 - 20

// Test:
// x=4mA  → ((4-4)/16)*100-20 = -20°C
// x=12mA → ((12-4)/16)*100-20 = 30°C
// x=20mA → ((20-4)/16)*100-20 = 80°C
```

### Pulse Counter (Volume)
```javascript
// 1 pulse = 1 liter
x

// 1 pulse = 10 liter
x * 10

// 1 pulse = 1 m³
x
```

### Percentage (0-100%)
```javascript
// 4-20mA to 0-100%
((x - 4) / 16) * 100
```

---

## Troubleshooting

### Reading shows 0 or negative
- Check if sensor minimum is correct (4mA for 4-20mA, not 0mA)
- Verify formula has offset: `(x - 4)` not just `x`

### Reading exceeds maximum
- Check if input signal range matches sensor specs
- Verify output range in formula matches sensor datasheet

### Reading fluctuates wildly
- Check sensor wiring (electromagnetic interference)
- Add smoothing/filtering in gateway
- Check sensor power supply stability

---

## Formula Generator (Mental Math)

**For 4-20mA sensors:**
1. Start with: `((x - 4) / 16)`
2. Multiply by your max range: `* MAX_VALUE`

**Examples:**
- 0-10 bar → `((x - 4) / 16) * 10`
- 0-50 m³/h → `((x - 4) / 16) * 50`
- 0-5 meter → `((x - 4) / 16) * 5`

**For 0-5V sensors:**
1. Start with: `(x / 5)`
2. Multiply by your max range: `* MAX_VALUE`

**For 0-10V sensors:**
1. Start with: `(x / 10)`
2. Multiply by your max range: `* MAX_VALUE`

---

## Validation Checklist

Before deploying formula:
- [ ] Check sensor datasheet for signal type (4-20mA, 0-5V, etc)
- [ ] Verify output range (0-10 bar, 0-100 m³/h, etc)
- [ ] Test with minimum input (4mA, 0V) → should give 0
- [ ] Test with maximum input (20mA, 5V) → should give max range
- [ ] Test with mid-point → should give half of max range

---

## SQL Quick Insert Template

```sql
INSERT INTO sensor_types (id_sensor_type, category, default_unit, precision, conversion_formula, description) VALUES
(
  'TYPE-SIGNAL-RANGE',                    -- e.g., pressure-4-20mA-0-10bar
  'Descriptive Name',                     -- e.g., Tekanan 4-20mA 0-10 bar
  'unit',                                 -- e.g., bar, m³/h, m
  2,                                      -- precision (decimal places)
  '((x - 4) / 16) * OUTPUT_RANGE',       -- formula
  'Description and use case'              -- notes
);
```

---

## Need Help?

1. Check sensor datasheet for signal type and range
2. Use formula templates above
3. Test with known input values
4. Verify output makes sense physically
5. If non-standard, use custom formula with Math functions

**Remember:** `x` is always the raw sensor value (mA, V, pulse count, etc)
