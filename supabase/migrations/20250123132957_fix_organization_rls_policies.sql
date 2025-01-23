-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organization invites" ON organization_invites;
DROP POLICY IF EXISTS "Agents can view invite codes" ON organization_invites;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view other organization members" ON organization_members;

-- Recreate organization policies
CREATE POLICY "Admins can manage their organization"
  ON organizations
  FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE organization_id = id 
      AND user_id = auth.uid()
    )
  );

-- Recreate organization invites policies
CREATE POLICY "Admins can manage invites"
  ON organization_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organizations 
      WHERE id = organization_id 
      AND admin_id = auth.uid()
    )
  );

CREATE POLICY "Agents can view invites"
  ON organization_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE id = auth.uid() 
      AND role = 'agent'
    )
  );

-- Special policy to allow admins to create initial member record
CREATE POLICY "Admins can create initial member record"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organizations 
      WHERE id = organization_id 
      AND admin_id = auth.uid()
    )
  );

-- Recreate organization members policies
CREATE POLICY "Members can view organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE organization_id = organization_members.organization_id 
      AND user_id = auth.uid()
    )
  );

-- Allow admins to manage members after initial setup
CREATE POLICY "Admins can manage members"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organizations 
      WHERE id = organization_id 
      AND admin_id = auth.uid()
    )
  );
