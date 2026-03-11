-- Add id_project column to custom_dashboards table for project-specific dashboards
-- This makes dashboards optionally associated with a project

-- First, create the custom_dashboards table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_dashboards (
    id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    id_project UUID NULL REFERENCES projects(id_project) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_config JSONB DEFAULT '{}',
    time_range VARCHAR(20) DEFAULT '6h',
    refresh_interval INTEGER DEFAULT 60,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_widgets table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_widgets (
    id_widget UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dashboard UUID NOT NULL REFERENCES custom_dashboards(id_dashboard) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    sql_query TEXT,
    data_source VARCHAR(20) DEFAULT 'clickhouse',
    config JSONB DEFAULT '{}',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    cols INTEGER DEFAULT 4,
    rows INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add id_project column if it doesn't exist (for existing installations)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_dashboards' AND column_name = 'id_project'
  ) THEN
    ALTER TABLE custom_dashboards ADD COLUMN id_project UUID NULL;
  END IF;
END $$;

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_custom_dashboards_project'
  ) THEN
    ALTER TABLE custom_dashboards 
    ADD CONSTRAINT fk_custom_dashboards_project 
    FOREIGN KEY (id_project) REFERENCES projects(id_project) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_owner ON custom_dashboards(id_owner);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_project ON custom_dashboards(id_project);
CREATE INDEX IF NOT EXISTS idx_custom_widgets_dashboard ON custom_widgets(id_dashboard);

-- Add comments
COMMENT ON COLUMN custom_dashboards.id_project IS 'Optional project association for project-specific dashboards';

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_dashboards' 
ORDER BY ordinal_position;
