-- Create documents table for generic file uploads
CREATE TABLE IF NOT EXISTS documents (
    id_document UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL,
    from_module VARCHAR(100) NOT NULL,
    from_module_id UUID NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    file_extension VARCHAR(50),
    document_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'uploaded',
    metadata JSONB DEFAULT '{}',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(from_module, from_module_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(id_owner);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);
