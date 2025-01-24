"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";

interface CustomerTicketListProps {
  initialTickets: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_at: string;
    organizations: {
      id: string;
      name: string;
    } | null;
    assigned_to: {
      id: string;
      email: string;
    } | null;
  }>;
}

export function CustomerTicketList({ initialTickets }: CustomerTicketListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredTickets = initialTickets.filter(ticket => {
    const searchLower = searchQuery.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.description?.toLowerCase().includes(searchLower) ||
      ticket.organizations?.name.toLowerCase().includes(searchLower) ||
      ticket.status?.toLowerCase().includes(searchLower) ||
      ticket.assigned_to?.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tickets..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery ? "No tickets found matching your search." : "No tickets found. Create a new ticket to get help."}
          </CardContent>
        </Card>
      ) : (
        filteredTickets.map((ticket) => (
          <Link 
            key={ticket.id} 
            href={`/protected/customer/tickets/${ticket.id}`}
            className="block"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{ticket.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.organizations?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={
                      !ticket.status ? "default" :
                      ticket.status === "open" ? "default" :
                      ticket.status === "in_progress" ? "secondary" :
                      ticket.status === "resolved" ? "secondary" :
                      "outline"
                    }>
                      {(ticket.status || 'open').replace('_', ' ')}
                    </Badge>
                    {ticket.assigned_to && (
                      <p className="text-sm text-muted-foreground">
                        Agent: {ticket.assigned_to.email}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ticket.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(ticket.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
} 