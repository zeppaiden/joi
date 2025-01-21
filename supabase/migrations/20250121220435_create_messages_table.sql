-- Create set_updated_at function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Create updated_at trigger
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admin can do everything
CREATE POLICY "Admin full access"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL
    )
  );

-- Agents can read/write messages for tickets assigned to them
CREATE POLICY "Agent access to assigned tickets"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'agent' AND deleted_at IS NULL
    )
    AND
    ticket_id IN (
      SELECT id FROM tickets WHERE assigned_to = auth.uid() AND deleted_at IS NULL
    )
  );

-- Customers can read/write messages for their own tickets
CREATE POLICY "Customer access to own tickets"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'customer' AND deleted_at IS NULL
    )
    AND
    ticket_id IN (
      SELECT id FROM tickets WHERE customer_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Create indexes
CREATE INDEX messages_ticket_id_idx ON messages(ticket_id);
CREATE INDEX messages_user_id_idx ON messages(user_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);
