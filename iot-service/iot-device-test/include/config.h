#ifndef TEST_CONFIG_H
#define TEST_CONFIG_H

// ============================================================================
// FEATURE FLAGS
// ============================================================================
#define ENABLE_GENERIC_IO       true    // Generic I/O Manager
#define ENABLE_TELEMETRY        true    // Telemetry Manager
#define TELEMETRY_INTERVAL_MS   60000   // 1 minute

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================
#define SERVER_URL              "http://your-server.com/telemetry"  // Change this!
#define DEVICE_ID_PREFIX        "TUF2K"                             // Device ID prefix

// ============================================================================
// GPIO ASSIGNMENT MAP
// ============================================================================
// GPIO usage map replicated from production firmware
struct GpioAssignment {
    const char* label;
    uint8_t gpio;
    const char* function;
    const char* type;
    const char* purpose;
    bool reserved;    // true if already wired/used
};

static const GpioAssignment GPIO_MAP[] = {
    {"GPIO1",  1,  "A2 - 4-20mA",    "Analog Input",  "Pressure/Flow sensor",          true},
    {"GPIO2",  2,  "A3 - 4-20mA",    "Analog Input",  "Pressure/Flow sensor",          true},
    {"GPIO4",  4,  "RS485 DE/RE",    "Digital Output","RS485 direction control",        true},
    {"GPIO5",  5,  "SIM7600 PWRKEY", "Digital Output","LTE power key",                  true},
    {"GPIO6",  6,  "SIM7600 RESET",  "Digital Output","LTE reset",                      true},
    {"GPIO7",  7,  "SIM7600 DTR",    "Digital Output","LTE sleep control",              true},
    {"GPIO8",  8,  "I2C SDA",        "I2C",           "Data line",                      true},
    {"GPIO9",  9,  "I2C SCL",        "I2C",           "Clock line",                     true},
    {"GPIO10", 10, "SD_CS (opt)",    "Digital IO",    "SD card CS (if SPI)",            false},
    {"GPIO14",14, "Pump Status",     "Digital Input", "Monitor pump ON/OFF",            true},
    {"GPIO15",15, "Relay",           "Digital Output","Hard restart",                   true},
    {"GPIO16",16, "RS485 RX",        "UART",          "Modbus receive",                 true},
    {"GPIO17",17, "RS485 TX",        "UART",          "Modbus transmit",                true},
    {"GPIO43",43, "SIM7600 TX",      "UART",          "LTE serial TX",                  true},
    {"GPIO44",44, "SIM7600 RX",      "UART",          "LTE serial RX",                  true},
};

static constexpr size_t GPIO_MAP_SIZE = sizeof(GPIO_MAP) / sizeof(GPIO_MAP[0]);

#endif
