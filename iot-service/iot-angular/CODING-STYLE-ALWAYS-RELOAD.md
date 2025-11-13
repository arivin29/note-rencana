# Coding Style: Always Reload from Backend ✅

## Philosophy
> "Never trust local state. Always fetch fresh data from backend after mutations."

## Pattern

### ❌ **WRONG** - Manual State Update (Prone to Errors)
```typescript
handleSave(formValue: any) {
  // ❌ Manually update local state
  const newItem = {
    id: formValue.id,
    name: formValue.name,
    // ... manual mapping of all fields
  };
  this.items = [newItem, ...this.items]; // ❌ Risk of stale data
  this.closeDrawer();
}
```

**Problems:**
- Data bisa tidak sync dengan backend
- Relasi/computed fields tidak ter-update
- Aggregate counts salah
- Risk of stale data
- Hard to maintain saat struktur data berubah

### ✅ **CORRECT** - Reload from Backend
```typescript
handleSave(formValue: any) {
  this.closeDrawer();
  
  // ✅ Reload fresh data from backend
  this.loadData();
}
```

**Benefits:**
- ✅ Always fresh data from database
- ✅ All relations loaded correctly
- ✅ Computed fields accurate
- ✅ Aggregate counts correct
- ✅ Easy to maintain
- ✅ Single source of truth

---

## Implementation Examples

### 1. Add Sensor (nodes-detail.ts)

#### Before (❌ Manual Update)
```typescript
handleAddSensorSave(formValue: AddSensorFormValue) {
  // ❌ Manual state manipulation
  const catalog = this.sensorCatalogOptions.find(...);
  const newSensor: SensorDetail = {
    id: formValue.sensorCode,
    label: formValue.label,
    sensorCatalogId: formValue.sensorCatalogId,
    sensorCatalogLabel: catalog?.label ?? 'Custom Catalog',
    location: formValue.location || 'Unassigned',
    health: formValue.health,
    protocolChannel: formValue.protocolChannel,
    samplingRate: formValue.samplingRate,
    channels: []  // ❌ What if backend adds default channels?
  };
  this.sensors = [newSensor, ...this.sensors]; // ❌ Risk of data mismatch
  this.isAddSensorDrawerOpen = false;
}
```

#### After (✅ Reload from Backend)
```typescript
handleAddSensorSave(formValue: AddSensorFormValue) {
  this.isAddSensorDrawerOpen = false;
  
  // ✅ Reload fresh data from backend after save
  this.loadNodeDashboard();
}
```

### 2. Add Channel (nodes-detail.ts)

#### Before (❌ Manual Update)
```typescript
handleAddChannelSave(formValue: AddChannelFormValue) {
  // ❌ Manual state manipulation with map
  this.sensors = this.sensors.map((sensor) => {
    if (sensor.id !== formValue.sensorId) {
      return sensor;
    }
    return {
      ...sensor,
      channels: [
        {
          id: formValue.channelId,
          metric: formValue.metricCode,
          unit: formValue.unit,
          latest: 0,  // ❌ What if backend calculates latest value?
          status: 'ok',  // ❌ What if backend determines status?
          trend: 'stable',  // ❌ Hardcoded assumption
          sensorTypeId: formValue.sensorTypeId,
          sensorTypeLabel: formValue.sensorTypeId // ❌ Should be category name
        },
        ...sensor.channels
      ]
    };
  });
  this.handleAddChannelDrawerClose();
}
```

**Problems:**
- `latest: 0` - Backend might calculate from recent logs
- `status: 'ok'` - Backend might determine based on thresholds
- `trend: 'stable'` - Backend calculates from time-series data
- `sensorTypeLabel` wrong - Should be category name, not UUID

#### After (✅ Reload from Backend)
```typescript
handleAddChannelSave(formValue: AddChannelFormValue) {
  this.handleAddChannelDrawerClose();
  
  // ✅ Reload fresh data from backend after save
  this.loadNodeDashboard();
}
```

**Benefits:**
- Backend calculates correct `latest` value from logs
- Backend determines correct `status` based on thresholds
- Backend computes `trend` from time-series analysis
- Backend provides correct `sensorTypeLabel` from relation

### 3. Edit Channel (sensor-chanel-detail.ts)

#### Before (❌ Manual Update)
```typescript
handleChannelSave(formValue: AddChannelFormValue) {
  // ❌ Manual state update
  this.channelMeta = {
    ...this.channelMeta,
    ...formValue,
    sensorTypeLabel: this.sensorType
  };
  this.sensorName = formValue.channelId;
  this.sensorUnit = formValue.unit;
  this.isChannelDrawerOpen = false;
  this.loadChannelData(); // At least reloads, but partial
}
```

#### After (✅ Reload from Backend)
```typescript
handleChannelSave(formValue: AddChannelFormValue) {
  this.isChannelDrawerOpen = false;
  
  // ✅ Reload fresh data from backend after save
  this.loadChannelData();
}
```

---

## Pattern Rules

### ✅ **DO**
1. Close drawer/modal immediately
2. Call `loadData()` method to reload from backend
3. Let backend handle all computed fields
4. Trust backend as single source of truth
5. Show loading state during reload

### ❌ **DON'T**
1. Never manually manipulate local state arrays
2. Never assume default values (let backend decide)
3. Never copy-paste field mappings (duplicate code)
4. Never use `.map()` or `.push()` after mutations
5. Never trust stale data

---

## Data Flow

```
┌────────────────────────────────────────────┐
│  1. User fills form and submits           │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  2. Drawer calls API                       │
│     POST /api/sensors                      │
│     POST /api/sensor-channels              │
│     PATCH /api/sensor-channels/:id         │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  3. Backend saves to database              │
│     - Validates data                       │
│     - Sets defaults                        │
│     - Computes fields                      │
│     - Updates relations                    │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  4. Drawer emits save event                │
│     (save)="handleSave($event)"            │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  5. Parent component reloads               │
│     this.loadData()                        │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  6. Backend returns fresh data             │
│     GET /api/nodes/:id/dashboard           │
│     - All computed fields                  │
│     - All relations loaded                 │
│     - Latest values                        │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│  7. UI updates with accurate data          │
│     ✅ Latest values                       │
│     ✅ Correct status                      │
│     ✅ Accurate trends                     │
│     ✅ Proper labels                       │
└────────────────────────────────────────────┘
```

---

## Real World Example

### Scenario: Add Channel to Sensor

**What Backend Does After Save:**
1. Saves channel to `sensor_channels` table
2. Sets default `precision` from sensor type
3. Calculates `latest` value from `sensor_logs` (if exists)
4. Determines `status` based on thresholds
5. Computes `trend` from last N data points
6. Loads `sensorType` relation for category name
7. Updates sensor's `updatedAt` timestamp
8. Increments sensor's channel count

**If We Do Manual Update:**
- ❌ We miss all these backend calculations
- ❌ We show wrong `latest` value (0 instead of actual)
- ❌ We show wrong `status` ('ok' instead of actual)
- ❌ We show wrong label (UUID instead of category)
- ❌ We don't update sensor's metadata

**If We Reload from Backend:**
- ✅ All calculations correct
- ✅ All relations loaded
- ✅ All fields accurate
- ✅ UI matches database state exactly

---

## Code Examples

### Pattern Template

```typescript
// ✅ Standard pattern for all save handlers
handleSave(formValue: any) {
  // 1. Close UI immediately
  this.closeDrawer();
  
  // 2. Reload from backend
  this.loadData();
  
  // 3. Optionally show success message
  // this.showSuccessMessage('Saved successfully');
}
```

### With Loading State

```typescript
handleSave(formValue: any) {
  this.closeDrawer();
  
  // Show loading state
  this.loading = true;
  
  this.loadData(); // This will set loading = false when done
}
```

### With Error Handling

```typescript
handleSave(formValue: any) {
  this.closeDrawer();
  
  this.loadData().catch(err => {
    console.error('Failed to reload data:', err);
    this.showError('Data saved but failed to refresh. Please reload page.');
  });
}
```

---

## Benefits Summary

### 1. **Correctness**
- Data always matches backend state
- No risk of stale data
- Computed fields accurate

### 2. **Maintainability**
- Simple code (just reload)
- No duplicate mapping logic
- Easy to understand

### 3. **Scalability**
- Backend changes auto-reflected
- No frontend code change needed
- Consistent pattern everywhere

### 4. **Developer Experience**
- Less code to write
- Less bugs to fix
- Clear mental model

### 5. **User Experience**
- Always see latest data
- Accurate information
- Trust the UI

---

## Migration Checklist

When refactoring existing code:

- [ ] Find all `handle*Save()` methods
- [ ] Remove manual state updates (`.map()`, `.push()`, etc)
- [ ] Remove manual field mapping
- [ ] Add `this.loadData()` call
- [ ] Test: Verify data reloads after save
- [ ] Test: Verify computed fields correct
- [ ] Test: Verify relations loaded

---

## Files Updated (This Session)

```
✅ nodes-detail.ts
   - handleAddSensorSave() - now reloads from backend
   - handleAddChannelSave() - now reloads from backend

✅ sensor-chanel-detail.ts
   - handleChannelSave() - already reloads from backend

✅ node-detail-add-channel-drawer.component.ts
   - loadChannelData() - fetches from backend in edit mode
```

---

## Conclusion

> **"If you mutate data on the backend, reload from backend. Never trust local state."**

This is the **professional coding style** that ensures:
- ✅ Data integrity
- ✅ Code simplicity
- ✅ Easy maintenance
- ✅ No surprises

**Always reload. Always fresh. Always correct.** 🎯

---

**Last Updated**: 2025-11-13  
**Pattern**: Single Source of Truth  
**Philosophy**: Backend is King 👑
