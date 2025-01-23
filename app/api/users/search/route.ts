import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase();
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let supabaseQuery = supabase
      .from('users')
      .select('id, email, role, created_at', { count: 'exact' });

    // Apply filters
    if (query) {
      supabaseQuery = supabaseQuery.ilike('email', `%${query}%`);
    }

    if (role) {
      supabaseQuery = supabaseQuery.eq('role', role);
    }

    // Add pagination
    supabaseQuery = supabaseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await supabaseQuery;

    if (error) throw error;

    return NextResponse.json({
      users: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Failed to search users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search users' },
      { status: 500 }
    );
  }
} 