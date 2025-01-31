import { createClient } from "@/utils/supabase/server";
import { TicketStats, TicketWithComputed, TicketFilters } from "@/types/tickets";
import { TicketFormData, TicketStatus, TicketPriority } from "@/schemas/tickets";
import { formatDistanceToNow } from "date-fns";
import { generateEmbedding } from "@/lib/openai";

// Get all tickets for an agent
export async function getAgentTickets(agentId: string, filters: TicketFilters): Promise<TicketWithComputed[]> {
  const supabase = await createClient();
  
  // Start with base query
  let query = supabase
    .from("tickets")
    .select("*")
    .is("deleted_at", null);  // Only non-deleted tickets
  
  // Apply filters
  if (filters.assignedToMe) {
    query = query.eq("assigned_to", agentId);
  }
  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status as string[]);
  }
  if (filters.priority && filters.priority.length > 0) {
    query = query.in("priority_level", filters.priority as string[]);
  }
  if (filters.searchQuery) {
    query = query.ilike("title", `%${filters.searchQuery}%`);
  }

  const { data: tickets, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }

  // Add computed fields
  return (tickets || []).map(ticket => ({
    ...ticket,
    timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
    isOverdue: ticket.status !== "closed" && new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
  }));
}

// Get ticket statistics
export async function getTicketStats(agentId: string): Promise<TicketStats> {
  const supabase = await createClient();
  
  // Get all active tickets for the agent
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("assigned_to", agentId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch ticket stats: ${error.message}`);
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Calculate stats
  const stats: TicketStats = {
    total: tickets?.length || 0,
    byStatus: {},
    byPriority: {},
    recentActivity: {
      created: 0,
      updated: 0,
      closed: 0
    }
  };

  // Process tickets
  tickets?.forEach(ticket => {
    // Count by status
    stats.byStatus[ticket.status || "unknown"] = (stats.byStatus[ticket.status || "unknown"] || 0) + 1;
    
    // Count by priority
    stats.byPriority[ticket.priority_level || "unknown"] = (stats.byPriority[ticket.priority_level || "unknown"] || 0) + 1;
    
    // Count recent activity
    const createdAt = new Date(ticket.created_at);
    const updatedAt = new Date(ticket.updated_at);
    
    if (createdAt >= oneDayAgo) stats.recentActivity.created++;
    if (updatedAt >= oneDayAgo) stats.recentActivity.updated++;
    if (ticket.status === "closed" && updatedAt >= oneDayAgo) stats.recentActivity.closed++;
  });

  return stats;
}

// Get a single ticket by ID
export async function getTicketById(ticketId: string): Promise<TicketWithComputed | null> {
  const supabase = await createClient();
  
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }

  if (!ticket) return null;

  return {
    ...ticket,
    timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
    isOverdue: ticket.status !== "closed" && new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  };
}

// Admin: Get all tickets with pagination and filters
export async function getAdminTickets(filters: TicketFilters): Promise<{ tickets: TicketWithComputed[]; total: number }> {
  const supabase = await createClient();
  const {
    status,
    priority,
    assignedTo,
    searchQuery,
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "desc"
  } = filters;

  // Start with base query for count
  const countQuery = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  // Start with base query for data
  let query = supabase
    .from("tickets")
    .select(`
      *,
      assignedToUser:users!tickets_assigned_to_fkey(email, role),
      createdByUser:users!tickets_created_by_fkey(email, role)
    `)
    .is("deleted_at", null);

  // Apply filters to both queries
  if (status && status.length > 0) {
    const statusValues = status as TicketStatus[];
    query = query.in("status", statusValues);
    countQuery.in("status", statusValues);
  }
  if (priority && priority.length > 0) {
    const priorityValues = priority as TicketPriority[];
    query = query.in("priority_level", priorityValues);
    countQuery.in("priority_level", priorityValues);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
    countQuery.eq("assigned_to", assignedTo);
  }
  if (searchQuery) {
    const likeQuery = `%${searchQuery}%`;
    query = query.or(`title.ilike.${likeQuery},description.ilike.${likeQuery}`);
    countQuery.or(`title.ilike.${likeQuery},description.ilike.${likeQuery}`);
  }

  // Add pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  // Execute queries
  const [{ data: tickets, error }, { count, error: countError }] = await Promise.all([
    query,
    countQuery
  ]);

  if (error || countError) {
    throw new Error(`Failed to fetch tickets: ${error?.message || countError?.message}`);
  }

  // Add computed fields
  const computedTickets = (tickets || []).map(ticket => {
    const assignedToUser = Array.isArray(ticket.assignedToUser) ? ticket.assignedToUser[0] : ticket.assignedToUser;
    const createdByUser = Array.isArray(ticket.createdByUser) ? ticket.createdByUser[0] : ticket.createdByUser;
    
    return {
      ...ticket,
      timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
      isOverdue: ticket.status !== "closed" && new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      assignedToUser,
      createdByUser
    };
  });

  return {
    tickets: computedTickets,
    total: count || 0
  };
}

// Admin: Create a new ticket
export async function createTicket(data: TicketFormData & { created_by: string }): Promise<TicketWithComputed> {
  const supabase = await createClient();
  
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      id: crypto.randomUUID(),
      status: data.status,
      priority_level: data.priority_level,
      title: data.title,
      assigned_to: data.assigned_to,
      description: data.description,
      created_by: data.created_by,
      customer_id: data.created_by
    })
    .select(`
      *,
      assignedToUser:users!tickets_assigned_to_fkey(email, role),
      createdByUser:users!tickets_created_by_fkey(email, role)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create ticket: ${error.message}`);
  }

  const assignedToUser = Array.isArray(ticket.assignedToUser) ? ticket.assignedToUser[0] : ticket.assignedToUser;
  const createdByUser = Array.isArray(ticket.createdByUser) ? ticket.createdByUser[0] : ticket.createdByUser;

  return {
    ...ticket,
    timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
    isOverdue: false,
    assignedToUser,
    createdByUser
  };
}

// Admin: Update a ticket
export async function updateTicket(ticketId: string, data: Partial<TicketFormData>): Promise<TicketWithComputed> {
  const supabase = await createClient();
  
  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq("id", ticketId)
    .select(`
      *,
      assignedToUser:users!tickets_assigned_to_fkey(email, role),
      createdByUser:users!tickets_created_by_fkey(email, role)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update ticket: ${error.message}`);
  }

  const assignedToUser = Array.isArray(ticket.assignedToUser) ? ticket.assignedToUser[0] : ticket.assignedToUser;
  const createdByUser = Array.isArray(ticket.createdByUser) ? ticket.createdByUser[0] : ticket.createdByUser;

  return {
    ...ticket,
    timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
    isOverdue: ticket.status !== "closed" && new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    assignedToUser,
    createdByUser
  };
}

// Admin: Soft delete a ticket
export async function deleteTicket(ticketId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("tickets")
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to delete ticket: ${error.message}`);
  }
}

// Get all agents for assignment
export async function getAgentsForAssignment(): Promise<{ id: string; email: string }[]> {
  const supabase = await createClient();
  
  const { data: agents, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("role", "agent")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }

  return agents || [];
}

export interface RelevantTicketContext {
  ticketId: string;
  title: string;
  status: string;
  priority: string;
  messages: {
    content: string;
    createdAt: string;
    role: string;
  }[];
}

export async function getRelevantTicketContext(
  organizationId: string,
  query: string,
  limit: number = 5
): Promise<RelevantTicketContext[]> {
  const supabase = await createClient();
  
  // Generate embedding for the query
  const embedding = await generateEmbedding(query);
  const embeddingStr = `[${embedding.join(',')}]`;

  console.log('Searching for messages with query:', query);
  
  // Find relevant messages using vector similarity search
  const { data: relevantMessages, error: messagesError } = await supabase
    .rpc('match_messages_by_embedding', {
      query_embedding: embeddingStr,
      match_threshold: 0.5,
      match_count: 10
    });

  if (messagesError) {
    console.error('Error fetching relevant messages:', messagesError);
    return [];
  }

  console.log('Found relevant messages:', relevantMessages);

  if (!relevantMessages?.length) {
    console.log('No relevant messages found');
    return [];
  }

  // Get unique ticket IDs from the relevant messages
  const ticketIds = Array.from(
    new Set(
      relevantMessages.map((m: { ticket_id: string }) => m.ticket_id)
    )
  );

  console.log('Unique ticket IDs found:', ticketIds);

  // Fetch full ticket details for the relevant tickets
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(`
      id,
      title,
      status,
      priority_level,
      messages!inner (
        id,
        content,
        created_at,
        user_id,
        users!inner (
          role
        )
      )
    `)
    .in('id', ticketIds)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .limit(limit);

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError);
    return [];
  }

  console.log('Retrieved tickets:', tickets);

  return (tickets || []).map(ticket => ({
    ticketId: ticket.id,
    title: ticket.title,
    status: ticket.status || 'unknown',
    priority: ticket.priority_level || 'unknown',
    messages: ticket.messages.map(msg => ({
      content: msg.content,
      createdAt: msg.created_at,
      role: msg.users?.role || 'unknown'
    }))
  }));
} 