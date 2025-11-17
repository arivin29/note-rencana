# Quick Start: Fix Offset Column Migration

## TL;DR - Run These Commands

```bash
# 1. Navigate to backend directory
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend

# 2. Start PostgreSQL (if not running)
# For Docker:
docker start postgres-container-name
# OR for Homebrew:
brew services start postgresql@15

# 3. Set password (if needed)
export PGPASSWORD=postgres

# 4. Run migration
./run-migration.sh

# 5. Restart NestJS server
npm run start:dev

# 6. Test endpoints
curl http://localhost:3000/api/sensors/statistics/overview
```

## What This Does

✅ Renames `offset` → `value_offset` in database  
✅ Entity updated: `offset` → `valueOffset` property  
✅ DTOs updated to match new field name  
✅ Removed all QueryBuilder workarounds  
✅ Restored clean TypeORM code  

## If Something Goes Wrong

```bash
# Rollback database
psql -h localhost -U postgres -d iot_dashboard \
  -f ./migrations/001_rename_offset_column_rollback.sql

# Rollback code
git checkout src/entities/sensor-channel.entity.ts
git checkout src/modules/sensor-channels/dto/
git checkout src/modules/sensors/sensors.service.ts
git checkout src/modules/nodes/nodes.service.ts
git checkout src/modules/sensor-channels/sensor-channels.service.ts

# Restart server
npm run start:dev
```

## Files Changed

- `migrations/001_rename_offset_column.sql` - Forward migration
- `migrations/001_rename_offset_column_rollback.sql` - Rollback script
- `migrations/README.md` - Full documentation
- `run-migration.sh` - Interactive executor
- `src/entities/sensor-channel.entity.ts` - Entity
- `src/modules/sensor-channels/dto/*.ts` - DTOs
- `src/modules/sensors/sensors.service.ts` - Service
- `src/modules/nodes/nodes.service.ts` - Service
- `src/modules/sensor-channels/sensor-channels.service.ts` - Service

## Testing After Migration

All these should return 200 OK:

```bash
# Statistics endpoints
curl http://localhost:3000/api/sensors/statistics/overview
curl http://localhost:3000/api/nodes/statistics/overview
curl http://localhost:3000/api/sensor-channels/statistics/overview

# Dashboard endpoints
curl http://localhost:3000/api/sensors/{sensor-id}/dashboard
curl http://localhost:3000/api/nodes/{node-id}/dashboard

# Detail endpoints
curl http://localhost:3000/api/sensors/{sensor-id}/channels
curl http://localhost:3000/api/nodes/{node-id}/sensors
curl http://localhost:3000/api/sensor-channels/{channel-id}/readings
```

## Done! ✅

After successful migration, TypeORM will work normally without workarounds.
