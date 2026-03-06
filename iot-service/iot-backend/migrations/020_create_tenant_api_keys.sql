-- Migration: Create tenant_api_keys and tenant_api_logs tables
-- Run this SQL on your PostgreSQL database

-- ============================================
-- Table: tenant_api_keys
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id_api_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL,
  id_owner UUID NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  api_key_prefix VARCHAR(20) NOT NULL,
  label VARCHAR(255),
  description TEXT,
  rate_limit_plan VARCHAR(20) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  requests_today INTEGER DEFAULT 0,
  requests_total BIGINT DEFAULT 0,
  last_request_date DATE,
  ip_whitelist TEXT[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_tenant_api_keys_user 
    FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_api_keys_owner 
    FOREIGN KEY (id_owner) REFERENCES owners(id_owner) ON DELETE CASCADE
);

-- Indexes for tenant_api_keys
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_prefix ON tenant_api_keys(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_user ON tenant_api_keys(id_user);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_owner ON tenant_api_keys(id_owner);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_active ON tenant_api_keys(is_active) WHERE is_active = true;

-- ============================================
-- Table: tenant_api_logs
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_api_logs (
  id BIGSERIAL PRIMARY KEY,
  id_api_key UUID,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_params JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_tenant_api_logs_api_key 
    FOREIGN KEY (id_api_key) REFERENCES tenant_api_keys(id_api_key) ON DELETE SET NULL
);

-- Indexes for tenant_api_logs
CREATE INDEX IF NOT EXISTS idx_tenant_api_logs_api_key ON tenant_api_logs(id_api_key);
CREATE INDEX IF NOT EXISTS idx_tenant_api_logs_created ON tenant_api_logs(created_at);

-- ============================================
-- Done!
-- ============================================
