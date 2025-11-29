-- ============================================
-- ROLLBACK MIGRATION: Drop Auth System Tables
-- Version: 005
-- Description: Rollback auth system tables and columns
-- Author: System
-- Date: 2025-11-29
-- ============================================

-- ============================================
-- 1. DROP INDEXES ON EXISTING TABLES
-- ============================================
DROP INDEX IF EXISTS idx_node_profiles_created_by;
DROP INDEX IF EXISTS idx_sensors_created_by;
DROP INDEX IF EXISTS idx_nodes_created_by;
DROP INDEX IF EXISTS idx_projects_created_by;
DROP INDEX IF EXISTS idx_owners_created_by;

-- ============================================
-- 2. REMOVE COLUMNS FROM EXISTING TABLES
-- ============================================
ALTER TABLE node_profiles DROP COLUMN IF EXISTS created_by;
ALTER TABLE node_profiles DROP COLUMN IF EXISTS updated_by;

ALTER TABLE sensors DROP COLUMN IF EXISTS created_by;
ALTER TABLE sensors DROP COLUMN IF EXISTS updated_by;

ALTER TABLE nodes DROP COLUMN IF EXISTS created_by;
ALTER TABLE nodes DROP COLUMN IF EXISTS updated_by;

ALTER TABLE projects DROP COLUMN IF EXISTS created_by;
ALTER TABLE projects DROP COLUMN IF EXISTS updated_by;

ALTER TABLE owners DROP COLUMN IF EXISTS created_by;
ALTER TABLE owners DROP COLUMN IF EXISTS updated_by;

-- ============================================
-- 3. DROP NOTIFICATIONS TABLE
-- ============================================
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_from_module_id;
DROP INDEX IF EXISTS idx_notifications_from_module;
DROP INDEX IF EXISTS idx_notifications_id_user;

DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================
-- 4. DROP NOTIFICATION CHANNELS TABLE
-- ============================================
DROP TABLE IF EXISTS notification_channels CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;

-- ============================================
-- 5. DROP AUDIT LOGS TABLE
-- ============================================
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_id_user;

DROP TABLE IF EXISTS audit_logs CASCADE;

-- ============================================
-- 6. DROP USER SESSIONS TABLE
-- ============================================
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_token_hash;
DROP INDEX IF EXISTS idx_user_sessions_id_user;

DROP TABLE IF EXISTS user_sessions CASCADE;

-- ============================================
-- 7. DROP PASSWORD RESET TOKENS TABLE
-- ============================================
DROP INDEX IF EXISTS idx_password_reset_tokens_id_user;
DROP INDEX IF EXISTS idx_password_reset_tokens_token;

DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- ============================================
-- 8. DROP USERS TABLE
-- ============================================
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_id_owner;
DROP INDEX IF EXISTS idx_users_email;

DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================
