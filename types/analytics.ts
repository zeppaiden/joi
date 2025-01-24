export interface TicketMetrics {
  totalActive: number;
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  averageResolutionTime: number; // in hours
  dailyTickets: Array<{
    date: string;
    count: number;
  }>;
  topTags: Array<{
    name: string;
    count: number;
  }>;
}

export interface AgentMetrics {
  id: string;
  name: string;
  ticketsResolved: number;
  averageResponseTime: number; // in hours
  activeTickets: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  averageMessagesPerTicket: number;
  mostActiveCustomers: Array<{
    id: string;
    name: string;
    ticketCount: number;
  }>;
}

export interface OrganizationAnalytics {
  ticketMetrics: TicketMetrics;
  agentMetrics: AgentMetrics[];
  customerMetrics: CustomerMetrics;
} 