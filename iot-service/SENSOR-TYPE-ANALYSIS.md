# Analisa Sensor Type untuk PDAM IoT System

## 1. Kategori Sensor Umum PDAM

### A. **Pressure Sensors (Tekanan)**
**Use Cases:**
- Tekanan air di pipa distribusi
- Tekanan di reservoir/tangki
- Tekanan pompa inlet/outlet
- Differential pressure filter

**Output Types:**
- Analog: 0-5V, 0-10V, 1-5V
- Current: 4-20mA (paling umum di industri)
- Digital: Modbus, RS485

**Unit Measurements:**
- bar (0-10 bar, 0-16 bar, 0-25 bar)
- psi (0-100 psi, 0-150 psi)
- kPa (0-1000 kPa)
- mH2O (meter kolom air)

**Contoh Merek:**
- Endress+Hauser: 0-10 bar, 4-20mA
- Siemens SITRANS P: 0-16 bar, 4-20mA
- Wika: 0-25 bar, 0-10V
- Danfoss: 0-6 bar, 4-20mA

---

### B. **Flow Meters (Debit Air)**
**Use Cases:**
- Total konsumsi air
- Flow rate distribusi
- Leak detection (perbedaan flow in/out)
- Monitoring pompa

**Output Types:**
- Pulse output (L/pulse, m³/pulse)
- Analog: 4-20mA proporsional flow
- Digital: Modbus, M-Bus

**Unit Measurements:**
- L/s (liter per second)
- m³/h (meter kubik per jam)
- GPM (gallon per minute)
- Pulse count → volume

**Contoh Merek:**
- Endress+Hauser Promag: 4-20mA + pulse
- Sensus iPERL: Pulse output
- ABB ProcessMaster: 4-20mA
- Krohne: 0-100 m³/h, 4-20mA

---

### C. **Level Sensors (Ketinggian Air)**
**Use Cases:**
- Level tangki reservoir
- Level sumur/bak penampungan
- Overflow protection

**Output Types:**
- Analog: 0-5V, 0-10V, 4-20mA
- Ultrasonic: Digital/Analog
- Pressure-based (hydrostatic)

**Unit Measurements:**
- meter (m)
- centimeter (cm)
- percentage (%)
- Volume (m³) - calculated

**Contoh Merek:**
- Endress+Hauser Levelflex: 0-10m, 4-20mA
- Siemens Sitrans LU: 0-5m, 4-20mA
- Vega: 0-10m, 4-20mA

---

### D. **Power Meter (Listrik)**
**Use Cases:**
- Konsumsi daya pompa
- Total energy usage
- Power quality monitoring
- Cost calculation

**Output Types:**
- Modbus RTU/TCP
- Analog: 4-20mA (jarang)
- Pulse output (kWh)

**Unit Measurements:**
- kW (kilowatt - daya)
- kWh (kilowatt-hour - energi)
- A (ampere - arus)
- V (voltage - tegangan)
- PF (power factor)

**Contoh Merek:**
- Schneider PM5560: Modbus
- ABB M4M: Pulse + Modbus
- Finder 7E: 4-20mA output

---

### E. **Water Quality Sensors**
**Use Cases:**
- pH monitoring
- Turbidity (kekeruhan)
- Chlorine residual
- TDS (Total Dissolved Solids)

**Output Types:**
- Analog: 4-20mA (paling umum)
- Digital: Modbus

**Unit Measurements:**
- pH: 0-14
- NTU (Nephelometric Turbidity Unit)
- mg/L (chlorine)
- ppm (TDS)

---

## 2. Problem: Mapping Complexity

### Current Situation
Setiap sensor memiliki:
1. **Output Type berbeda**: 0-5V, 4-20mA, 0-10V, pulse
2. **Range berbeda**: 0-10 bar, 0-16 bar, 0-25 bar
3. **Unit berbeda**: bar, psi, kPa, mH2O
4. **Brand-specific calibration**

### Example Complexity
```
Sensor A: Endress+Hauser
- Output: 4-20mA
- Range: 0-10 bar
- 4mA = 0 bar
- 20mA = 10 bar
- Conversion: (x - 4) / 16 * 10

Sensor B: Wika
- Output: 0-5V
- Range: 0-25 bar
- 0V = 0 bar
- 5V = 25 bar
- Conversion: (x / 5) * 25

Sensor C: Siemens
- Output: 4-20mA
- Range: 0-16 bar
- 4mA = 0 bar
- 20mA = 16 bar
- Conversion: (x - 4) / 16 * 16
```

### Manual Approach Problems ❌
- Harus buat sensor type baru untuk setiap kombinasi
- Tidak scalable (ratusan kombinasi)
- Error-prone saat input manual
- Sulit maintenance

---

## 3. Solution: Enhanced Sensor Type with Input Mapping

### Proposed Schema Enhancement

#### Current Schema
```typescript
{
  idSensorType: 'pressure-bar-01',
  category: 'pressure',
  defaultUnit: 'bar',
  precision: 2,
  conversionFormula: '(x - 0.5) * 2.5'  // Manual, hardcoded
}
```

#### Enhanced Schema (RECOMMENDED)
```typescript
{
  idSensorType: 'pressure-bar-01',
  category: 'pressure',
  defaultUnit: 'bar',
  precision: 2,
  
  // NEW: Input Signal Configuration
  inputSignal: {
    type: '4-20mA',              // or '0-5V', '0-10V', 'pulse', etc
    minValue: 4,                 // Input minimum (4mA, 0V, etc)
    maxValue: 20,                // Input maximum (20mA, 5V, etc)
  },
  
  // NEW: Output Range Configuration
  outputRange: {
    minValue: 0,                 // Physical minimum (0 bar)
    maxValue: 10,                // Physical maximum (10 bar)
    unit: 'bar'                  // Physical unit
  },
  
  // AUTO-GENERATED: Conversion Formula
  conversionFormula: '((x - 4) / (20 - 4)) * (10 - 0) + 0',
  
  // OPTIONAL: Advanced formula override
  customFormula: null          // User can override if needed
}
```

---

## 4. Implementation Plan

### Phase 1: Database Migration

#### Add new columns to `sensor_types` table:
```sql
ALTER TABLE sensor_types ADD COLUMN input_signal_type VARCHAR(50);
ALTER TABLE sensor_types ADD COLUMN input_min_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN input_max_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN output_min_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN output_max_value DECIMAL(10, 4);
ALTER TABLE sensor_types ADD COLUMN output_unit VARCHAR(50);
ALTER TABLE sensor_types ADD COLUMN custom_formula TEXT;
```

### Phase 2: Backend DTOs

#### Update `CreateSensorTypeDto`
```typescript
export class CreateSensorTypeDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty()
  precision?: number;

  // NEW: Input Signal
  @ApiProperty({ enum: ['4-20mA', '0-5V', '0-10V', '1-5V', 'pulse', 'digital'] })
  inputSignalType?: string;

  @ApiProperty()
  inputMinValue?: number;

  @ApiProperty()
  inputMaxValue?: number;

  // NEW: Output Range
  @ApiProperty()
  outputMinValue?: number;

  @ApiProperty()
  outputMaxValue?: number;

  @ApiProperty()
  outputUnit?: string;

  // OPTIONAL: Custom formula (overrides auto-generated)
  @ApiProperty()
  customFormula?: string;
}
```

### Phase 3: Auto-Generate Formula

#### Backend Service Method
```typescript
private generateConversionFormula(dto: CreateSensorTypeDto): string {
  if (dto.customFormula) {
    return dto.customFormula; // User override
  }

  if (!dto.inputSignalType || !dto.inputMinValue || !dto.inputMaxValue ||
      !dto.outputMinValue || !dto.outputMaxValue) {
    return null; // No mapping configured
  }

  // Linear interpolation formula
  const inputRange = dto.inputMaxValue - dto.inputMinValue;
  const outputRange = dto.outputMaxValue - dto.outputMinValue;
  
  // Formula: ((x - inputMin) / inputRange) * outputRange + outputMin
  return `((x - ${dto.inputMinValue}) / ${inputRange}) * ${outputRange} + ${dto.outputMinValue}`;
}
```

### Phase 4: Angular UI Enhancement

#### Sensor Type Drawer - Add Input Mapping Section

```html
<!-- NEW SECTION: Input Signal Mapping -->
<div class="card mb-3">
  <div class="card-header">
    <h6 class="mb-0">Input Signal Mapping</h6>
    <small class="text-muted">Configure sensor output to physical measurement conversion</small>
  </div>
  <div class="card-body">
    <div class="row">
      <div class="col-md-4">
        <label>Signal Type</label>
        <select class="form-control" formControlName="inputSignalType">
          <option value="">-- Select --</option>
          <option value="4-20mA">4-20mA (Current)</option>
          <option value="0-5V">0-5V (Voltage)</option>
          <option value="0-10V">0-10V (Voltage)</option>
          <option value="1-5V">1-5V (Voltage)</option>
          <option value="pulse">Pulse</option>
          <option value="digital">Digital</option>
        </select>
      </div>
      <div class="col-md-4">
        <label>Input Min</label>
        <input type="number" class="form-control" formControlName="inputMinValue" 
               placeholder="e.g. 4 for 4mA">
      </div>
      <div class="col-md-4">
        <label>Input Max</label>
        <input type="number" class="form-control" formControlName="inputMaxValue" 
               placeholder="e.g. 20 for 20mA">
      </div>
    </div>

    <div class="row mt-3">
      <div class="col-md-4">
        <label>Output Unit</label>
        <input type="text" class="form-control" formControlName="outputUnit" 
               placeholder="e.g. bar, psi, L/s">
      </div>
      <div class="col-md-4">
        <label>Output Min</label>
        <input type="number" class="form-control" formControlName="outputMinValue" 
               placeholder="e.g. 0 bar">
      </div>
      <div class="col-md-4">
        <label>Output Max</label>
        <input type="number" class="form-control" formControlName="outputMaxValue" 
               placeholder="e.g. 10 bar">
      </div>
    </div>

    <!-- Auto-generated formula preview -->
    <div class="alert alert-info mt-3" *ngIf="getGeneratedFormula()">
      <small><strong>Auto-generated formula:</strong></small><br>
      <code>{{ getGeneratedFormula() }}</code>
    </div>

    <!-- Custom formula override (optional) -->
    <div class="mt-3">
      <label>Custom Formula (Optional Override)</label>
      <textarea class="form-control" formControlName="customFormula" 
                rows="2" placeholder="Leave blank to use auto-generated formula"></textarea>
      <small class="text-muted">
        Advanced: Override auto-generated formula if needed
      </small>
    </div>
  </div>
</div>
```

---

## 5. Benefits of Enhanced Approach

### ✅ Advantages

1. **Easy Configuration**
   - User just inputs signal type and ranges
   - Formula auto-generated matematically
   - No need to manually write conversion formula

2. **Scalable**
   - Support hundreds of sensor combinations
   - Same UI for all sensor types
   - Consistent data model

3. **Less Error-Prone**
   - Mathematical calculation guaranteed correct
   - No typo in manual formula
   - Validated input ranges

4. **Flexible**
   - Still allows custom formula override
   - Support non-linear sensors
   - Handle special cases

5. **Documentation Built-in**
   - Input/output ranges clearly visible
   - Signal type explicitly stated
   - Easy to understand configuration

6. **Quick Setup**
   - Admin can quickly add new sensor variants
   - Copy existing and modify ranges
   - Template library possible

---

## 6. Example Sensor Library

### Pre-configured Templates

```typescript
const SENSOR_TEMPLATES = {
  'pressure-4-20mA-0-10bar': {
    category: 'pressure',
    inputSignalType: '4-20mA',
    inputMinValue: 4,
    inputMaxValue: 20,
    outputMinValue: 0,
    outputMaxValue: 10,
    outputUnit: 'bar',
    precision: 2
  },
  'pressure-4-20mA-0-16bar': {
    category: 'pressure',
    inputSignalType: '4-20mA',
    inputMinValue: 4,
    inputMaxValue: 20,
    outputMinValue: 0,
    outputMaxValue: 16,
    outputUnit: 'bar',
    precision: 2
  },
  'flow-4-20mA-0-100m3h': {
    category: 'flow',
    inputSignalType: '4-20mA',
    inputMinValue: 4,
    inputMaxValue: 20,
    outputMinValue: 0,
    outputMaxValue: 100,
    outputUnit: 'm³/h',
    precision: 2
  },
  'level-4-20mA-0-5m': {
    category: 'level',
    inputSignalType: '4-20mA',
    inputMinValue: 4,
    inputMaxValue: 20,
    outputMinValue: 0,
    outputMaxValue: 5,
    outputUnit: 'm',
    precision: 2
  }
};
```

---

## 7. Comparison

### Without Input Mapping (Current)
```
❌ Admin must:
1. Calculate conversion formula manually
2. Test formula with sample values
3. Create new sensor type for each variant
4. Remember formula syntax

Result: 
- 100 sensor variants = 100 manual formulas
- High chance of error
- Time consuming
```

### With Input Mapping (Proposed)
```
✅ Admin just:
1. Select signal type (dropdown)
2. Enter input range (e.g. 4-20)
3. Enter output range (e.g. 0-10 bar)
4. Save

Result:
- 100 sensor variants = 100 quick configs
- Formula auto-generated correctly
- 5 seconds per sensor type
```

---

## 8. Migration Strategy

### Phase 1: Add new columns (backward compatible)
- Existing sensor types still work
- New sensor types can use enhanced mapping

### Phase 2: Migrate existing formulas
- Analyze existing formulas
- Extract input/output ranges
- Populate new columns

### Phase 3: Update UI
- Add input mapping section to drawer
- Show auto-generated formula preview
- Keep custom formula option

### Phase 4: Create template library
- Pre-configure common sensor types
- "Copy from template" button
- Quick setup for new installations

---

## 9. Recommendation

### **YES - Implement Input Mapping! ✅**

**Reasons:**
1. PDAM akan punya **banyak sensor variants**
2. Signal types terbatas (4-20mA, 0-5V dominant)
3. Linear conversion adalah **95% use case**
4. Saves **massive time** for admin
5. Reduces **configuration errors**
6. Makes system **production-ready** for PDAM

### Implementation Priority:
1. ✅ **HIGH**: Add input mapping to sensor types
2. ✅ **HIGH**: Auto-generate linear formula
3. ✅ **MEDIUM**: UI for input mapping configuration
4. ✅ **LOW**: Template library for common sensors
5. ✅ **LOW**: Import/export sensor configurations

---

## 10. Next Steps

1. **Review this proposal** - Apakah sesuai kebutuhan?
2. **Define signal types** - List lengkap yang perlu didukung
3. **Database migration** - Add new columns
4. **Backend implementation** - Auto formula generator
5. **Angular UI** - Input mapping form
6. **Testing** - Real sensor data validation
7. **Documentation** - User guide untuk admin

---

## Conclusion

**Input mapping adalah MUST-HAVE untuk production PDAM system.**

Tanpa ini, admin akan struggle dengan ratusan sensor variants dan manual formula yang error-prone.

Dengan input mapping:
- ⚡ **Fast setup**: 5 detik per sensor type
- 🎯 **Accurate**: Formula matematically correct
- 📈 **Scalable**: Support ratusan variants
- 🛡️ **Safe**: No manual formula errors
- 📚 **Clear**: Configuration self-documenting

**Ready to implement?** 🚀
