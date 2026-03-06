-- Rollback: Drop tenant_api_keys and tenant_api_logs tables

-- Drop indexes
DROP INDEX IF EXISTS idx_tenant_api_logs_created;
DROP INDEX IF EXISTS idx_tenant_api_logs_api_key;
DROP INDEX IF EXISTS idx_tenant_api_keys_active;
DROP INDEX IF EXISTS idx_tenant_api_keys_owner;
DROP INDEX IF EXISTS idx_tenant_api_keys_user;
DROP INDEX IF EXISTS idx_tenant_api_keys_prefix;

-- Drop tables
DROP TABLE IF EXISTS tenant_api_logs;
DROP TABLE IF EXISTS tenant_api_keys;
