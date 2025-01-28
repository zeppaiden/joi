-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for document embeddings
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI's text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Composite index for document chunks
    UNIQUE(document_id, chunk_index)
);

-- Add embedding column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for similarity search
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100); -- Number of lists can be adjusted based on data size

CREATE INDEX ON messages USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Add RLS policies
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow read access to document embeddings for authenticated users
CREATE POLICY "Allow read access to document embeddings" ON document_embeddings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN organization_members om ON d.organization_id = om.organization_id
            WHERE d.id = document_embeddings.document_id
            AND om.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE document_embeddings IS 'Table for storing document chunk embeddings for vector similarity search';
COMMENT ON COLUMN document_embeddings.chunk_index IS 'Index of the chunk within the document';
COMMENT ON COLUMN document_embeddings.chunk_content IS 'The actual text content of this chunk';
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding of the chunk content';
COMMENT ON COLUMN document_embeddings.metadata IS 'Additional metadata about the chunk (e.g., position, overlap)';
COMMENT ON COLUMN messages.embedding IS 'Vector embedding of the message content for similarity search';
