-- Customers: Own tickets
CREATE POLICY "Customer ticket access" ON tickets  
FOR SELECT USING (created_by = auth.uid());

-- Agents: Assigned tickets
CREATE POLICY "Agent ticket access" ON tickets  
FOR SELECT USING (assigned_to = auth.uid());