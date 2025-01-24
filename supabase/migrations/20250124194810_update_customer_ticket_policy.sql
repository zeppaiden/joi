-- Drop the existing policy
DROP POLICY IF EXISTS "Customer ticket access" ON "public"."tickets";

-- Create new policy that allows access if user is either the creator or the designated customer
CREATE POLICY "Customer ticket access" ON "public"."tickets"
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR 
  customer_id = auth.uid()
);
