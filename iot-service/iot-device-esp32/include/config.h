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
#define RS485_RX_PIN            16      // UART2 RX -> MAX485 RO (B-)
#define RS485_TX_PIN            15      // UART2 TX -> MAX485 DI (A+)
#define RS485_DE_RE_PIN         -1      // Driver Enable (not used - auto-direction)

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

// NE555 Relay Module (GPIO14) - Controlled via MQTT
#define RELAY_NE555_PIN         14      // GPIO14 - NE555 Relay Module (active LOW)

// Digital Input 1: Pump Status Monitor (Changed to GPIO38)
#define IO_DIGITAL_IN_1_PIN     38      // GPIO38 - Digital Input for pump status (HIGH=ON, LOW=OFF)

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
#define MODBUS_SERIAL           Serial2 // Hardware serial for RS485 (UART2)
#define MODBUS_BAUDRATE         9600    // Default baudrate (TUF-2000M: 9600 8N1)
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
// CONFIGURABLE: Can be overridden from SD card config.json
// Default: 30 seconds (adjust based on use case)
// Range: 10-300 seconds (10s for high-frequency, 300s for low-power)
#define TELEMETRY_INTERVAL_MS   30000   // Default sensor reading interval (30 seconds)

// --- Connection State Machine ---
// RETRY_MODE: Quick reconnection attempts
#define RETRY_MODE_MAX_ATTEMPTS         10      // Number of retry attempts before entering offline mode
#define RETRY_MODE_INTERVAL_MS          30000   // Retry interval (30 seconds)
#define RETRY_MODE_DURATION_MS          (RETRY_MODE_MAX_ATTEMPTS * RETRY_MODE_INTERVAL_MS) // ~5 minutes

// OFFLINE_MODE: Long-term offline with periodic modem restarts
#define OFFLINE_MODE_MAX_CYCLES         3       // Number of offline cycles before ESP restart
#define OFFLINE_MODE_WAIT_MS            600000  // Wait time before modem restart (10 minutes)
#define OFFLINE_MODE_RETRY_PER_CYCLE    10      // Retry attempts per offline cycle
#define OFFLINE_MODE_TOTAL_DURATION_MS  (OFFLINE_MODE_MAX_CYCLES * (OFFLINE_MODE_WAIT_MS + (OFFLINE_MODE_RETRY_PER_CYCLE * RETRY_MODE_INTERVAL_MS))) // ~40 minutes

// ESP_RESTART: Triggered after maximum offline cycles
#define ESP_RESTART_AFTER_OFFLINE       true    // Enable ESP restart after max offline cycles

// --- SD Card Configuration ---
#define SD_CARD_REQUIRED                false   // Device works without SD card (graceful degradation)
#define SD_CARD_MAX_USAGE_PERCENT       80      // Maximum SD card usage before cleanup
#define SD_CARD_AUTO_CLEANUP            true    // Automatic cleanup of old data
#define SD_CARD_DELETE_AFTER_SEND       true    // Delete data after successful MQTT send
#define SD_CARD_DATA_RETENTION_DAYS     7       // Keep data for 7 days max
#define SD_CARD_CHECK_INTERVAL_MS       300000  // Check SD status every 5 minutes

// SD Card Folder Structure
#define SD_DATA_FOLDER                  "/data"     // Telemetry data folder
#define SD_LOGS_FOLDER                  "/logs"     // System logs folder
#define SD_SYSTEM_FOLDER                "/system"   // System state & counters folder
#define SD_CONFIG_FILE                  "/config.json" // Configuration file

// --- Data Sync Configuration ---
// SYNC STRATEGY: Send ONE file at a time (NEVER batch/borongan)
// Why? To avoid network flooding and ensure reliable delivery
#define SYNC_ENABLED                    true    // Enable data sync from SD card
#define SYNC_RATE_LIMIT_MS              10000   // Wait 10 seconds between each message (ONE by ONE)
#define SYNC_MAX_BURST                  10      // Max consecutive sends before pause
#define SYNC_PAUSE_AFTER_BURST_MS       30000   // Pause 30s after 10 messages (prevent overload)
#define SYNC_PRIORITY_OLDEST_FIRST      true    // Send oldest data first (FIFO)

// Sync behavior:
// - Send 1 file per cycle (10s interval)
// - After 10 files sent → Pause 30s
// - Resume sync after pause
// - Continue until all files sent or connection lost

// --- Data Buffering Strategy ---
// SIMPLIFIED: Use SD Card only (no RAM buffer)
// Advantages: Simpler code, persistent storage, sufficient for 30s interval
// Trade-off: Slightly slower write (~20ms vs 1ms RAM), but acceptable
#define USE_RAM_BUFFER                  false   // Disabled - use SD card directly
#define DATA_BUFFER_SIZE                0       // Not used (RAM buffer disabled)

// SD card write performance is sufficient for telemetry interval (30s)
// Modern SD cards support 10,000+ write cycles (years of operation)

// --- RS485 Device Monitoring ---
#define RS485_SCAN_INTERVAL_MS  120000  // Scan RS485 devices every 2 minutes (120 seconds)

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
