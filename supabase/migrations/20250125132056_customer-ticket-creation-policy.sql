-- Create policy to allow customers to create tickets
CREATE POLICY "Customer ticket creation" ON "public"."tickets"
FOR INSERT
TO authenticated
WITH CHECK (
    -- Ensure the authenticated user is both the creator and customer
    auth.uid() = created_by AND
    auth.uid() = customer_id
);
