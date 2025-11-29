-- ============================================
-- MIGRATION: Create Auth System Tables
-- Version: 005
-- Description: Create users, sessions, audit logs, and notifications tables
-- Author: System
-- Date: 2025-11-29
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id_user UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner UUID REFERENCES owners(id_owner) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'tenant' CHECK (role IN ('admin', 'tenant')),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id_user),
  updated_by UUID REFERENCES users(id_user)
);

COMMENT ON TABLE users IS 'System users with authentication and authorization';
COMMENT ON COLUMN users.id_owner IS 'Link to owner - tenant users belong to an owner, admin users have NULL';
COMMENT ON COLUMN users.role IS 'User role: admin (full access) or tenant (owner-scoped access)';
COMMENT ON COLUMN users.is_active IS 'Account status - inactive users cannot login';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_id_owner ON users(id_owner);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- 2. PASSWORD RESET TOKENS
-- ============================================
CREATE TABLE password_reset_tokens (
  id_password_reset_token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset functionality';

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_id_user ON password_reset_tokens(id_user);

-- ============================================
-- 3. USER SESSIONS
-- ============================================
CREATE TABLE user_sessions (
  id_user_session UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'Active user sessions for security and session management';
COMMENT ON COLUMN user_sessions.token_hash IS 'Hashed JWT token for revocation capability';
COMMENT ON COLUMN user_sessions.device_info IS 'Browser, OS, device type extracted from user agent';

CREATE INDEX idx_user_sessions_id_user ON user_sessions(id_user);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- 4. AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id_audit_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID REFERENCES users(id_user) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: login, logout, create, update, delete, etc';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: node, sensor, user, owner, etc';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before/after values';

CREATE INDEX idx_audit_logs_id_user ON audit_logs(id_user);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 5. NOTIFICATION CHANNELS
-- ============================================
CREATE TYPE notification_channel_enum AS ENUM ('system', 'email', 'sms', 'push', 'webhook');

CREATE TABLE notification_channels (
  id_notification_channel UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name notification_channel_enum NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notification_channels IS 'Available notification delivery channels';
COMMENT ON COLUMN notification_channels.config IS 'Channel-specific configuration (SMTP, SMS gateway, etc)';

-- Insert default channels
INSERT INTO notification_channels (channel_name, is_enabled, config) VALUES
('system', true, '{"description": "In-app notifications"}'),
('email', false, '{"description": "Email notifications (requires SMTP config)"}'),
('sms', false, '{"description": "SMS notifications (requires SMS gateway)"}'),
('push', false, '{"description": "Push notifications (requires FCM/APNS)"}'),
('webhook', false, '{"description": "Webhook notifications (requires endpoint URL)"}');

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id_notification UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  id_notification_channel UUID REFERENCES notification_channels(id_notification_channel),
  from_module VARCHAR(100) NOT NULL,
  from_module_id UUID,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notifications with dynamic source tracking';
COMMENT ON COLUMN notifications.from_module IS 'Source module: nodes, sensors, users, alerts, etc';
COMMENT ON COLUMN notifications.from_module_id IS 'ID of the source record that triggered notification';
COMMENT ON COLUMN notifications.type IS 'Notification type: alert, info, warning, error, system';
COMMENT ON COLUMN notifications.data IS 'Additional context data in JSON format';
COMMENT ON COLUMN notifications.delivery_status IS 'Status: pending, sent, failed, read';

CREATE INDEX idx_notifications_id_user ON notifications(id_user);
CREATE INDEX idx_notifications_from_module ON notifications(from_module);
CREATE INDEX idx_notifications_from_module_id ON notifications(from_module_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- 7. UPDATE EXISTING TABLES (Add user tracking)
-- ============================================

-- Owners table
ALTER TABLE owners ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id_user);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id_user);
CREATE INDEX IF NOT EXISTS idx_owners_created_by ON owners(created_by);

-- Projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id_user);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id_user);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Nodes table
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id_user);
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id_user);
CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON nodes(created_by);

-- Sensors table
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id_user);
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id_user);
CREATE INDEX IF NOT EXISTS idx_sensors_created_by ON sensors(created_by);

-- Node profiles table
ALTER TABLE node_profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id_user);
ALTER TABLE node_profiles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id_user);
CREATE INDEX IF NOT EXISTS idx_node_profiles_created_by ON node_profiles(created_by);

-- ============================================
-- 8. CREATE DEFAULT ADMIN USER
-- ============================================
-- Password: admin123 (bcrypt hashed with salt rounds 10)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (email, password, name, role, is_active) VALUES
('admin@iot.local', '$2b$10$UPZHOK.3TJztQzfp.3PcA.tC11M96E/s2K1Yz9EjiZ8.8M8vA/W3e', 'System Administrator', 'admin', true);

COMMENT ON TABLE users IS 'Default admin user created. Email: admin@iot.local, Password: admin123 (CHANGE THIS!)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
