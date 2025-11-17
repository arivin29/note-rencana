#!/bin/bash

# Migration Script Executor
# Purpose: Rename sensor_channels.offset to value_offset
# Date: 2025-11-12

set -e  # Exit on error

echo "=========================================="
echo " PostgreSQL Migration: Rename offset column"
echo "=========================================="
echo ""

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-iot_dashboard}"
DB_USER="${DB_USER:-postgres}"

echo "Target Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Check PostgreSQL connection
echo "1. Testing PostgreSQL connection..."
if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to PostgreSQL"
    echo "   Please ensure PostgreSQL is running and credentials are correct"
    echo "   Set PGPASSWORD environment variable if needed"
    exit 1
fi
echo "✅ Connection successful"
echo ""

# Show current state
echo "2. Checking current column state..."
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensor_channels'
  AND column_name IN ('offset', 'value_offset', 'multiplier')
ORDER BY ordinal_position;
"
echo ""

# Confirm migration
read -p "3. Proceed with migration? This will rename 'offset' to 'value_offset' (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Execute migration
echo ""
echo "4. Executing migration script..."
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f ./migrations/001_rename_offset_column.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    echo "   Check error messages above"
    echo "   Run rollback script if needed: ./migrations/001_rename_offset_column_rollback.sql"
    exit 1
fi

echo ""
echo "5. Verifying new column state..."
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensor_channels'
  AND column_name IN ('value_offset', 'multiplier')
ORDER BY ordinal_position;
"

echo ""
echo "=========================================="
echo " ✅ Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Restart NestJS server to pick up entity changes"
echo "  2. Test all endpoints"
echo "  3. Update API documentation if needed"
echo ""
echo "Rollback:"
echo "  If issues occur, run: ./migrations/001_rename_offset_column_rollback.sql"
echo ""
