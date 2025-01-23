-- Drop all organization-related policies
DROP POLICY IF EXISTS "Admins can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;

DROP POLICY IF EXISTS "Admins can manage organization invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can manage invites" ON organization_invites;
DROP POLICY IF EXISTS "Agents can view invite codes" ON organization_invites;
DROP POLICY IF EXISTS "Agents can view invites" ON organization_invites;

DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view other organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can create initial member record" ON organization_members;
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;

-- Temporarily disable RLS on these tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
