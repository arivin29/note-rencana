# Stream Config Analysis & Gap Assessment

## Target JSON Structure (Device Config v2.0)

```json
{
  "device_id": "DEMO1-A4CF12EF5D8C",
  "config_version": "2.0",
  "updated_at": "2025-12-07T15:30:00Z",
  
  "network": {
    "lte": { ... },
    "watchdog": { ... },
    "offline_mode": { ... }
  },
  
  "rs485": {
    "persist_to_sd": true,
    "read_in_offline_mode": true,
    "devices": [ ... ]
  },
  
  "node": {
    "telemetry_interval_ms": 30000,
    "rs485_scan_interval_ms": 120000,
    "sync_rate_limit_ms": 10000,
    "sync_max_burst": 10,
    "sync_pause_after_burst_ms": 30000
  }
}
```

---

## Database/DTO Coverage Assessment

### ✅ **SUDAH ADA DI DATABASE**

#### 1. **RS485 Configuration** 
**Source:** `sensor_catalogs.default_channels_json`
- ✅ `modbus_address`
- ✅ `device_type`
- ✅ `baud_rate`
- ✅ `description`
- ✅ `version`
- ✅ `registers[]` (reg, type, label, unit, words, swap, category)

**Current Implementation:**
```typescript
// mqtt.service.ts: getRS485ConfigFromDatabase()
// Sudah ambil dari sensor_catalogs dan sensors
```

#### 2. **Node Telemetry Interval**
**Source:** `nodes.telemetry_interval_sec`
- ✅ `telemetry_interval_sec` (dalam detik)
- ❌ Perlu convert ke milliseconds untuk `telemetry_interval_ms`

**Entity:** `Node.telemetryIntervalSec: number`

---

### ❌ **BELUM ADA DI DATABASE**

#### 1. **Meta Information**
- ❌ `config_version` → No table/column
- ❌ `updated_at` (for config, not node) → No tracking

#### 2. **Network Configuration** (COMPLETELY MISSING)
```json
"network": {
  "lte": {
    "retry_interval_ms": 15000,
    "max_retries_before_reboot": 5,
    "reboot_count_before_offline": 3,
    "offline_pause_minutes": 5
  },
  "watchdog": {
    "enabled": true,
    "timeout_minutes": 30,
    "pause_during_offline": false
  },
  "offline_mode": {
    "auto_detect_no_sim": true,
    "auto_recheck_sim_minutes": 10,
    "max_offline_cycles_before_restart": 6
  }
}
```
**Status:** ❌ Tidak ada di `nodes`, `node_models`, `node_profiles`, atau tabel lain

#### 3. **RS485 Behavior Settings**
```json
"rs485": {
  "persist_to_sd": true,
  "read_in_offline_mode": true
}
```
**Status:** ❌ Tidak ada di `sensor_catalogs` atau tabel lain

#### 4. **Node Advanced Settings**
```json
"node": {
  "rs485_scan_interval_ms": 120000,
  "sync_rate_limit_ms": 10000,
  "sync_max_burst": 10,
  "sync_pause_after_burst_ms": 30000
}
```
**Status:** ❌ Hanya `telemetry_interval_sec` yang ada

---

## Recommended Default Values (ENV-Based)

### Strategy: Use Environment Variables for Missing Configs

#### `.env` Variables to Add:

```bash
# ======================
# Device Config Defaults
# ======================

# Config Version
DEVICE_CONFIG_VERSION=2.0

# Network - LTE Settings
DEVICE_LTE_RETRY_INTERVAL_MS=15000
DEVICE_LTE_MAX_RETRIES_BEFORE_REBOOT=5
DEVICE_LTE_REBOOT_COUNT_BEFORE_OFFLINE=3
DEVICE_LTE_OFFLINE_PAUSE_MINUTES=5

# Network - Watchdog Settings
DEVICE_WATCHDOG_ENABLED=true
DEVICE_WATCHDOG_TIMEOUT_MINUTES=30
DEVICE_WATCHDOG_PAUSE_DURING_OFFLINE=false

# Network - Offline Mode Settings
DEVICE_OFFLINE_AUTO_DETECT_NO_SIM=true
DEVICE_OFFLINE_AUTO_RECHECK_SIM_MINUTES=10
DEVICE_OFFLINE_MAX_OFFLINE_CYCLES_BEFORE_RESTART=6

# RS485 Behavior
DEVICE_RS485_PERSIST_TO_SD=true
DEVICE_RS485_READ_IN_OFFLINE_MODE=true

# Node Advanced Settings
DEVICE_RS485_SCAN_INTERVAL_MS=120000
DEVICE_SYNC_RATE_LIMIT_MS=10000
DEVICE_SYNC_MAX_BURST=10
DEVICE_SYNC_PAUSE_AFTER_BURST_MS=30000
```

---

## Config Service Structure

### New File: `src/config/device-defaults.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('deviceDefaults', () => ({
  version: process.env.DEVICE_CONFIG_VERSION || '2.0',
  
  network: {
    lte: {
      retryIntervalMs: parseInt(process.env.DEVICE_LTE_RETRY_INTERVAL_MS, 10) || 15000,
      maxRetriesBeforeReboot: parseInt(process.env.DEVICE_LTE_MAX_RETRIES_BEFORE_REBOOT, 10) || 5,
      rebootCountBeforeOffline: parseInt(process.env.DEVICE_LTE_REBOOT_COUNT_BEFORE_OFFLINE, 10) || 3,
      offlinePauseMinutes: parseInt(process.env.DEVICE_LTE_OFFLINE_PAUSE_MINUTES, 10) || 5,
    },
    watchdog: {
      enabled: process.env.DEVICE_WATCHDOG_ENABLED === 'true',
      timeoutMinutes: parseInt(process.env.DEVICE_WATCHDOG_TIMEOUT_MINUTES, 10) || 30,
      pauseDuringOffline: process.env.DEVICE_WATCHDOG_PAUSE_DURING_OFFLINE === 'true',
    },
    offlineMode: {
      autoDetectNoSim: process.env.DEVICE_OFFLINE_AUTO_DETECT_NO_SIM !== 'false',
      autoRecheckSimMinutes: parseInt(process.env.DEVICE_OFFLINE_AUTO_RECHECK_SIM_MINUTES, 10) || 10,
      maxOfflineCyclesBeforeRestart: parseInt(process.env.DEVICE_OFFLINE_MAX_OFFLINE_CYCLES_BEFORE_RESTART, 10) || 6,
    },
  },
  
  rs485Behavior: {
    persistToSd: process.env.DEVICE_RS485_PERSIST_TO_SD !== 'false',
    readInOfflineMode: process.env.DEVICE_RS485_READ_IN_OFFLINE_MODE !== 'false',
  },
  
  nodeAdvanced: {
    rs485ScanIntervalMs: parseInt(process.env.DEVICE_RS485_SCAN_INTERVAL_MS, 10) || 120000,
    syncRateLimitMs: parseInt(process.env.DEVICE_SYNC_RATE_LIMIT_MS, 10) || 10000,
    syncMaxBurst: parseInt(process.env.DEVICE_SYNC_MAX_BURST, 10) || 10,
    syncPauseAfterBurstMs: parseInt(process.env.DEVICE_SYNC_PAUSE_AFTER_BURST_MS, 10) || 30000,
  },
}));
```

---

## Modified Response Structure (handleConfigRequest)

### Current Implementation Location:
`iot-gtw/src/modules/mqtt/mqtt.service.ts:400` (handleConfigRequest method)

### Proposed Changes:

```typescript
private async handleConfigRequest(topic: string, message: Buffer): Promise<void> {
  // Extract device_id from topic
  const deviceId = topic.split('/')[1];
  
  // Get node from database
  const node = await this.nodeRepository.findOne({
    where: [
      { serialNumber: deviceId },
      { devEui: deviceId },
      { code: deviceId },
    ],
  });

  // Get default configs from ENV
  const deviceDefaults = this.configService.get('deviceDefaults');
  
  let config: any = null;

  if (!node) {
    // Device not found - send minimal config
    config = {
      device_id: deviceId,
      config_version: deviceDefaults.version,
      updated_at: new Date().toISOString(),
      network: deviceDefaults.network,
      rs485: {
        persist_to_sd: deviceDefaults.rs485Behavior.persistToSd,
        read_in_offline_mode: deviceDefaults.rs485Behavior.readInOfflineMode,
        devices: [], // Empty for unpaired devices
      },
      node: {
        telemetry_interval_ms: 60000, // Default 1 minute
        ...deviceDefaults.nodeAdvanced,
      },
    };
  } else {
    // Device found - build full config
    const rs485Devices = await this.getRS485ConfigFromDatabase(node.idNode);
    
    config = {
      device_id: deviceId,
      config_version: deviceDefaults.version,
      updated_at: node.updatedAt.toISOString(),
      network: deviceDefaults.network, // From ENV
      rs485: {
        persist_to_sd: deviceDefaults.rs485Behavior.persistToSd, // From ENV
        read_in_offline_mode: deviceDefaults.rs485Behavior.readInOfflineMode, // From ENV
        devices: rs485Devices || [], // From database
      },
      node: {
        telemetry_interval_ms: node.telemetryIntervalSec * 1000, // Convert sec to ms
        ...deviceDefaults.nodeAdvanced, // From ENV
      },
    };
  }

  // Publish to stream_config/{device_id}
  const responseTopic = `stream_config/${deviceId}`;
  await this.publish(responseTopic, config);
}
```

---

## Data Source Priority

| Config Section | Data Source | Fallback |
|----------------|-------------|----------|
| `device_id` | From topic/payload | Required |
| `config_version` | ENV: `DEVICE_CONFIG_VERSION` | "2.0" |
| `updated_at` | `node.updated_at` | `new Date()` |
| `network.*` | **ENV only** | Default values |
| `rs485.devices[]` | **Database** (`sensor_catalogs`) | `[]` |
| `rs485.persist_to_sd` | **ENV only** | `true` |
| `rs485.read_in_offline_mode` | **ENV only** | `true` |
| `node.telemetry_interval_ms` | **Database** (`nodes.telemetry_interval_sec * 1000`) | `60000` |
| `node.rs485_scan_interval_ms` | **ENV only** | `120000` |
| `node.sync_*` | **ENV only** | Default values |

---

## Future Database Schema (Phase 2 - Optional)

### Option 1: Add JSON Column to `nodes` Table

```sql
ALTER TABLE nodes 
ADD COLUMN device_config_json JSONB DEFAULT NULL;

COMMENT ON COLUMN nodes.device_config_json IS 'Device-specific config overrides (network, rs485 behavior, node advanced)';
```

**Pros:**
- Simple, single column
- Per-device customization
- Easy to override defaults

**Cons:**
- No validation at DB level
- Hard to query specific config values

### Option 2: Add JSON Column to `node_profiles` Table

```sql
ALTER TABLE node_profiles 
ADD COLUMN device_config_json JSONB DEFAULT NULL;

COMMENT ON COLUMN node_profiles.device_config_json IS 'Profile-level device config (shared across nodes with same profile)';
```

**Pros:**
- Reusable across multiple nodes
- Profile-based configuration
- Easier to manage bulk changes

**Cons:**
- Less flexible per-device

### Option 3: New Table `node_device_configs`

```sql
CREATE TABLE node_device_configs (
  id_node_device_config UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_node UUID NOT NULL REFERENCES nodes(id_node) ON DELETE CASCADE,
  
  -- Network LTE
  lte_retry_interval_ms INTEGER DEFAULT 15000,
  lte_max_retries_before_reboot INTEGER DEFAULT 5,
  lte_reboot_count_before_offline INTEGER DEFAULT 3,
  lte_offline_pause_minutes INTEGER DEFAULT 5,
  
  -- Network Watchdog
  watchdog_enabled BOOLEAN DEFAULT true,
  watchdog_timeout_minutes INTEGER DEFAULT 30,
  watchdog_pause_during_offline BOOLEAN DEFAULT false,
  
  -- Network Offline Mode
  offline_auto_detect_no_sim BOOLEAN DEFAULT true,
  offline_auto_recheck_sim_minutes INTEGER DEFAULT 10,
  offline_max_offline_cycles_before_restart INTEGER DEFAULT 6,
  
  -- RS485 Behavior
  rs485_persist_to_sd BOOLEAN DEFAULT true,
  rs485_read_in_offline_mode BOOLEAN DEFAULT true,
  
  -- Node Advanced
  rs485_scan_interval_ms INTEGER DEFAULT 120000,
  sync_rate_limit_ms INTEGER DEFAULT 10000,
  sync_max_burst INTEGER DEFAULT 10,
  sync_pause_after_burst_ms INTEGER DEFAULT 30000,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(id_node)
);
```

**Pros:**
- Full validation at DB level
- Easy to query and filter
- Type-safe columns
- Good for UI forms

**Cons:**
- More complex schema
- Migration required
- More columns to maintain

---

## Recommended Approach (Short-term)

### Phase 1 (NOW): ENV-Based Defaults ✅
1. Add ENV variables to `.env.example`
2. Create `device-defaults.config.ts`
3. Modify `handleConfigRequest()` to merge:
   - Database data (rs485.devices, node.telemetry_interval_ms)
   - ENV defaults (network.*, rs485 behavior, node advanced)
4. Response always has complete config structure

**Timeline:** 1-2 hours
**Risk:** Low
**Flexibility:** Can change defaults without code changes

### Phase 2 (LATER): Database Storage (Optional)
1. Choose schema approach (JSON column or dedicated table)
2. Create migration script
3. Build admin UI for config management
4. Update `handleConfigRequest()` to check DB first, fallback to ENV

**Timeline:** 1-2 days
**Risk:** Medium (schema changes)
**Flexibility:** Per-device/profile customization

---

## Testing Checklist

### Test Case 1: Unpaired Device Requests Config
- ✅ Device not in `nodes` table
- ✅ Returns config with empty `rs485.devices[]`
- ✅ All network/node settings from ENV defaults

### Test Case 2: Paired Device Without Sensors
- ✅ Device exists in `nodes` table
- ✅ No sensors assigned (`sensors` table empty)
- ✅ Returns config with empty `rs485.devices[]`
- ✅ `telemetry_interval_ms` from `nodes.telemetry_interval_sec`

### Test Case 3: Paired Device With Sensors
- ✅ Device exists with sensors
- ✅ Sensor catalogs have `default_channels_json`
- ✅ Returns full `rs485.devices[]` array
- ✅ All settings properly merged

### Test Case 4: ENV Override
- ✅ Change ENV value (e.g., `DEVICE_LTE_RETRY_INTERVAL_MS=20000`)
- ✅ Restart service
- ✅ Config response reflects new value

---

## Summary

### Coverage Status:
- ✅ **RS485 Devices**: 100% from database (`sensor_catalogs`)
- ⚠️ **Node Telemetry**: Partial (need convert sec → ms)
- ❌ **Network Config**: 0% (use ENV defaults)
- ❌ **RS485 Behavior**: 0% (use ENV defaults)
- ❌ **Node Advanced**: 0% (use ENV defaults)

### Next Steps:
1. ✅ Create `device-defaults.config.ts` with ENV variables
2. ✅ Update `.env.example` with new variables
3. ✅ Modify `handleConfigRequest()` to build complete config
4. ✅ Test with MQTT client
5. 🔄 (Optional) Plan Phase 2 database schema

### Impact:
- **Breaking Changes:** None (backward compatible)
- **Device Compatibility:** Devices get full config immediately
- **Admin UI:** Not required (ENV-based)
- **Future-proof:** Can migrate to DB storage later

---

**Document Version:** 1.0  
**Date:** 2025-12-07  
**Status:** Awaiting approval before implementation
