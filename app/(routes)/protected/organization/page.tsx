import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationDetails } from "@/components/organization/organization-details";
import { OrganizationMembers } from "@/components/organization/organization-members";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revalidatePath } from "next/cache";

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

  async function joinOrganization(formData: FormData) {
    'use server';
    
    const code = formData.get('code') as string;
    if (!code) return;

    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect('/sign-in');
    }
    
    // Find the invite
    const { data: invite } = await supabase
      .from('organization_invites')
      .select('organization_id')
      .eq('code', code.toUpperCase())
      .single();

    if (!invite) {
      console.error('Invalid invite code');
      revalidatePath('/protected/organization');
      return;
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id
      });

    if (memberError) {
      console.error('Failed to join organization:', memberError);
      revalidatePath('/protected/organization');
      return;
    }

    // Delete the used invite code
    await supabase
      .from('organization_invites')
      .delete()
      .eq('code', code.toUpperCase());

    redirect('/protected/organization');
  }

  async function createOrganization(formData: FormData) {
    'use server';
    
    const name = formData.get('name') as string;
    if (!name) return;

    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect('/sign-in');
    }
    
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        admin_id: user.id
      })
      .select()
      .single();

    if (orgError) {
      console.error('Failed to create organization:', orgError);
      revalidatePath('/protected/organization');
      return;
    }

    // Add admin as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id
      });

    if (memberError) {
      // Cleanup organization if member creation fails
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);
      console.error('Failed to setup organization:', memberError);
      revalidatePath('/protected/organization');
      return;
    }

    redirect('/protected/organization');
  }

  if (!adminOrg) {
    return (
      <div className="container mx-auto max-w-2xl py-6">
        <h1 className="text-2xl font-semibold mb-6">Join or Create Organization</h1>
        <div className="grid gap-6">
          {/* Join Organization */}
          <form action={joinOrganization}>
            <Card>
              <CardHeader>
                <CardTitle>Join an Organization</CardTitle>
                <CardDescription>
                  Enter an invite code to join an existing organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Invite Code</Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="Enter invite code"
                    required
                  />
                </div>
                <Button type="submit">Join Organization</Button>
              </CardContent>
            </Card>
          </form>

          {/* Create Organization */}
          <form action={createOrganization}>
            <Card>
              <CardHeader>
                <CardTitle>Create an Organization</CardTitle>
                <CardDescription>
                  Create a new organization and become its admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter organization name"
                    required
                  />
                </div>
                <Button type="submit">Create Organization</Button>
              </CardContent>
            </Card>
          </form>
        </div>
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