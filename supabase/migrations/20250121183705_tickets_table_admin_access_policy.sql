-- Allow admins to view all tickets
CREATE POLICY "Admin ticket access" ON tickets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);