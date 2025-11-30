-- Migration to update audit_logs table structure to match entity
-- Adds missing columns needed by AuditLog entity

-- Add new columns
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS request_method VARCHAR(10),
  ADD COLUMN IF NOT EXISTS request_url TEXT,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB;

-- Copy data from old columns to new columns (if needed)
UPDATE audit_logs 
SET 
  entity_type = resource_type,
  entity_id = resource_id
WHERE entity_type IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Optional: You can drop old columns if you no longer need them
-- Uncomment the following lines if you want to remove the old columns
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS resource_type;
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS resource_id;
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS changes;
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS error_message;
-- DROP INDEX IF EXISTS idx_audit_logs_resource_type;
