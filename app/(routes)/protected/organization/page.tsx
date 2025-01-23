import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationDetails } from "@/components/organization/organization-details";
import { OrganizationMembers } from "@/components/organization/organization-members";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface OrganizationMember {
  id: string;
  user_id: string;
  created_at: string;
  users: {
    email: string;
    role: string;
  };
}

interface Organization {
  id: string;
  name: string;
  admin_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organization_members: OrganizationMember[];
}

export default async function OrganizationPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get user's organization - first try as admin
  let { data: adminOrg } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      admin_id,
      created_at,
      updated_at,
      deleted_at,
      organization_members (
        id,
        user_id,
        created_at,
        users (
          email,
          role
        )
      )
    `)
    .eq('admin_id', user.id)
    .single();

  // If not an admin, try as a member
  if (!adminOrg) {
    const { data: memberOrg } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations (
          id,
          name,
          admin_id,
          created_at,
          updated_at,
          deleted_at,
          organization_members (
            id,
            user_id,
            created_at,
            users (
              email,
              role
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (memberOrg?.organization) {
      adminOrg = memberOrg.organization;
    }
  }

  // Add console logs for debugging
  console.log('User:', user);
  console.log('Organization:', adminOrg);

  if (!adminOrg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-semibold">No Organization Found</h1>
        <p className="text-muted-foreground">
          You are not a member of any organization.
        </p>
      </div>
    );
  }

  // Transform the data to include email from users table
  const transformedOrg: Organization = {
    ...adminOrg,
    organization_members: adminOrg.organization_members.map(member => ({
      ...member,
      email: member.users?.email,
      role: member.users?.role
    }))
  };

  const isAdmin = transformedOrg.admin_id === user.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and team members
        </p>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <OrganizationDetails organization={transformedOrg} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="members" className="space-y-4">
          <OrganizationMembers organization={transformedOrg} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 