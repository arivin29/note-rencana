# Migration: Fix Reserved Keyword "offset" Issue

**Date:** November 12, 2025  
**Status:** Ready to Execute  
**Priority:** High - Fixes critical SQL keyword conflict

## Problem Statement

The `offset` column in `sensor_channels` table is a PostgreSQL reserved keyword. This causes TypeORM query generation to fail because PostgreSQL interprets `SELECT channel.offset` as an OFFSET clause rather than a column name.

### Error Examples
```
QueryFailedError: column channel.offset does not exist
ERROR: column "offset" does not exist at character 414
```

### Previous Workaround
We had to use selective column queries and raw SQL to avoid loading the `offset` field, which made the code complex and fragile.

## Solution

Rename the database column from `offset` to `value_offset` and update all related code.

### Database Changes
```sql
ALTER TABLE sensor_channels 
RENAME COLUMN "offset" TO value_offset;
```

### Code Changes
1. **Entity:** `sensor-channel.entity.ts`
   - Property: `offset` → `valueOffset`
   - Column mapping: `name: 'value_offset'`

2. **DTOs:**
   - `CreateSensorChannelDto`: `offset` → `valueOffset`
   - `UpdateSensorChannelDto`: Automatically inherits from Create
   - `SensorChannelResponseDto`: `offset` → `valueOffset`

3. **Service Methods:**
   - Removed QueryBuilder workarounds
   - Restored normal TypeORM `.find()` and relations
   - Now can load full entities without issues

## Migration Files

### Forward Migration
File: `migrations/001_rename_offset_column.sql`
- Renames `offset` to `value_offset`
- Adds column comment for documentation
- Includes verification checks

### Rollback Script
File: `migrations/001_rename_offset_column_rollback.sql`
- Reverts `value_offset` back to `offset`
- Use this if issues occur

### Execution Script
File: `run-migration.sh`
- Interactive script with safety checks
- Tests connection before executing
- Shows before/after column state
- Confirms with user before applying changes

## Execution Instructions

### Prerequisites
1. PostgreSQL must be running
2. Backup database (recommended):
   ```bash
   pg_dump -h localhost -U postgres iot_dashboard > backup_before_offset_migration.sql
   ```

### Run Migration

**Option 1: Using Shell Script (Recommended)**
```bash
cd /path/to/iot-backend

# Set password if needed
export PGPASSWORD=your_password

# Run migration
./run-migration.sh
```

**Option 2: Manual Execution**
```bash
# Check current state
psql -h localhost -U postgres -d iot_dashboard \
  -c "SELECT column_name FROM information_schema.columns 
      WHERE table_name='sensor_channels' AND column_name IN ('offset','value_offset');"

# Execute migration
psql -h localhost -U postgres -d iot_dashboard \
  -f ./migrations/001_rename_offset_column.sql

# Verify
psql -h localhost -U postgres -d iot_dashboard \
  -c "SELECT column_name FROM information_schema.columns 
      WHERE table_name='sensor_channels' AND column_name='value_offset';"
```

### After Migration

1. **Restart NestJS Server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run start:dev
   ```

2. **Test All Endpoints**
   ```bash
   # Sensors
   curl http://localhost:3000/api/sensors/statistics/overview
   curl http://localhost:3000/api/sensors/{id}/dashboard
   curl http://localhost:3000/api/sensors/{id}/channels
   
   # Nodes
   curl http://localhost:3000/api/nodes/statistics/overview
   curl http://localhost:3000/api/nodes/{id}/dashboard
   curl http://localhost:3000/api/nodes/{id}/sensors
   
   # Sensor Channels
   curl http://localhost:3000/api/sensor-channels/statistics/overview
   curl http://localhost:3000/api/sensor-channels/{id}/readings
   ```

3. **Update Swagger Docs**
   - Visit http://localhost:3000/api
   - Verify `valueOffset` appears in schemas
   - Test API calls through Swagger UI

## Rollback Instructions

If issues occur after migration:

```bash
cd /path/to/iot-backend

# Execute rollback
psql -h localhost -U postgres -d iot_dashboard \
  -f ./migrations/001_rename_offset_column_rollback.sql

# Restart server
npm run start:dev
```

Then revert code changes:
```bash
git checkout src/entities/sensor-channel.entity.ts
git checkout src/modules/sensor-channels/dto/
# Revert other changed files
```

## Impact Assessment

### Files Modified
1. `src/entities/sensor-channel.entity.ts` - Entity definition
2. `src/modules/sensor-channels/dto/create-sensor-channel.dto.ts` - Create DTO
3. `src/modules/sensor-channels/dto/sensor-channel-response.dto.ts` - Response DTO
4. `src/modules/sensors/sensors.service.ts` - Removed workarounds
5. `src/modules/nodes/nodes.service.ts` - Removed workarounds
6. `src/modules/sensor-channels/sensor-channels.service.ts` - Removed workarounds

### API Changes
- Request body: `offset` → `valueOffset` (CREATE, UPDATE operations)
- Response body: `offset` → `valueOffset` (all GET operations)
- **Breaking Change:** Frontend clients must update to use new field name

### Database Impact
- Zero data loss (column rename only)
- Zero downtime required (ALTER TABLE RENAME is instant)
- Backward compatible: Old applications won't work (breaking change)

## Benefits

### Before (with workaround)
```typescript
// Complex selective queries to avoid 'offset' field
const channels = await this.sensorChannelRepository
  .createQueryBuilder('channel')
  .select(['channel.idSensorChannel', 'channel.metricCode', ...])
  .where('channel.idSensor = :id', { id })
  .getMany();
```

### After (clean code)
```typescript
// Simple, clean TypeORM usage
const channels = await this.sensorChannelRepository.find({
  where: { idSensor: id },
  relations: ['sensor', 'sensor.node'],
});
```

### Improvements
✅ Simpler code - no workarounds needed  
✅ Better performance - TypeORM can optimize queries  
✅ Proper relations - can use lazy loading, eager loading  
✅ Type safety - full entity type checking  
✅ Maintainability - standard TypeORM patterns  

## Testing Checklist

After migration, verify:

- [ ] Database column renamed successfully
- [ ] NestJS server starts without errors
- [ ] All CRUD operations work (CREATE, READ, UPDATE, DELETE)
- [ ] Sensors dashboard endpoint works
- [ ] Nodes dashboard endpoint works
- [ ] Sensor channels endpoints work
- [ ] TypeORM relations load correctly
- [ ] Swagger documentation updated
- [ ] No TypeScript compilation errors
- [ ] API responses include `valueOffset` field

## Notes

- The column `multiplier` also appears in calibration formulas but is NOT a reserved keyword
- Formula: `engineered_value = (raw_value * multiplier) + valueOffset`
- Consider documenting this formula in API documentation

## References

- PostgreSQL Reserved Keywords: https://www.postgresql.org/docs/current/sql-keywords-appendix.html
- TypeORM Column Options: https://typeorm.io/entities#column-options
- NestJS DTOs: https://docs.nestjs.com/techniques/validation

---

**Migration Status:** ⏳ Pending Execution  
**Last Updated:** 2025-11-12  
**Author:** GitHub Copilot + User
