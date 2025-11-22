#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// ESP32-S3 IoT Acquisition Board - Hardware Configuration
// ============================================================================

// Board: ESP32-S3 with SIM7600E 4G LTE, RS485, 4-20mA inputs
// Manufacturer: KhursLabs / Similar ESP32-S3 IoT boards

// ============================================================================
// PIN DEFINITIONS
// ============================================================================

// --- RS485 Modbus (Terminal Block KF301) ---
#define RS485_RX_PIN            18      // UART1 RX (was GPIO16)
#define RS485_TX_PIN            17      // UART1 TX (was GPIO17)
#define RS485_DE_RE_PIN         4       // Driver Enable / Receiver Enable (same pin)

// --- Analog Current Inputs 4-20mA (Terminal Block KF350) ---
// Board has built-in 100Ω shunt resistor: 4mA=0.4V, 20mA=2.0V
#define ANALOG_CURRENT_A2_PIN   1       // GPIO1 (ADC1_CH0)
#define ANALOG_CURRENT_A3_PIN   2       // GPIO2 (ADC1_CH1)

// --- I2C Bus (Terminal Block KF350) ---
#define I2C_SDA_PIN             8       // I2C SDA
#define I2C_SCL_PIN             9       // I2C SCL

// --- RTC Module (DS3231 - I2C, Optional) ---
// DS3231 Real-Time Clock with CR2032 battery backup
// I2C Address: 0x68 (fixed)
// If not present, device will use MQTT time sync on boot
#define DS3231_I2C_ADDRESS      0x68    // DS3231 RTC I2C address

// --- ADC 16-bit (ADS1115 - Terminal Block 14 KF350) ---
// 2P ADC 16bit A0 & A1
#define ADS1115_I2C_ADDRESS     0x48    // Default I2C address
#define ADS1115_CHANNEL_A0      0       // AIN0 (A0)
#define ADS1115_CHANNEL_A1      1       // AIN1 (A1)

// --- Digital IO (Terminal Block KF350) ---
// Digital Output 1: Hard Restart Relay
#define RELAY_PIN               15      // GPIO15 - Digital Output for Relay (active LOW)
#define IO_DIGITAL_OUT_1_PIN    15      // Same as relay - for hard restart

// Digital Input 1: Pump Status Monitor
#define IO_DIGITAL_IN_1_PIN     14      // GPIO14 - Digital Input for pump status (HIGH=ON, LOW=OFF)

// --- 4G LTE Module SIM7600E (Internal) ---
#define SIM7600_TX_PIN          6       // TX3 on board (ESP32 GPIO6 -> SIM7600 RX)
#define SIM7600_RX_PIN          7       // RX3 on board (ESP32 GPIO7 -> SIM7600 TX)
#define SIM7600_PWRKEY_PIN      21      // PKEY on board (GPIO21)
#define SIM7600_RESET_PIN       47      // RST on board (GPIO47)
#define SIM7600_DTR_PIN         -1      // DTR pin (not used, set to -1)

// --- SD Card (Internal MicroSD slot) ---
// Uses SPI interface
#define SD_CS_PIN               10      // Chip Select (SS)
#define SD_MOSI_PIN             11      // MOSI (Master Out Slave In)
#define SD_SCK_PIN              12      // SCK (Serial Clock)
#define SD_MISO_PIN             13      // MISO (Master In Slave Out)

// --- Built-in Components ---
// LED_BUILTIN already defined by board variant, don't redefine
// #define LED_BUILTIN             48      // Built-in LED (if available)

// ============================================================================
// HARDWARE CONSTANTS
// ============================================================================

// --- ADC Configuration ---
#define ADC_RESOLUTION          12      // 12-bit ADC (0-4095)
#define ADC_VREF                3.3     // Reference voltage
#define ADC_MAX_VALUE           4095    // 2^12 - 1

// --- 4-20mA Sensor Configuration ---
#define CURRENT_MIN_MA          4.0     // Minimum current (mA)
#define CURRENT_MAX_MA          20.0    // Maximum current (mA)
#define VOLTAGE_MIN             0.4     // Voltage at 4mA (with 100Ω shunt)
#define VOLTAGE_MAX             2.0     // Voltage at 20mA (with 100Ω shunt)

// --- Pressure Sensor (4-20mA) ---
#define PRESSURE_MIN_BAR        0.0     // Minimum pressure (bar) - ADJUST to your sensor
#define PRESSURE_MAX_BAR        10.0    // Maximum pressure (bar) - ADJUST to your sensor

// --- RS485 Modbus Configuration ---
#define MODBUS_SERIAL           Serial1 // Hardware serial for RS485 (UART1)
#define MODBUS_BAUDRATE         9600    // Default baudrate (adjust for TUF2000M)
#define MODBUS_TIMEOUT_MS       1000    // Modbus response timeout

// --- INA219 Configuration ---
#define INA219_I2C_ADDRESS      0x40    // Default I2C address
#define BATTERY_MIN_VOLTAGE     10.5    // Minimum battery voltage (V)
#define BATTERY_MAX_VOLTAGE     12.6    // Maximum battery voltage (V) - for 12V lead-acid

// ============================================================================
// MQTT CONFIGURATION
// ============================================================================

#define MQTT_BROKER             "109.105.194.174"
#define MQTT_PORT               8366
#define MQTT_TOPIC              "sensor"
#define MQTT_QOS                1       // QoS level 1 (at least once)
#define MQTT_KEEP_ALIVE         60      // Keep alive interval (seconds)
#define MQTT_RECONNECT_DELAY    5000    // Reconnect delay (ms)

// ============================================================================
// 4G LTE CONFIGURATION
// ============================================================================

// APN settings - adjust for your carrier
#define APN_NAME                "internet"      // Telkomsel: "internet", XL: "www.xlgprs.net"
#define APN_USER                ""              // Usually empty
#define APN_PASS                ""              // Usually empty

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

// --- Telemetry ---
#define TELEMETRY_INTERVAL_MS   30000   // Send data every 30 seconds
#define MAX_OFFLINE_RECORDS     1000    // Max records to store when offline

// --- Watchdog ---
#define WATCHDOG_TIMEOUT_MS     300000  // 5 minutes - restart if no MQTT connection
#define HARD_RESTART_TIMEOUT_MS 600000  // 10 minutes - hard restart via relay

// --- Device Identification ---
// IMPORTANT: Only set OWNER_CODE per project/customer
// HARDWARE_ID will be auto-generated from ESP32 MAC address (permanent & unique)
#define OWNER_CODE              "DEMO1"         // 5-character owner code (from database)

// HARDWARE_ID is auto-generated at runtime from MAC address
// No need to set manually - each ESP32 will have unique ID automatically!
// Example result: "DEMO1-A4CF12EF5D8C"
//
// Note: DEVICE_ID is now a String variable, not a macro
// See getDeviceID() function in main.cpp

// ============================================================================
// MODBUS DEVICE ADDRESSES
// ============================================================================

// TUF2000M Flow Meter
#define TUF2000M_SLAVE_ID       1       // Modbus slave address (default 1, check device)
#define TUF2000M_BAUDRATE       9600    // Check device manual

// VSD/VFD Inverter (reserved for future)
#define VFD_SLAVE_ID            2       // Modbus slave address
#define VFD_BAUDRATE            9600    // Check device manual

// ============================================================================
// DEBUG FLAGS
// ============================================================================

#define DEBUG_SERIAL            Serial  // Serial for debug output
#define DEBUG_BAUDRATE          115200  // Debug serial baud rate

// Enable/disable debug output
#define DEBUG_MQTT              1       // MQTT debug
#define DEBUG_MODBUS            1       // Modbus debug
#define DEBUG_SENSORS           1       // Sensor reading debug
#define DEBUG_LTE               1       // 4G LTE debug
#define DEBUG_SD                1       // SD card debug
#define DEBUG_TIME              1       // Time sync debug

// ============================================================================
// FEATURE FLAGS
// ============================================================================

#define ENABLE_SD_CARD          1       // Enable SD card logging
#define ENABLE_OTA              0       // Enable OTA updates (future feature)
#define ENABLE_WATCHDOG         1       // Enable watchdog timer
#define ENABLE_HARD_RESTART     1       // Enable hard restart via relay

#endif // CONFIG_H
