import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1764404577000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to existing audit_logs table
    // Table was created by 005_create_auth_system.sql but with different column names
    
    await queryRunner.query(`
      -- Add new columns if they don't exist
      ALTER TABLE audit_logs 
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS entity_id UUID,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS request_method VARCHAR(10),
        ADD COLUMN IF NOT EXISTS request_url TEXT,
        ADD COLUMN IF NOT EXISTS old_values JSONB,
        ADD COLUMN IF NOT EXISTS new_values JSONB;
    `);

    // Copy data from old columns to new columns if they exist
    await queryRunner.query(`
      UPDATE audit_logs 
      SET 
        entity_type = COALESCE(entity_type, resource_type),
        entity_id = COALESCE(entity_id, resource_id)
      WHERE entity_type IS NULL OR entity_id IS NULL;
    `);

    // Create indexes for new columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_status;
      DROP INDEX IF EXISTS idx_audit_logs_entity;
    `);

    // Drop new columns (keep old ones for backward compatibility)
    await queryRunner.query(`
      ALTER TABLE audit_logs 
        DROP COLUMN IF EXISTS entity_type,
        DROP COLUMN IF EXISTS entity_id,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS request_method,
        DROP COLUMN IF EXISTS request_url,
        DROP COLUMN IF EXISTS old_values,
        DROP COLUMN IF EXISTS new_values;
    `);
  }
}
