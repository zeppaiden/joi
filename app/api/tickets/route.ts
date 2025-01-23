import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  priority_level: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  organization_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional()
});

// Create ticket
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Parse and validate request body
    const body = await req.json();
    const result = ticketSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    // If customer creating ticket, force priority to low
    if (dbUser?.role === 'customer') {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          id: crypto.randomUUID(),
          title: result.data.title,
          description: result.data.description,
          priority_level: 'low',
          status: 'open',
          organization_id: result.data.organization_id,
          customer_id: user.id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // For non-customer tickets, customer_id is required in body
    if (!result.data.customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required for non-customer tickets' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        id: crypto.randomUUID(),
        title: result.data.title,
        description: result.data.description,
        priority_level: result.data.priority_level,
        status: result.data.status,
        organization_id: result.data.organization_id,
        customer_id: result.data.customer_id,
        assigned_to: result.data.assigned_to,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// Get tickets
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');
    
    let query = supabase
      .from('tickets')
      .select(`
        *,
        organizations (
          id,
          name
        ),
        assigned_to:users!assigned_to (
          id,
          email
        ),
        customer:users!customer_id (
          id,
          email
        )
      `);

    // Filter based on role
    if (dbUser?.role === 'customer') {
      query = query.eq('customer_id', user.id);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get tickets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tickets' },
      { status: 500 }
    );
  }
}

// Update ticket
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Parse request
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Validate updates
    const result = ticketSchema.partial().safeParse(updates);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: result.error.format() },
        { status: 400 }
      );
    }

    // Customers can only update description
    if (dbUser?.role === 'customer') {
      const { description, ...rest } = updates;
      if (Object.keys(rest).length > 0) {
        return NextResponse.json(
          { error: 'Customers can only update ticket description' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(result.data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// Delete ticket
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only admins can delete tickets
    if (dbUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete tickets' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete ticket' },
      { status: 500 }
    );
  }
} 