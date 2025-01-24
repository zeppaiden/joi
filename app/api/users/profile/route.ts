import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const profileUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'agent', 'customer']).optional(),
});

// Get user profile
export async function GET() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// Update user profile
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = profileUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: result.error.format() },
        { status: 400 }
      );
    }

    // Get current user data to check role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only admins can change roles
    if (result.data.role && currentUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can change user roles' },
        { status: 403 }
      );
    }

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update(result.data)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 