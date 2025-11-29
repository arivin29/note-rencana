# TROUBLESHOOTING HIRP RM-3D3Y Meter

## Problem: Meter shows "888.8V" and "3328.1Hz" (Test Pattern)

### Root Cause
The meter is displaying **test pattern values** (8888, not real data) because:

1. **NO 220V AC POWER** - Meter terminals L and N not connected to AC mains
2. **Wrong wiring** - Power cables not properly connected
3. **Meter in demo mode** - Some meters have test mode activated

---

## Hardware Checklist

### 1. Power Wiring (CRITICAL!)
```
Meter Terminal → Connection
─────────────────────────────────────────
L (Line)       → 220V AC Live wire (Coklat/Hitam)
N (Neutral)    → 220V AC Neutral wire (Biru)
```

**⚠️ DANGER:** Working with 220V AC is dangerous! 
- Turn off MCB/breaker before wiring
- Use insulated tools
- Double-check connections
- If unsure, call electrician

### 2. RS485 Communication Wiring
```
Meter Terminal → ESP32-S3 Board
─────────────────────────────────────────
A (or A+/D+)   → RS485_TX (Pin 15 via transceiver A)
B (or B-/D-)   → RS485_RX (Pin 16 via transceiver B)
GND            → Common ground (if available)
```

### 3. Verify Meter Display
**When properly powered:**
- LCD should show **real voltage** (e.g., 220V, 230V)
- LCD should show **real frequency** (50Hz or 60Hz)
- LCD should show **real current** (if load connected)

**If LCD shows "888.8" or all "8"s:**
- ❌ Meter has NO POWER
- ❌ Or meter in self-test mode

---

## From Datasheet Analysis

### Communication Settings (HIRP RM-3D series)
- **Protocol:** Modbus-RTU over RS-485
- **Baud Rate:** 1200-9600 bps (default **2400 bps**)
- **Data Format:** 8-N-1 (8 data bits, No parity, 1 stop bit)
- **Slave ID:** Default 1 (configurable 1-247)

### Register Map (ESTIMATED - needs verification with real power)
Based on standard Chinese meter pattern:

| Register | Type   | Unit  | Description           | Scale |
|----------|--------|-------|-----------------------|-------|
| 0x0000   | uint16 | V     | Voltage L1            | ÷10   |
| 0x0001   | uint16 | A     | Current L1            | ÷100  |
| 0x0002   | int16  | W     | Active Power L1       | ÷10   |
| 0x0003   | int16  | var   | Reactive Power L1     | ÷10   |
| 0x0004   | int16  | VA    | Apparent Power L1     | ÷10   |
| 0x0005   | uint16 | -     | Power Factor L1       | ÷100  |
| 0x0006   | uint16 | Hz    | Frequency             | ÷10   |
| 0x0007-08| uint32 | kWh   | Active Energy (32-bit)| ÷100  |

**⚠️ Note:** Register map above is UNVERIFIED because meter shows test pattern!

---

## Test Pattern Analysis

### Current Output (NO POWER state):
```
0x00 = 0x22B8 = 8888 decimal  →  888.8 (÷10)
0x06 = 0x8201 = 33281 decimal →  3328.1 (÷10)
```

These are **MAGIC NUMBERS** used by Chinese meters to indicate:
- 8888 = "All segments on" LCD test pattern
- No real measurement happening

### Expected Output (WITH POWER state):
```
0x00 = 0x0898 = 2200 decimal  →  220.0V (÷10)
0x01 = 0x0064 = 100 decimal   →  1.00A (÷100)
0x06 = 0x01F4 = 500 decimal   →  50.0Hz (÷10)
```

---

## Step-by-Step Troubleshooting

### Step 1: Check Power Connection
1. **Turn OFF** the circuit breaker (MCB)
2. **Connect L terminal** to 220V AC Line (Live)
3. **Connect N terminal** to 220V AC Neutral
4. **Turn ON** the circuit breaker
5. **Check meter LCD** - should show real voltage, not "888.8"

### Step 2: Verify RS485 Communication
Our code already supports auto baud rate detection:
- Tests 9600 bps first
- Falls back to 4800 bps
- Falls back to 2400 bps (factory default)
- Falls back to 1200 bps

### Step 3: If Still Shows "888.8"
Possible causes:
- **MCB is OFF** - Turn it on
- **Wrong terminals** - L and N swapped or disconnected
- **Blown fuse** in meter (rare)
- **Defective meter** - Replace unit

### Step 4: Enable Register Scanner
If meter now shows real values, enable scanner to find correct register map:

```cpp
// In main.cpp
constexpr bool SCANNER_MODE = true;  // Set to TRUE
constexpr bool AUTO_BAUD_SCAN = true;
```

This will scan all registers 0x0000-0x0050 and show non-zero values.

---

## Safety Warnings ⚠️

1. **HIGH VOLTAGE** - 220V AC can be **LETHAL**
2. **Turn OFF power** before touching any wires
3. **Use insulated tools** and rubber gloves
4. **Keep water away** from all electrical components
5. **If unsure, hire a licensed electrician**

---

## Next Steps

Once meter is powered and shows real values:
1. ✅ Baud rate will be auto-detected
2. ✅ Register scanner will find correct addresses
3. ✅ JSON config can be updated with verified map
4. ✅ Real-time monitoring will work correctly

**Current Status:** Meter communication works (9600 bps detected), but meter itself has no AC power.
