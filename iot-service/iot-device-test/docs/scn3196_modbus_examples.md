# SCN3196Y / SCN Series – Modbus RTU Quick Start

These notes target the common single‑phase SCN3196Y/SCN series power meters that ship with Modbus RTU @ 9600 bps, 8 data bits, no parity, 1 stop bit (8N1). The default slave ID is `1`, but it can be changed over Modbus if the model allows it.

## 1. RS‑485 wiring

```
      ESP32 + MAX485               Power Meter (RS-485)
   ┌──────────────────┐          ┌─────────────────────┐
   │        3V3 ──────┴─ Vcc     │                     │
   │ GND ─────────────── GND ────┴─ GND (RS-485)       │
   │ GPIOx (DE) ──────── DE                       A ───┼─── A (D+)
   │ GPIOy (RE) ──────── /RE                      B ───┼─── B (D-)
   │ GPIO16 (RX2) ◀───── RO                            │
   │ GPIO17 (TX2) ────── DI                            │
   └──────────────────┘          └─────────────────────┘
```

- **A → A**, **B → B**, **GND → GND**. Tie DE and /RE together for half‑duplex control.
- Only L (phase) and N need to be powered for measurement; the CT (S1/S2) can stay open (current will read zero).
- Keep the bus short or use 120 Ω termination at both ends plus bias resistors if the manufacturer recommends it.
- The KhursLabs ESP32‑S3 IoT Acquisition RS485+4G board shown above routes UART2 to the onboard RS485 transceiver: `RX=GPIO16`, `TX=GPIO15`. The converter uses automatic direction control, so no extra DE/RE GPIO is necessary (define `RS485_DE_RE_PIN -1`).

## 2. Register summary

| Parameter              | Address | Words | Type     | Scale  |
|------------------------|---------|-------|----------|--------|
| Voltage (V)            | 0x0000  | 1     | uint16   | ÷10    |
| Current (A)            | 0x0001  | 1     | uint16   | ÷100   |
| Active Power (W)       | 0x0002  | 1     | uint16   | ÷10    |
| Reactive Power (var)   | 0x0003  | 1     | uint16   | ÷10    |
| Apparent Power (VA)    | 0x0004  | 1     | uint16   | ÷10    |
| Power Factor           | 0x0005  | 1     | uint16   | ÷100   |
| Frequency (Hz)         | 0x0006  | 1     | uint16   | ÷10    |
| Active Energy (kWh)    | 0x0007  | 2     | uint32   | ÷10    |
| Reactive Energy (kvarh)| 0x0009  | 2     | uint32   | ÷10\* |
| Import Energy          | 0x000B  | 2     | uint32   | ÷10    |
| Export Energy          | 0x000D  | 2     | uint32   | ÷10    |

\*Some datasheets scale kvarh by ÷100; confirm by comparing to the LCD reading.

All data are exposed as Input or Holding Registers and can be read without passwords.

## 3. Scanning slave IDs (1‑10)

If you have multiple meters on the bus or you are unsure about the configured slave ID, start by probing every ID in the allowed range. The easiest way is to attempt a simple read (for example, voltage at `0x0000`) and treat a valid Modbus reply as “device found”.

**Why scan?**

- Field technicians frequently change the slave ID during installation.
- Some SCN clones ship with random IDs from the factory.

You can scan IDs 1…10 on any platform by issuing a read and catching timeouts. The Arduino sample below includes an implementation via `scanForMeter(1, 10)`, and the same logic can be replicated with Python or Node.js by wrapping their existing `read_input_registers` calls inside a loop.

## 4. Arduino / ESP32 example (MAX485 or auto‑direction board)

```cpp
#include <ModbusMaster.h>

// KhursLabs ESP32-S3 board: RS485 RX=16, TX=15, auto direction (no DE/RE pin).
static const int RS485_RX_PIN = 16;
static const int RS485_TX_PIN = 15;
static const uint8_t DEFAULT_ID = 1;
static const uint8_t SCAN_START_ID = 1;
static const uint8_t SCAN_END_ID = 10;

HardwareSerial &rs485 = Serial2;
ModbusMaster node;

struct MeterData {
  float voltage;
  float current;
  float activePower;
  float reactivePower;
  float apparentPower;
  float powerFactor;
  float frequency;
  float activeEnergy;
  float reactiveEnergy;
  float importEnergy;
  float exportEnergy;
};

int8_t scanForMeter(uint8_t fromId, uint8_t toId) {
  for (uint8_t id = fromId; id <= toId; ++id) {
    node.begin(id, rs485);
    uint8_t result = node.readInputRegisters(0x0000, 1);
    if (result == node.ku8MBSuccess) {
      Serial.printf("Meter detected @ slave ID %u\n", id);
      return static_cast<int8_t>(id);
    }
    Serial.printf("ID %u did not respond (err 0x%02X)\n", id, result);
    delay(100);
  }
  Serial.println("No meter detected in scan range");
  return -1;
}

uint32_t toUint32(uint16_t hi, uint16_t lo) {
  return (static_cast<uint32_t>(hi) << 16) | lo;
}

bool readMeter(MeterData &out) {
  // Read 15 registers (0x0000..0x000E). Adjust if your meter restricts block length.
  const uint16_t startReg = 0x0000;
  const uint8_t count = 15;
  uint8_t result = node.readInputRegisters(startReg, count);
  if (result != node.ku8MBSuccess) {
    Serial.printf("Modbus error: 0x%02X\n", result);
    return false;
  }

  out.voltage       = node.getResponseBuffer(0) / 10.0f;
  out.current       = node.getResponseBuffer(1) / 100.0f;
  out.activePower   = node.getResponseBuffer(2) / 10.0f;
  out.reactivePower = node.getResponseBuffer(3) / 10.0f;
  out.apparentPower = node.getResponseBuffer(4) / 10.0f;
  out.powerFactor   = node.getResponseBuffer(5) / 100.0f;
  out.frequency     = node.getResponseBuffer(6) / 10.0f;

  uint32_t kwh = toUint32(node.getResponseBuffer(7), node.getResponseBuffer(8));
  uint32_t kvarh = toUint32(node.getResponseBuffer(9), node.getResponseBuffer(10));
  uint32_t imp = toUint32(node.getResponseBuffer(11), node.getResponseBuffer(12));
  uint32_t exp = toUint32(node.getResponseBuffer(13), node.getResponseBuffer(14));

  out.activeEnergy   = kwh / 10.0f;
  out.reactiveEnergy = kvarh / 10.0f;
  out.importEnergy   = imp / 10.0f;
  out.exportEnergy   = exp / 10.0f;
  return true;
}

bool changeSlaveId(uint8_t currentId, uint8_t newId) {
  // Many SCN meters use Holding Register 0x0012 for slave ID; confirm in your manual.
  node.begin(currentId, rs485);
  uint8_t result = node.writeSingleRegister(0x0012, newId);
  if (result == node.ku8MBSuccess) {
    Serial.printf("Slave ID changed to %u\n", newId);
    node.begin(newId, rs485);
    return true;
  }
  Serial.printf("Failed to change ID: 0x%02X\n", result);
  return false;
}

void setup() {
  Serial.begin(115200);
  rs485.begin(9600, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);
  node.begin(DEFAULT_ID, rs485);

  int8_t detected = scanForMeter(SCAN_START_ID, SCAN_END_ID);
  if (detected > 0) {
    node.begin(static_cast<uint8_t>(detected), rs485);
  } else {
    Serial.printf("Falling back to default ID %u\n", DEFAULT_ID);
  }
}

void loop() {
  MeterData data;
  if (readMeter(data)) {
    Serial.printf("V=%.1f V | I=%.2f A | P=%.1f W | PF=%.2f | f=%.1f Hz | kWh=%.1f\n",
                  data.voltage, data.current, data.activePower,
                  data.powerFactor, data.frequency, data.activeEnergy);
  } else {
    Serial.println("Read failed (timeout/CRC/ID?)");
  }
  delay(2000);
}
```

**Notes**

- `ModbusMaster` already handles CRC and timeouts; the error codes differentiate CRC errors (`0xE4`), timeouts (`0xE2`), or invalid IDs.
- Boards such as the KhursLabs ESP32‑S3 include auto‑direction RS485 drivers; if you are using a discrete MAX485, wire DE/RE to a GPIO and restore the `preTransmission`/`postTransmission` callbacks.

## 4. Python (pymodbus) example

```python
#!/usr/bin/env python3
from pymodbus.client import ModbusSerialClient
from pymodbus.exceptions import ModbusIOException

REGISTER_MAP = {
    "voltage":      (0x0000, 1, 10),
    "current":      (0x0001, 1, 100),
    "active_power": (0x0002, 1, 10),
    "reactive_power": (0x0003, 1, 10),
    "apparent_power": (0x0004, 1, 10),
    "power_factor": (0x0005, 1, 100),
    "frequency":    (0x0006, 1, 10),
    "active_energy": (0x0007, 2, 10),
    "reactive_energy": (0x0009, 2, 10),
    "import_energy": (0x000B, 2, 10),
    "export_energy": (0x000D, 2, 10),
}

def merge32(words):
    return (words[0] << 16) | words[1]

def read_registers(client, unit):
    values = {}
    for key, (addr, words, scale) in REGISTER_MAP.items():
        response = client.read_input_registers(addr, words, unit=unit)
        if isinstance(response, ModbusIOException) or response.isError():
            raise RuntimeError(f"Read {key} failed: {response}")
        data = response.registers
        raw = merge32(data) if words == 2 else data[0]
        values[key] = raw / float(scale)
    return values

def change_slave_id(client, current_id, new_id):
    # Confirm the register number in your documentation (0x0012 is common).
    response = client.write_register(0x0012, new_id, unit=current_id)
    if response.isError():
        raise RuntimeError(f"Failed to set ID: {response}")
    print(f"Slave ID changed to {new_id}")

if __name__ == "__main__":
    client = ModbusSerialClient(
        port="/dev/ttyUSB0",
        baudrate=9600,
        stopbits=1,
        bytesize=8,
        parity="N",
        timeout=1,
    )
    if not client.connect():
        raise SystemExit("Unable to open serial port")

    try:
        data = read_registers(client, unit=1)
        print(
            f"{data['voltage']:.1f} V | {data['current']:.2f} A | "
            f"{data['active_power']:.1f} W | PF {data['power_factor']:.2f} | "
            f"{data['frequency']:.1f} Hz | {data['active_energy']:.1f} kWh"
        )
    except Exception as exc:
        print(f"Error: {exc}")
    finally:
        client.close()
```

`pymodbus` raises clear exceptions on CRC failures or timeouts, so catching `ModbusIOException` lets you retry immediately.

## 5. Node.js (jsmodbus) example

```javascript
#!/usr/bin/env node
import ModbusRTU from 'jsmodbus';
import SerialPort from 'serialport';

const registerMap = [
  { label: 'Voltage', addr: 0x0000, words: 1, scale: 10 },
  { label: 'Current', addr: 0x0001, words: 1, scale: 100 },
  { label: 'Active Power', addr: 0x0002, words: 1, scale: 10 },
  { label: 'Power Factor', addr: 0x0005, words: 1, scale: 100 },
  { label: 'Frequency', addr: 0x0006, words: 1, scale: 10 },
  { label: 'Active Energy', addr: 0x0007, words: 2, scale: 10 },
];

const serialPort = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
});

const client = new ModbusRTU.client.RTU(serialPort, 1);

serialPort.on('open', async () => {
  try {
    for (const item of registerMap) {
      const resp = await client.readInputRegisters(item.addr, item.words);
      const buf = resp.response._body.valuesAsArray;
      const raw = item.words === 2 ? (buf[0] << 16) | buf[1] : buf[0];
      const value = raw / item.scale;
      console.log(`${item.label}: ${value}`);
    }
  } catch (err) {
    console.error('Modbus error:', err.message || err);
  } finally {
    serialPort.close();
  }
});

serialPort.on('error', (err) => console.error('Serial error', err));
```

`jsmodbus` throws on CRC/timeouts; wrap each read in `try/await` for retry logic or log to your telemetry pipeline.

## 6. Testing notes

- Each example depends on a live SCN meter or simulator. Run them with the meter powered before uploading or executing; otherwise you will see timeouts.
- Confirm the slave ID on the LCD. If you changed it previously, update the `unit`/`node.begin` arguments.
- When combining two registers, always treat the first register as the high word (Modbus big‑endian).

## 7. FAQ

- **Do I need a password to read data?** No, only for configuration/calibration registers.
- **Can I run these samples on other SCN variants?** Yes, as long as they keep the same register map; update scaling factors if the manual states otherwise.
- **Why am I reading zero current?** The CT inputs must be wired through S1/S2; with them floating, the current register will stay at zero even though voltage/power update.
