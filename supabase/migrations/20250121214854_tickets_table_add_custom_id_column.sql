-- Add customer_id column to tickets table (initially nullable)
ALTER TABLE tickets
ADD COLUMN customer_id UUID REFERENCES users(id);

-- Update existing tickets to use created_by as customer_id
UPDATE tickets
SET customer_id = created_by
WHERE customer_id IS NULL;

-- Make customer_id NOT NULL after populating existing records
ALTER TABLE tickets
ALTER COLUMN customer_id SET NOT NULL;

-- Update the customer access policy to use customer_id instead of created_by
DROP POLICY IF EXISTS "Customer ticket access" ON tickets;
CREATE POLICY "Customer ticket access" ON tickets
FOR SELECT USING (customer_id = auth.uid());

-- Add policy for admins to manage all tickets
CREATE POLICY "Admin full access" ON tickets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
