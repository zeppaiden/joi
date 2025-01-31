-- Drop the old version of the function
DROP FUNCTION IF EXISTS match_messages_by_embedding;

-- Create updated version of the function with proper user role handling
CREATE OR REPLACE FUNCTION match_messages_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  ticket_id uuid,
  created_at timestamptz,
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.ticket_id,
    m.created_at,
    m.user_id,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM messages m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION match_messages_by_embedding IS 'Matches messages against a query embedding using cosine similarity, returning the most similar messages along with their metadata.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_messages_by_embedding TO authenticated;
