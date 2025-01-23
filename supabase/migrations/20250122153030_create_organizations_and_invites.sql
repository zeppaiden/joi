-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT one_org_per_admin UNIQUE (admin_id)
);

-- Create organization_invites table
CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  CONSTRAINT invite_code_not_empty CHECK (length(trim(code)) > 0)
);

-- Create organization_members table to track agent memberships
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
-- Admins can manage their own organization
CREATE POLICY "Admins can manage their organization"
  ON organizations
  FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

-- Everyone can view organizations they're a member of
CREATE POLICY "Users can view organizations they belong to"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
    )
  );

-- Organization Invites RLS Policies
-- Admins can manage invites for their organization
CREATE POLICY "Admins can manage organization invites"
  ON organization_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organizations 
      WHERE id = organization_invites.organization_id 
      AND admin_id = auth.uid()
    )
  );

-- Agents can view invite codes
CREATE POLICY "Agents can view invite codes"
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

-- Organization Members RLS Policies
-- Admins can manage members in their organization
CREATE POLICY "Admins can manage organization members"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organizations 
      WHERE id = organization_members.organization_id 
      AND admin_id = auth.uid()
    )
  );

-- Members can view other members in their organization
CREATE POLICY "Members can view other organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX organizations_admin_id_idx ON organizations(admin_id);
CREATE INDEX organization_invites_code_idx ON organization_invites(code);
CREATE INDEX organization_invites_organization_id_idx ON organization_invites(organization_id);
CREATE INDEX organization_members_user_id_idx ON organization_members(user_id);
CREATE INDEX organization_members_organization_id_idx ON organization_members(organization_id);

-- Handle tickets table modifications
-- First, unassign any existing tickets (to avoid constraint violation)
UPDATE tickets SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- Now add organization_id column
ALTER TABLE tickets ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add the constraint after clearing assignments
ALTER TABLE tickets ADD CONSTRAINT tickets_org_required_for_agents 
  CHECK (
    (assigned_to IS NULL) OR 
    (assigned_to IS NOT NULL AND organization_id IS NOT NULL)
  );

-- Drop all existing ticket policies to avoid conflicts
DROP POLICY IF EXISTS "Agent ticket access" ON tickets;
DROP POLICY IF EXISTS "Admin ticket access" ON tickets;
DROP POLICY IF EXISTS "Customer ticket access" ON tickets;

-- Recreate ticket policies with organization context
CREATE POLICY "Agent ticket access" 
  ON tickets
  FOR ALL
  TO authenticated
  USING (
    -- Agent must be a member of the organization
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = tickets.organization_id
    )
    AND
    -- And must be assigned to the ticket
    assigned_to = auth.uid()
  );

CREATE POLICY "Admin ticket access"
  ON tickets
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE admin_id = auth.uid()
    )
  );

-- Customers can only access their own tickets (no organization context needed)
CREATE POLICY "Customer ticket access"
  ON tickets
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid());
