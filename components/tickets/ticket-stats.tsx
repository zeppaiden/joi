"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/ui/loading-state";
import { TicketStats as TicketStatsType } from "@/types/tickets";

// Loading skeleton for stats
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-background/50" />
        </Card>
      ))}
    </div>
  );
}

// Error display component
function StatsError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mb-6">
      <div className="flex items-center justify-between w-full">
        <AlertDescription>
          Failed to load ticket statistics: {error.message}
        </AlertDescription>
        <button
          onClick={onRetry}
          className="px-3 py-1 text-sm bg-destructive-foreground text-destructive rounded-md hover:opacity-90"
        >
          Retry
        </button>
      </div>
    </Alert>
  );
}

// Stats display component
function StatsDisplay({ stats }: { stats: TicketStatsType }) {
  const statCards = [
    {
      title: "Total Tickets",
      value: stats.total,
      detail: `${stats.recentActivity.created} new today`
    },
    {
      title: "Open",
      value: stats.byStatus["open"] || 0,
      detail: `${stats.recentActivity.updated} updated today`
    },
    {
      title: "High Priority",
      value: stats.byPriority["high"] || 0,
      detail: "Needs immediate attention"
    },
    {
      title: "Closed Today",
      value: stats.recentActivity.closed,
      detail: "In the last 24 hours"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="transition-all hover:shadow-md">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </h3>
            <p className="text-2xl font-semibold mt-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stat.detail}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main component with data fetching
export function TicketStats() {
  const [stats, setStats] = useState<TicketStatsType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadStats(isRetry = false) {
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

      // Get all active tickets for the agent
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("assigned_to", user.id)
        .is("deleted_at", null);

      if (ticketsError) throw ticketsError;

      // Calculate stats
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const calculatedStats: TicketStatsType = {
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
        calculatedStats.byStatus[ticket.status || "unknown"] = 
          (calculatedStats.byStatus[ticket.status || "unknown"] || 0) + 1;
        
        // Count by priority
        calculatedStats.byPriority[ticket.priority_level || "unknown"] = 
          (calculatedStats.byPriority[ticket.priority_level || "unknown"] || 0) + 1;
        
        // Count recent activity
        const createdAt = new Date(ticket.created_at);
        const updatedAt = new Date(ticket.updated_at);
        
        if (createdAt >= oneDayAgo) calculatedStats.recentActivity.created++;
        if (updatedAt >= oneDayAgo) calculatedStats.recentActivity.updated++;
        if (ticket.status === "closed" && updatedAt >= oneDayAgo) calculatedStats.recentActivity.closed++;
      });

      setStats(calculatedStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stats"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  if (error) {
    return <StatsError error={error} onRetry={() => loadStats(true)} />;
  }

  if (isLoading || !stats) {
    return <StatsLoading />;
  }

  return (
    <div className="relative">
      <StatsDisplay stats={stats} />
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <LoadingState message="Refreshing..." />
        </div>
      )}
    </div>
  );
}
