-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_messages_by_embedding;

-- Create a function to match messages based on vector similarity
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
  role text,
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
    u.role,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM messages m
  JOIN tickets t ON t.id = m.ticket_id
  JOIN users u ON u.id = m.user_id
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION match_messages_by_embedding IS 'Matches messages against a query embedding using cosine similarity, returning the most similar messages along with their metadata.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_messages_by_embedding TO authenticated;
