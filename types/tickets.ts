import { Database } from "./supabase";
import { TicketFilterParams, TicketFormData } from "@/schemas/tickets";

// Base ticket type from Supabase
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"];

// Stats-specific interfaces
export interface TicketStats {
  total: number;
  byStatus: {
    [key: string]: number;
  };
  byPriority: {
    [key: string]: number;
  };
  recentActivity: {
    created: number;
    updated: number;
    closed: number;
  };
}

// View-specific ticket interface with computed fields
export interface TicketWithComputed extends Ticket {
  timeElapsed: string;
  isOverdue: boolean;
  assignedToUser?: {
    email: string;
    role: string;
  };
  createdByUser?: {
    email: string;
    role: string;
  };
}

// Dashboard filter state
export interface TicketFilters extends TicketFilterParams {
  assignedToMe: boolean;
}

// Props interface for TicketStats component
export interface TicketStatsProps {
  stats: TicketStats;
  isLoading?: boolean;
  error?: Error | null;
}

// Props interface for TicketDashboard component
export interface TicketDashboardProps {
  tickets: TicketWithComputed[];
  filters: TicketFilters;
  onFilterChange: (filters: Partial<TicketFilters>) => void;
  isLoading?: boolean;
  error?: Error | null;
}

// Admin-specific interfaces
export interface AdminTicketTableProps {
  tickets: TicketWithComputed[];
  filters: TicketFilters;
  onFilterChange: (filters: Partial<TicketFilters>) => void;
  onAssignTicket: (ticketId: string, agentId: string) => Promise<void>;
  onUpdateTicket: (ticketId: string, data: Partial<TicketFormData>) => Promise<void>;
  onDeleteTicket: (ticketId: string) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

export interface AdminTicketModalProps {
  mode: "create" | "edit";
  ticket?: TicketWithComputed;
  onSubmit: (data: TicketFormData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export interface AssignAgentModalProps {
  ticketId: string;
  currentAgentId?: string | null;
  onAssign: (agentId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export interface DeleteTicketDialogProps {
  ticketId: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
} 