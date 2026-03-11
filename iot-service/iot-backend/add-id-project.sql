-- Add id_project column to custom_dashboards
ALTER TABLE custom_dashboards ADD COLUMN IF NOT EXISTS id_project UUID NULL;

-- Add foreign key constraint
ALTER TABLE custom_dashboards 
ADD CONSTRAINT fk_custom_dashboards_project 
FOREIGN KEY (id_project) REFERENCES projects(id_project) 
ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_project ON custom_dashboards(id_project);
