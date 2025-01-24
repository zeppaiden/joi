import { createClient } from '@/utils/supabase/client';
import { OrganizationAnalytics } from '@/types/analytics';

export async function getOrganizationAnalytics(organizationId: string): Promise<OrganizationAnalytics> {
  console.log('Starting analytics fetch for organization:', organizationId);
  const supabase = createClient();

  try {
    // Get ticket metrics
    console.log('Fetching ticket metrics...');
    const ticketMetricsPromise = supabase
      .from('tickets')
      .select(`
        id,
        status,
        priority_level,
        created_at,
        updated_at,
        rating,
        tags:ticket_tags(tag:tags(name))
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    // Get agent metrics
    console.log('Fetching agent metrics...');
    const agentMetricsPromise = supabase
      .from('organization_members')
      .select(`
        user:users!inner(
          id,
          email,
          assigned_tickets:tickets!assigned_to(
            id,
            status,
            created_at,
            updated_at,
            rating
          )
        )
      `)
      .eq('organization_id', organizationId);

    // Get customer metrics
    console.log('Fetching customer metrics...');
    const customerMetricsPromise = supabase
      .from('tickets')
      .select(`
        created_by,
        customer:users!created_by(
          email
        ),
        messages(count),
        rating
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    const [
      { data: ticketData, error: ticketError },
      { data: agentData, error: agentError },
      { data: customerData, error: customerError }
    ] = await Promise.all([
      ticketMetricsPromise,
      agentMetricsPromise,
      customerMetricsPromise
    ]);

    // Log any errors
    if (ticketError) console.error('Ticket metrics error:', ticketError);
    if (agentError) console.error('Agent metrics error:', agentError);
    if (customerError) console.error('Customer metrics error:', customerError);

    if (ticketError || agentError || customerError) {
      throw new Error('Failed to fetch analytics data');
    }

    // Log successful data fetches
    console.log('Ticket data count:', ticketData?.length || 0);
    console.log('Agent data count:', agentData?.length || 0);
    console.log('Customer data count:', customerData?.length || 0);

    // Process ticket metrics
    const ticketMetrics = {
      totalActive: ticketData?.filter(t => t.status !== 'closed').length || 0,
      byStatus: {
        open: ticketData?.filter(t => t.status === 'open').length || 0,
        in_progress: ticketData?.filter(t => t.status === 'in_progress').length || 0,
        resolved: ticketData?.filter(t => t.status === 'resolved').length || 0,
        closed: ticketData?.filter(t => t.status === 'closed').length || 0
      },
      byPriority: {
        low: ticketData?.filter(t => t.priority_level === 'low').length || 0,
        medium: ticketData?.filter(t => t.priority_level === 'medium').length || 0,
        high: ticketData?.filter(t => t.priority_level === 'high').length || 0,
        urgent: ticketData?.filter(t => t.priority_level === 'urgent').length || 0
      },
      averageResolutionTime: calculateAverageResolutionTime(ticketData || []),
      averageRating: calculateAverageRating(ticketData || []),
      ratingDistribution: calculateRatingDistribution(ticketData || []),
      dailyTickets: calculateDailyTickets(ticketData || []),
      topTags: calculateTopTags(ticketData || [])
    };

    console.log('Processed ticket metrics:', ticketMetrics);

    // Process agent metrics
    const agentMetrics = (agentData || []).map(agent => {
      const tickets = agent.user.assigned_tickets || [];
      const ratedTickets = tickets.filter(t => t.rating != null);
      
      return {
        id: agent.user.id,
        name: agent.user.email,
        ticketsResolved: tickets.filter(t => t.status === 'resolved').length,
        averageResponseTime: calculateAverageResponseTime(tickets),
        activeTickets: tickets.filter(t => t.status !== 'closed').length,
        averageRating: calculateAverageRating(ratedTickets),
        totalRatings: ratedTickets.length,
        ratingDistribution: calculateRatingDistribution(ratedTickets)
      };
    });

    console.log('Processed agent metrics count:', agentMetrics.length);

    // Process customer metrics
    const customerTickets = new Map<string, {
      email: string | null;
      tickets: any[];
    }>();

    customerData?.forEach(ticket => {
      if (!customerTickets.has(ticket.created_by)) {
        customerTickets.set(ticket.created_by, {
          email: ticket.customer?.email || null,
          tickets: []
        });
      }
      customerTickets.get(ticket.created_by)?.tickets.push(ticket);
    });

    const customerMetrics = {
      totalCustomers: customerTickets.size,
      averageMessagesPerTicket: calculateAverageMessagesPerTicket(customerData || []),
      mostActiveCustomers: Array.from(customerTickets.entries())
        .map(([id, { email, tickets }]) => {
          const ratedTickets = tickets.filter(t => t.rating != null);
          return {
            id,
            name: email || `Unknown Customer (${id})`,
            ticketCount: tickets.length,
            averageRating: calculateAverageRating(ratedTickets),
            totalRatings: ratedTickets.length,
            ratingDistribution: calculateRatingDistribution(ratedTickets)
          };
        })
        .sort((a, b) => b.ticketCount - a.ticketCount)
        .slice(0, 5)
    };

    console.log('Processed customer metrics:', customerMetrics);

    return {
      ticketMetrics,
      agentMetrics,
      customerMetrics
    };
  } catch (error) {
    console.error('Error in getOrganizationAnalytics:', error);
    throw error;
  }
}

// Helper functions
function calculateAverageResolutionTime(tickets: any[]): number {
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  if (resolvedTickets.length === 0) return 0;

  const totalTime = resolvedTickets.reduce((sum, ticket) => {
    const created = new Date(ticket.created_at);
    const resolved = new Date(ticket.updated_at);
    return sum + (resolved.getTime() - created.getTime());
  }, 0);

  return totalTime / (resolvedTickets.length * 3600000); // Convert to hours
}

function calculateDailyTickets(tickets: any[]): Array<{ date: string; count: number }> {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  return last7Days.map(date => ({
    date,
    count: tickets.filter(t => t.created_at.startsWith(date)).length
  }));
}

function calculateTopTags(tickets: any[]): Array<{ name: string; count: number }> {
  const tagCounts = new Map<string, number>();
  
  tickets.forEach(ticket => {
    ticket.tags.forEach((tag: any) => {
      const tagName = tag.tag.name;
      tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateAverageResponseTime(tickets: any[]): number {
  if (tickets.length === 0) return 0;
  // This is a simplified calculation - in reality, you'd want to use the first response time
  return calculateAverageResolutionTime(tickets);
}

function calculateAverageMessagesPerTicket(tickets: any[]): number {
  if (tickets.length === 0) return 0;
  const totalMessages = tickets.reduce((sum, t) => sum + t.messages[0].count, 0);
  return totalMessages / tickets.length;
}

function calculateMostActiveCustomers(tickets: any[]): Array<{ id: string; name: string; ticketCount: number }> {
  const customerCounts = new Map<string, { count: number; email: string | null }>();
  
  tickets.forEach(ticket => {
    const currentCount = customerCounts.get(ticket.created_by)?.count || 0;
    customerCounts.set(ticket.created_by, {
      count: currentCount + 1,
      email: ticket.customer?.email || null
    });
  });

  return Array.from(customerCounts.entries())
    .map(([id, { count, email }]) => ({
      id,
      name: email || `Unknown Customer (${id})`,
      ticketCount: count
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 5);
}

// Add new helper functions for ratings
function calculateAverageRating(tickets: any[]): number {
  const ratedTickets = tickets.filter(t => t.rating != null);
  if (ratedTickets.length === 0) return 0;
  
  const totalRating = ratedTickets.reduce((sum, ticket) => sum + ticket.rating, 0);
  return totalRating / ratedTickets.length;
}

function calculateRatingDistribution(tickets: any[]): { 1: number; 2: number; 3: number; 4: number; 5: number } {
  const distribution: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  tickets
    .filter(t => t.rating != null)
    .forEach(ticket => {
      const rating = ticket.rating as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });

  return distribution;
} 