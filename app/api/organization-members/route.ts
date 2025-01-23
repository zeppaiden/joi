import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const memberSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid()
});

// Add member
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = memberSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: org } = await supabase
      .from('organizations')
      .select('admin_id')
      .eq('id', result.data.organization_id)
      .single();

    if (!org || org.admin_id !== user.id) {
      return NextResponse.json(
        { error: 'Only organization admins can add members' },
        { status: 403 }
      );
    }

    // Check if user exists and is an agent
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', result.data.user_id)
      .single();

    if (!targetUser || targetUser.role !== 'agent') {
      return NextResponse.json(
        { error: 'User must be an agent to be added to an organization' },
        { status: 400 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', result.data.user_id)
      .eq('organization_id', result.data.organization_id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('organization_members')
      .insert(result.data)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to add member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add member' },
      { status: 500 }
    );
  }
}

// Get members
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check if user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    const { data: org } = await supabase
      .from('organizations')
      .select('admin_id')
      .eq('id', organizationId)
      .single();

    if (!membership && (!org || org.admin_id !== user.id)) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        users (
          id,
          email,
          role
        )
      `)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get members' },
      { status: 500 }
    );
  }
}

// Remove member
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');
    const userId = searchParams.get('user_id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: org } = await supabase
      .from('organizations')
      .select('admin_id')
      .eq('id', organizationId)
      .single();

    if (!org || org.admin_id !== user.id) {
      return NextResponse.json(
        { error: 'Only organization admins can remove members' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: 500 }
    );
  }
} 