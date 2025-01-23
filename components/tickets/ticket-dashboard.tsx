"use client";

import React, { useState, memo, useEffect } from "react";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";
import { TicketWithComputed } from "@/types/tickets";
import { createClient } from "@/utils/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// Memoized ticket row component
const TicketRow = memo(({ ticket }: { ticket: TicketWithComputed }) => (
  <div className="px-6 py-4 hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-4">
      {/* Priority and Status Badges */}
      <div className="flex items-center gap-2 w-48">
        <Badge variant={
          ticket.priority_level === "high" ? "destructive" :
          ticket.priority_level === "medium" ? "secondary" : "default"
        }>
          {ticket.priority_level || "none"}
        </Badge>
        {ticket.isOverdue && (
          <Badge variant="destructive">Overdue</Badge>
        )}
        <Badge variant={
          ticket.status === "open" ? "default" :
          ticket.status === "in_progress" ? "secondary" :
          ticket.status === "closed" ? "outline" : "default"
        }>
          {ticket.status || "none"}
        </Badge>
      </div>

      {/* Ticket Title and Description */}
      <div className="flex-1">
        <h3 className="text-sm font-medium">{ticket.title}</h3>
        <p className="text-sm text-muted-foreground">
          Created {ticket.timeElapsed}
        </p>
      </div>

      {/* Ticket Creator */}
      <div className="flex items-center gap-2 w-48">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${
          ticket.isOverdue ? 'border-destructive' : ''
        }`}>
          <span className="text-sm font-medium">
            {ticket.created_by.substring(0, 2).toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-muted-foreground truncate">
          {ticket.created_by}
        </span>
      </div>
    </div>
  </div>
));

TicketRow.displayName = "TicketRow";

// Loading skeleton for dashboard
function DashboardLoading() {
  return (
    <Card>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Error display component with retry
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card className="p-6">
      <Alert variant="destructive" className="mb-0">
        <div className="flex items-center justify-between w-full">
          <AlertDescription>
            Failed to load tickets: {error.message}
          </AlertDescription>
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-destructive-foreground text-destructive rounded-md hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </Alert>
    </Card>
  );
}

export function TicketDashboard() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [tickets, setTickets] = useState<TicketWithComputed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [filters, setFilters] = useState<{
    status: string[];
    priority: string[];
    assignedToMe: boolean;
    searchQuery: string;
  }>({
    status: [],
    priority: [],
    assignedToMe: true,
    searchQuery: searchQuery
  });

  // Fetch tickets function
  async function loadTickets(isRetry = false) {
    try {
      if (!isRetry) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      // Start with base query
      let query = supabase
        .from("tickets")
        .select("*")
        .is("deleted_at", null);
      
      // Apply filters
      if (filters.assignedToMe) {
        query = query.eq("assigned_to", user.id);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters.priority && filters.priority.length > 0) {
        query = query.in("priority_level", filters.priority);
      }
      if (filters.searchQuery) {
        query = query.ilike("title", `%${filters.searchQuery}%`);
      }

      const { data: fetchedTickets, error: ticketsError } = await query.order("created_at", { ascending: false });
      if (ticketsError) throw ticketsError;

      // Add computed fields
      const processedTickets = (fetchedTickets || []).map(ticket => ({
        ...ticket,
        timeElapsed: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
        isOverdue: ticket.status !== "closed" && new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }));

      setTickets(processedTickets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch tickets"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  // Initial load and filter changes
  useEffect(() => {
    loadTickets();
  }, [filters]);

  // Update search query when URL param changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      searchQuery
    }));
  }, [searchQuery]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const toggleFilter = (type: "status" | "priority", value: string) => {
    setFilters(prev => {
      const currentValues = prev[type];
      const newValues = currentValues && currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...(currentValues || []), value];
      
      return {
        ...prev,
        [type]: newValues
      };
    });
  };

  const getFilterButtonStyle = (type: "status" | "priority", value: string) => {
    const isActive = filters[type] && filters[type]?.includes(value);
    return `flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-secondary" : "bg-muted text-muted-foreground"
    }`;
  };

  if (error) {
    return <DashboardError error={error} onRetry={() => loadTickets(true)} />;
  }

  if (isLoading) {
    return <DashboardLoading />;
  }

  return (
    <Card>
      {/* Filters Section */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Tickets</h2>
          {isRefreshing && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, assignedToMe: !prev.assignedToMe }))}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.assignedToMe ? "bg-secondary" : "bg-muted text-muted-foreground"
            }`}
          >
            Assigned to me
          </button>
          {["open", "in_progress", "closed"].map(status => (
            <button
              key={status}
              onClick={() => toggleFilter("status", status)}
              className={getFilterButtonStyle("status", status)}
            >
              {status.replace("_", " ")}
            </button>
          ))}
          {["low", "medium", "high"].map(priority => (
            <button
              key={priority}
              onClick={() => toggleFilter("priority", priority)}
              className={getFilterButtonStyle("priority", priority)}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      {/* Table Headers */}
      <div className="px-6 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="w-48 text-sm font-medium text-muted-foreground">Status & Priority</div>
          <div className="flex-1 text-sm font-medium text-muted-foreground">Ticket Details</div>
          <div className="w-48 text-sm font-medium text-muted-foreground">Created By</div>
        </div>
      </div>

      {/* Tickets List */}
      <div
        ref={parentRef}
        className="divide-y max-h-[600px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TicketRow ticket={tickets[virtualRow.index]} />
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {tickets.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p>No tickets found</p>
        </div>
      )}
    </Card>
  );
}
