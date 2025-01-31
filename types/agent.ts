export type DateRange = {
  start: Date;
  end?: Date;
};

export type TicketSearchParams = {
  priority?: "low" | "medium" | "high" | "urgent";
  status?: string;
  createdAt?: DateRange;
  updatedAt?: DateRange;
  assignedTo?: string;
  assigneeName?: string;
  organizationId?: string;
  customerId?: string;
  customerName?: string;
  isUnassigned?: boolean;
};

export type UserSearchParams = {
  name?: string;
  email?: string;
  role?: "admin" | "agent" | "customer";
  organizationId?: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type AgentState = {
  query: string;
  context: {
    currentUser?: any;
    organization?: any;
    resolvedUsers?: any[];
    parameters?: Record<string, any>;
    systemInfo?: {
      identity: {
        name: string;
        role: string;
        description: string;
        capabilities: string[];
      };
    };
    conversationHistory?: Message[];
  };
  result?: any;
};

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
};

export type AgentAction = {
  tool: AgentToolName;
  input: Record<string, any>;
  reasoning?: string;
};

export const AGENT_TOOLS = {
  SEARCH_TICKETS: "searchTickets",
  GET_TICKET_DETAILS: "getTicketDetails",
  CREATE_TICKET: "createTicket",
  FIND_SIMILAR_MESSAGES: "findSimilarMessages",
  FIND_USERS: "findUsers",
  GET_CURRENT_USER: "getCurrentUser",
  GET_SYSTEM_INFO: "getSystemInfo",
  UPDATE_ORGANIZATION: "updateOrganization",
  MANAGE_USERS: "manageUsers",
  UPDATE_TICKET: "updateTicket"
} as const;

export type AgentToolName = typeof AGENT_TOOLS[keyof typeof AGENT_TOOLS];

export const AgentIntents = {
  SEARCH: "search",
  DETAILS: "details",
  SIMILAR: "similar",
  SYSTEM: "system",
  GREETING: "greeting",
  USER_QUERY: "user_query",
  ADMIN_ACTION: "admin_action"
} as const;

export type AgentIntent = typeof AgentIntents[keyof typeof AgentIntents];

export type UserRole = "admin" | "agent" | "customer";

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { action: "manage", resource: "organization" },
    { action: "manage", resource: "users" },
    { action: "manage", resource: "settings" },
    { action: "manage", resource: "tickets" },
    { action: "view", resource: "all_tickets" },
    { action: "delete", resource: "tickets" },
  ],
  agent: [
    { action: "view", resource: "all_tickets" },
    { action: "update", resource: "tickets" },
    { action: "create", resource: "tickets" },
    { action: "manage", resource: "assigned_tickets" },
    { action: "view", resource: "users" },
  ],
  customer: [
    { action: "view", resource: "own_tickets" },
    { action: "create", resource: "tickets" },
    { action: "update", resource: "own_tickets" },
    { action: "view", resource: "own_profile" },
  ],
};

export interface ActionRequest {
  action: string;
  resource: string;
  parameters: Record<string, any>;
}

export type IntentAnalysis = {
  intent: AgentIntent;
  explanation: string;
  parameters: {
    timeRanges?: {
      created?: DateRange;
      updated?: DateRange;
    };
    filters?: {
      priority?: string;
      status?: string;
      assignee?: {
        id?: string;
        name?: string;
      };
      customer?: {
        id?: string;
        name?: string;
      };
    };
    ticketId?: string;
    searchTerms?: string[];
    messageContext?: {
      type: "chat" | "ticket" | "unclear";
      referenceIndex: number | null;
      needsClarification: boolean;
      clarificationQuestion: string | null;
    };
    action?: ActionRequest;
  };
};

export type TicketCreationParams = {
  id?: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string;
  customerId: string;
  organizationId?: string;
  status?: "open" | "in_progress" | "resolved" | "closed";
}; 