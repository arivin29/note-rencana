# TUF-2000M Ultrasonic Flow Meter - Register Map & Implementation

## 📋 Overview

ESP32-S3 RS485 Modbus RTU reader for TUF-2000M ultrasonic flow meter.
Complete implementation with categorized data output.

---

## 🔧 Hardware Configuration

```cpp
RS485_TX_PIN = 15          // ESP32 TX → MAX485 DI (A+)
RS485_RX_PIN = 16          // ESP32 RX ← MAX485 RO (B-)
RS485_BAUD = 9600          // 8N1 (No parity)
MODBUS_DEVICE_ADDRESS = 1  // TUF-2000M Slave ID
```

### Wiring
```
ESP32-S3          MAX485          TUF-2000M
GPIO15 (TX) ----> DI
GPIO16 (RX) <---- RO
              A+ ------------> RS485+ (A)
              B- ------------> RS485- (B)
```

---

## 📊 Data Categories

### **CATEGORY 1: SENSOR DATA** (Primary Measurements)
Data utama untuk monitoring real-time flow

| Register | Field | Type | Unit | Description |
|----------|-------|------|------|-------------|
| R1 | Flow rate | Float32 | m³/h | Debit aliran saat ini |
| R5 | Flow velocity | Float32 | m/s | Kecepatan aliran |
| R9 | Positive totalizer | Uint32 | m³ | Total volume forward |
| R13 | Negative totalizer | Uint32 | m³ | Total volume reverse |
| R25 | Net totalizer | Uint32 | m³ | Total volume bersih |

**Use case:** Dashboard utama, billing, monitoring konsumsi

---

### **CATEGORY 2: SYSTEM STATUS** (Health & Diagnostics)
Status kesehatan sistem dan kualitas sinyal

| Register | Field | Type | Unit | Description |
|----------|-------|------|------|-------------|
| R72 | Error code | Hex16 | - | Kode error (0x0000 = OK) |
| R92 | Signal quality | Uint16 | % | Kualitas sinyal (0-100%) |
| R93 | Upstream strength | Uint16 | raw | Kekuatan sinyal upstream |
| R94 | Downstream strength | Uint16 | raw | Kekuatan sinyal downstream |
| R103 | Working time | Uint32 | s | Total uptime device |
| R158 | Display window | Uint16 | - | Menu aktif (Mxx) |

**Use case:** Troubleshooting, predictive maintenance, alert system

**Error codes:**
- `0x0000` = No error
- `0x0001` = Sensor error (transducer not installed/faulty)
- `0x0002` = Signal too weak
- `0x0004` = Temperature sensor error

**Signal quality thresholds:**
- `>70%` = Excellent
- `50-70%` = Good
- `30-50%` = Fair (needs attention)
- `<30%` = Poor (check sensor alignment)

---

### **CATEGORY 3: ADDITIONAL INFO** (Optional Analysis)
Data tambahan untuk analisis mendalam

| Register | Field | Type | Unit | Description |
|----------|-------|------|------|-------------|
| R7 | Fluid sound speed | Float32 | m/s | Kecepatan suara di fluid |
| R33 | Temperature T1 | Float32 | °C | Suhu inlet (jika ada sensor) |
| R35 | Temperature T2 | Float32 | °C | Suhu outlet (jika ada sensor) |
| R89 | Temperature diff | Float32 | °C | Selisih T1-T2 |
| R97 | Travel time ratio | Float32 | % | Ratio waktu tempuh (normal: 100±3%) |
| R99 | Reynolds number | Float32 | - | Indikator turbulence |

**Use case:** Advanced analytics, flow pattern analysis, energy metering

**Reynolds number interpretation:**
- `<2300` = Laminar flow
- `2300-4000` = Transitional
- `>4000` = Turbulent flow

---

### **CATEGORY 4: CONFIGURATION** (Device Settings)
Konfigurasi device untuk validasi setup dan troubleshooting

| Register | Field | Type | Unit | Description |
|----------|-------|------|------|-------------|
| R221 | Pipe inner diameter | Float32 | mm | Diameter dalam pipa (calculated) |
| R227 | Transducer spacing | Float32 | mm | Jarak antar transducer |
| R1437 | Flow unit | Uint16 | - | Unit flow rate (0=m³/h, 2=L/h, dll) |
| R1438 | Totalizer unit | Uint16 | - | Unit totalizer (0=m³, 2=L, dll) |
| R1442 | Modbus address | Uint16 | - | Slave ID device |

**Use case:**
- Validasi instalasi fisik (pipe, transducer)
- Verify unit settings (untuk conversion)
- Troubleshoot komunikasi (Modbus address)

**Flow Unit Codes:**
- `0` = m³/h (default)
- `1` = ft³/h
- `2` = L/h
- `3` = gal/h
- `4` = L/s
- `5` = gal/s
- `8` = L/min
- `9` = gal/min

**Totalizer Unit Codes:**
- `0` = m³ (default)
- `1` = ft³
- `2` = L (liters)
- `3` = gal (gallons)

**Note:**
- Pipe outer diameter (R51) dan wall thickness (R53) tidak valid pada device ini
- Inner diameter di-calculate dari M11 (outer) - M12 (wall) x 2
- **R227** adalah transducer spacing (tested: 254.359mm untuk pipa 100mm)
- **R1442** adalah Modbus address (tested: value=1, bukan R1439)
- Registers R1437-R1442 (flow unit, totalizer unit, Modbus address) mungkin tidak tersedia pada semua model TUF-2000M
- Transducer type register belum ditemukan alamat yang valid

---

## 🔑 Important Notes

### Byte Order (CRITICAL!)
TUF-2000M menggunakan **BADC byte order** untuk Float32 values:

```cpp
// Modbus returns: [A][B][C][D]
// ESP32 needs:    [B][A][D][C]

// Example: Temperature 36.625°C
// Raw bytes: 80 6B 42 12
// Swap to:   6B 80 12 42
// Result:    36.625
```

### Data Types
- **Float32**: IEEE 754 single precision (4 bytes / 2 registers)
- **Uint32**: Unsigned 32-bit integer (4 bytes / 2 registers)
- **Uint16**: Unsigned 16-bit integer (2 bytes / 1 register)
- **Hex16**: 16-bit displayed as hex

### Register Addressing
- Manual uses **1-based** addressing
- Modbus protocol uses **0-based** addressing
- Code automatically converts: `modbus_addr = register_number - 1`

---

## 📤 Expected Output Format

```
╔════════════════════════════════════════════════════════╗
║  Snapshot @       5002 ms                            ║
╚════════════════════════════════════════════════════════╝

┌─ SENSOR DATA ──────────────────────────────────────────┐
  [DATA] Flow rate                 =      0.000 m³/h
  [DATA] Flow velocity             =      0.000 m/s
  [DATA] Positive totalizer        =          0 m³
  [DATA] Negative totalizer        =          0 m³
  [DATA] Net totalizer             =          0 m³
└────────────────────────────────────────────────────────┘

┌─ SYSTEM STATUS ────────────────────────────────────────┐
  [DATA] Error code                =     0x0001
  [DATA] Signal quality            =          0 %
  [DATA] Upstream strength         =          0 raw
  [DATA] Downstream strength       =          0 raw
  [DATA] Working time              =       8328 s
  [DATA] Display window            =        168 Mxx
└────────────────────────────────────────────────────────┘

┌─ ADDITIONAL INFO ──────────────────────────────────────┐
  [DATA] Fluid sound speed         =      0.000 m/s
  [DATA] Temperature T1            =     36.565 °C
  [DATA] Temperature T2            =     36.557 °C
  [DATA] Temperature diff          =      4.000 °C
  [DATA] Travel time ratio         =      0.000 %
  [DATA] Reynolds number           =    485.956
└────────────────────────────────────────────────────────┘

┌─ CONFIGURATION ────────────────────────────────────────┐
  [DATA] Pipe inner diameter       =    100.000 mm
  [DATA] Transducer spacing        =    254.359 mm
  [DATA] Flow unit                 =  2 (L/h)
  [DATA] Totalizer unit            =  0 (m³)
  [DATA] Modbus address            =          1
└────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════
```

---

## 🎯 JSON Output Mapping (for Backend)

### Simple Mode (Dashboard)
```json
{
  "sensor": {
    "flow_rate": 0.000,
    "totalizer": 0
  },
  "status": {
    "signal_quality": 0,
    "error_code": "0x0001",
    "error_message": "Sensor not installed"
  }
}
```

### Detailed Mode (Monitoring)
```json
{
  "sensor": {
    "flow_rate": 0.000,
    "flow_velocity": 0.000,
    "positive_totalizer": 0,
    "negative_totalizer": 0,
    "net_totalizer": 0
  },
  "system": {
    "error_code": "0x0001",
    "signal_quality": 0,
    "upstream_strength": 0,
    "downstream_strength": 0,
    "working_time": 8328,
    "display_window": 168
  },
  "additional": {
    "fluid_sound_speed": 0.000,
    "temperature_t1": 36.565,
    "temperature_t2": 36.557,
    "temperature_diff": 4.000,
    "travel_time_ratio": 0.000,
    "reynolds_number": 485.956
  },
  "config": {
    "pipe_inner_diameter": 100.000,
    "transducer_spacing": 254.359,
    "flow_unit": 2,
    "flow_unit_name": "L/h",
    "totalizer_unit": 0,
    "totalizer_unit_name": "m³",
    "modbus_address": 1
  }
}
```

---

## 🔗 References

- **TUF-2000M Manual**: Modbus register table (page 39)
- **Byte Order**: https://partofthething.com/thoughts/reading-a-tuf-2000m-ultrasonic-flow-meter-with-an-arduino-or-esp8266/
- **Modbus RTU**: Function code 0x03 (Read Holding Registers)

---

## 📝 Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| Slave ID | 1 | TUF-2000M Menu M90 |
| Baudrate | 9600 | TUF-2000M Menu M91 |
| Parity | N (None) | TUF-2000M Menu M92 |
| Data bits | 8 | Fixed |
| Stop bits | 1 | Fixed |
| Pipe outer diameter | 108 mm | TUF-2000M Menu M11 |
| Pipe wall thickness | 4 mm | TUF-2000M Menu M12 |
| Pipe inner diameter | 100 mm | Calculated (R221) |

---

**Last Updated:** 2025-11-24
**Firmware Version:** esp32s3-tuf2000m-v1.0
**Tested Device:** TUF-2000M (Modbus RTU 9600 8N1)
