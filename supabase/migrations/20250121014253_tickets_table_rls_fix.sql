-- Drop existing policies
DROP POLICY IF EXISTS "Customer ticket access" ON tickets;
DROP POLICY IF EXISTS "Agent ticket access" ON tickets;

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Recreate policy
CREATE POLICY "Customer ticket access" ON tickets  
FOR SELECT USING (created_by = auth.uid());

-- Recreate policy
CREATE POLICY "Agent ticket access" ON tickets  
FOR SELECT USING (assigned_to = auth.uid());