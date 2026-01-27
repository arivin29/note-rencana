import { registerAs } from '@nestjs/config';

/**
 * Device Configuration Defaults
 * These values are used when device-specific configs are not stored in database
 * Provides default values for network settings, RS485 behavior, and node advanced settings
 */
export default registerAs('deviceDefaults', () => ({
  // Config metadata
  version: process.env.DEVICE_CONFIG_VERSION || '2.0',
  
  // Network configuration
  network: {
    // LTE connection settings
    lte: {
      retryIntervalMs: parseInt(process.env.DEVICE_LTE_RETRY_INTERVAL_MS, 10) || 14001,
      maxRetriesBeforeReboot: parseInt(process.env.DEVICE_LTE_MAX_RETRIES_BEFORE_REBOOT, 10) || 5,
      rebootCountBeforeOffline: parseInt(process.env.DEVICE_LTE_REBOOT_COUNT_BEFORE_OFFLINE, 10) || 3,
      offlinePauseMinutes: parseInt(process.env.DEVICE_LTE_OFFLINE_PAUSE_MINUTES, 10) || 5,
    },
    
    // Hardware watchdog settings
    watchdog: {
      enabled: process.env.DEVICE_WATCHDOG_ENABLED !== 'false', // Default true
      timeoutMinutes: parseInt(process.env.DEVICE_WATCHDOG_TIMEOUT_MINUTES, 10) || 30,
      pauseDuringOffline: process.env.DEVICE_WATCHDOG_PAUSE_DURING_OFFLINE === 'true', // Default false
    },
    
    // Offline mode behavior
    offlineMode: {
      autoDetectNoSim: process.env.DEVICE_OFFLINE_AUTO_DETECT_NO_SIM !== 'false', // Default true
      autoRecheckSimMinutes: parseInt(process.env.DEVICE_OFFLINE_AUTO_RECHECK_SIM_MINUTES, 10) || 10,
      maxOfflineCyclesBeforeRestart: parseInt(process.env.DEVICE_OFFLINE_MAX_OFFLINE_CYCLES_BEFORE_RESTART, 10) || 6,
    },
  },
  
  // RS485 behavior settings
  rs485Behavior: {
    persistToSd: process.env.DEVICE_RS485_PERSIST_TO_SD !== 'false', // Default true
    readInOfflineMode: process.env.DEVICE_RS485_READ_IN_OFFLINE_MODE !== 'false', // Default true
  },
  
  // Node advanced settings
  nodeAdvanced: {
    rs485ScanIntervalMs: parseInt(process.env.DEVICE_RS485_SCAN_INTERVAL_MS, 10) || 120000,
    syncRateLimitMs: parseInt(process.env.DEVICE_SYNC_RATE_LIMIT_MS, 10) || 10000,
    syncMaxBurst: parseInt(process.env.DEVICE_SYNC_MAX_BURST, 10) || 10,
    syncPauseAfterBurstMs: parseInt(process.env.DEVICE_SYNC_PAUSE_AFTER_BURST_MS, 10) || 30000,
  },
}));
