"use client";

import React, { useState, memo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";

type Priority = "High" | "Medium" | "Low";
type Ticket = {
  id: string;
  subject: string;
  status: Priority;
  customer: string;
  time: string;
};

interface TicketDashboardProps {
  tickets: Ticket[];
}

type PriorityFilter = {
  [K in Lowercase<Priority>]: boolean;
};

const TicketRow = memo(({ ticket }: { ticket: Ticket }) => (
  <div className="px-6 py-4 hover:opacity-90">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full flex items-center justify-center border">
            <span className="text-sm font-medium">
              {ticket.customer
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium">{ticket.subject}</h3>
          <p className="text-sm opacity-70">
            {ticket.customer} • {ticket.time}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border">
        {ticket.status}
      </span>
    </div>
  </div>
));

TicketRow.displayName = "TicketRow";

export function TicketDashboard({ tickets }: TicketDashboardProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [priorityFilters, setPriorityFilters] = useState<PriorityFilter>({
    high: true,
    medium: true,
    low: true,
  });

  const filteredTickets = tickets.filter((ticket) => {
    const matchesPriority =
      (ticket.status === "High" && priorityFilters.high) ||
      (ticket.status === "Medium" && priorityFilters.medium) ||
      (ticket.status === "Low" && priorityFilters.low);

    const matchesSearch = searchQuery
      ? ticket.subject.toLowerCase().includes(searchQuery) ||
        ticket.customer.toLowerCase().includes(searchQuery)
      : true;

    return matchesPriority && matchesSearch;
  });

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredTickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Approximate height of each row
    overscan: 5,
  });

  const togglePriority = (priority: Priority) => {
    setPriorityFilters((prev) => ({
      ...prev,
      [priority.toLowerCase() as Lowercase<Priority>]:
        !prev[priority.toLowerCase() as Lowercase<Priority>],
    }));
  };

  const getPriorityButtonStyle = (priority: Priority) => {
    const baseStyle =
      "flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";
    const activeStyle = priorityFilters[
      priority.toLowerCase() as Lowercase<Priority>
    ]
      ? "bg-secondary"
      : "bg-muted text-muted-foreground";
    return `${baseStyle} ${activeStyle}`;
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tickets</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => togglePriority("High")}
              className={getPriorityButtonStyle("High")}
            >
              <AlertCircle className="w-4 h-4 mr-1.5" />
              High Priority
            </button>
            <button
              onClick={() => togglePriority("Medium")}
              className={getPriorityButtonStyle("Medium")}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Medium Priority
            </button>
            <button
              onClick={() => togglePriority("Low")}
              className={getPriorityButtonStyle("Low")}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Low Priority
            </button>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Recent Tickets</h2>
        </div>
        <div ref={parentRef} className="divide-y max-h-[600px] overflow-auto">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={filteredTickets[virtualRow.index].id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TicketRow ticket={filteredTickets[virtualRow.index]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
