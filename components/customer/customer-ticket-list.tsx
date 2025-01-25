"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerTicketListProps {
  initialTickets: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_at: string;
    customer_id: string;
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
  const [tickets, setTickets] = useState(initialTickets);
  const { toast } = useToast();
  const supabaseClient = createClient();

  // console.log('CustomerTicketList - Initial Mount:', {
  //   initialTicketCount: initialTickets.length,
  //   tickets: initialTickets.map(t => ({
  //     id: t.id,
  //     title: t.title,
  //     customer_id: t.customer_id,
  //     created_at: t.created_at
  //   }))
  // });

  // Set up real-time subscription
  useEffect(() => {
    // console.log('CustomerTicketList - Setting up subscription');
    
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error) {
        console.error('CustomerTicketList - Auth Error:', error);
        return;
      }
      if (!user) {
        console.error('CustomerTicketList - No user found');
        return;
      }

      // console.log('CustomerTicketList - Client Auth User:', {
      //   userId: user.id,
      //   email: user.email
      // });

      // Subscribe to ticket changes for the current customer
      // console.log('CustomerTicketList - Creating subscription with config:', {
      //   channel: 'customer-tickets',
      //   event: '*',
      //   schema: 'public',
      //   table: 'tickets',
      //   filter: `customer_id=eq.${user.id}`
      // });

      const ticketSubscription = supabaseClient
        .channel('customer-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets',
            filter: `customer_id=eq.${user.id}`
          },
          async (payload: any) => {
            // console.log('CustomerTicketList - Ticket change received:', {
            //   eventType: payload.eventType,
            //   old: payload.old,
            //   new: payload.new
            // });

            // Handle different types of changes
            switch (payload.eventType) {
              case 'INSERT': {
                // Fetch the complete ticket data including relations
                // console.log('CustomerTicketList - Fetching new ticket details:', payload.new.id);
                const { data: newTicket, error: fetchError } = await supabaseClient
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
                    )
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (fetchError) {
                  console.error('CustomerTicketList - Error fetching new ticket:', fetchError);
                  return;
                }

                if (newTicket) {
                  // console.log('CustomerTicketList - Adding new ticket to state:', newTicket);
                  setTickets(current => [newTicket, ...current]);
                  toast({
                    title: "New Ticket Created",
                    description: `A new ticket "${newTicket.title}" has been created`,
                  });
                }
                break;
              }
              
              case 'UPDATE': {
                // console.log('CustomerTicketList - Processing ticket update:', {
                //   ticketId: payload.new.id,
                //   oldStatus: payload.old?.status,
                //   newStatus: payload.new?.status,
                //   wasDeleted: !payload.old?.deleted_at && payload.new?.deleted_at
                // });

                // Handle soft deletion
                if (!payload.old?.deleted_at && payload.new?.deleted_at) {
                  // console.log('CustomerTicketList - Handling soft deletion:', payload.new.id);
                  setTickets(current => {
                    const filteredTickets = current.filter(ticket => ticket.id !== payload.new.id);
                    // console.log('CustomerTicketList - After soft deletion:', {
                    //   removedId: payload.new.id,
                    //   previousCount: current.length,
                    //   newCount: filteredTickets.length
                    // });
                    return filteredTickets;
                  });

                  toast({
                    title: "Ticket Removed",
                    description: "This ticket has been deleted.",
                  });
                  return;
                }

                // Handle regular updates
                const { data: updatedTicket, error: updateError } = await supabaseClient
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
                    )
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (updateError) {
                  console.error('CustomerTicketList - Error fetching updated ticket:', updateError);
                  return;
                }

                if (updatedTicket) {
                  // console.log('CustomerTicketList - Applying ticket update:', updatedTicket);
                  setTickets(current =>
                    current.map(ticket =>
                      ticket.id === updatedTicket.id ? updatedTicket : ticket
                    )
                  );

                  if (payload.old?.status !== payload.new?.status) {
                    toast({
                      title: "Ticket Status Updated",
                      description: `Status changed from ${payload.old?.status || 'unset'} to ${payload.new?.status}`,
                    });
                  }
                }
                break;
              }

              case 'DELETE': {
                // console.log('CustomerTicketList - Processing ticket deletion:', {
                //   ticketId: payload.old?.id
                // });

                setTickets(current => {
                  const filteredTickets = current.filter(ticket => ticket.id !== payload.old?.id);
                  // console.log('CustomerTicketList - After deletion:', {
                  //   removedId: payload.old?.id,
                  //   previousCount: current.length,
                  //   newCount: filteredTickets.length
                  // });
                  return filteredTickets;
                });

                toast({
                  title: "Ticket Removed",
                  description: "This ticket has been deleted.",
                });
                break;
              }
            }
          }
        )
        .subscribe((_status) => {
          // console.log('CustomerTicketList - Subscription status:', status);

        });

      return ticketSubscription;
    };

    // Set up subscription
    let subscription: any;
    getCurrentUser().then(sub => {
      subscription = sub;
      // console.log('CustomerTicketList - Subscription established');
    }).catch(_error => {
      // console.error('CustomerTicketList - Error setting up subscription:', error);
    });

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        // console.log('CustomerTicketList - Cleaning up subscription');
        supabaseClient.removeChannel(subscription);
      }
    };
  }, [toast]);
  
  const filteredTickets = tickets.filter(ticket => {
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