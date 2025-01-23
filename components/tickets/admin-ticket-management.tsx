"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";

type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

type User = Database["public"]["Tables"]["users"]["Row"] & {
  role: 'admin' | 'agent' | 'customer';
  organization_members?: OrganizationMember[];
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  organizations?: Organization;
};

export function AdminTicketManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load users and tickets
  const loadData = useCallback(async () => {
    const supabase = createClient();
    const searchQuery = searchParams.get("q")?.toLowerCase() || "";

    // First, get the organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .is('deleted_at', null)
      .single();

    if (orgData) {
      // Update tickets with null organization_id
      const { data: ticketsToUpdate } = await supabase
        .from('tickets')
        .select('id')
        .is('organization_id', null)
        .is('deleted_at', null);

      if (ticketsToUpdate && ticketsToUpdate.length > 0) {
        console.log('Updating tickets with organization ID:', {
          organizationId: orgData.id,
          ticketCount: ticketsToUpdate.length
        });

        const { error: updateError } = await supabase
          .from('tickets')
          .update({ organization_id: orgData.id })
          .is('organization_id', null)
          .is('deleted_at', null);

        if (updateError) {
          console.error('Error updating tickets:', updateError);
        } else {
          console.log('Successfully updated tickets with organization ID');
        }
      }
    }
    
    // Get agents and admins with their organization memberships
    const { data: agentsData } = await supabase
      .from('users')
      .select(`
        *,
        organization_members!inner(
          organization_id
        )
      `)
      .in('role', ['agent', 'admin'])
      .is('deleted_at', null);
    
    // Get active customers
    const { data: customersData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .is('deleted_at', null);

    // Get tickets with their organization info
    let ticketsQuery = supabase
      .from('tickets')
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .is('deleted_at', null);
    
    // Apply search filter if query exists
    if (searchQuery) {
      ticketsQuery = ticketsQuery.ilike('title', `%${searchQuery}%`);
    }

    const { data: ticketsData } = await ticketsQuery.order('created_at', { ascending: false });

    if (agentsData) setAgents(agentsData as User[]);
    if (customersData) setCustomers(customersData as User[]);
    if (ticketsData) setTickets(ticketsData as Ticket[]);
  }, [searchParams]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create ticket
  const createTicket = async (formData: FormData) => {
    setIsLoading(true);
    try {
      console.log('Starting ticket creation process');
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting current user:', userError);
        throw userError;
      }
      if (!user) throw new Error("Not authenticated");

      // Get organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .is('deleted_at', null)
        .single();

      if (orgError) {
        console.error('Error getting organization:', orgError);
        throw orgError;
      }
      if (!orgData) throw new Error("No organization found");

      const ticketId = crypto.randomUUID();
      const customerId = formData.get('customer_id');
      const assignedTo = formData.get('assigned_to');
      const status = formData.get('status') || 'open';
      const priority = formData.get('priority') || 'low';
      const title = formData.get('title');
      const description = formData.get('description');

      console.log('Collected form data:', {
        ticketId,
        customerId,
        assignedTo,
        status,
        priority,
        title,
        description,
        organizationId: orgData.id,
        createdBy: user.id
      });

      if (!customerId) throw new Error("Customer is required");
      if (!title) throw new Error("Title is required");

      const { data, error } = await supabase.from('tickets').insert({
        id: ticketId,
        title: title as string,
        description: description as string,
        status: status as Ticket['status'],
        priority_level: priority as Ticket['priority_level'],
        created_by: user.id,
        assigned_to: assignedTo ? (assignedTo as string) : null,
        customer_id: customerId as string,
        organization_id: orgData.id
      }).select().single();

      if (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }

      console.log('Ticket created successfully:', data);

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
      
      setIsCreateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update ticket
  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    setIsLoading(true);
    try {
      console.log('Updating ticket:', { ticketId, updates });
      const supabase = createClient();
      
      // Validate the updates
      if ('assigned_to' in updates) {
        console.log('Updating ticket assignment:', {
          currentValue: tickets.find(t => t.id === ticketId)?.assigned_to,
          newValue: updates.assigned_to
        });
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating ticket:', error);
        throw error;
      }

      console.log('Ticket updated successfully:', data);

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to update ticket: ${error.message}`
          : "Failed to update ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete ticket (soft delete)
  const deleteTicket = async (ticketId: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tickets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ticket Management</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Tickets List */}
      <Card>
        {/* Table Headers */}
        <div className="px-6 py-3 border-b bg-muted/50">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5 text-sm font-medium text-muted-foreground">Ticket Details</div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">Status</div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">Priority</div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">Customer</div>
            <div className="col-span-1 text-sm font-medium text-muted-foreground text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Ticket Title and Description */}
                <div 
                  className="col-span-5 space-y-1 cursor-pointer"
                  onClick={() => router.push(`/protected/tickets/${ticket.id}`)}
                >
                  <h3 className="font-medium truncate">{ticket.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Select
                      value={ticket.assigned_to || "unassigned"}
                      onValueChange={(value) => {
                        console.log('Assigning ticket:', {
                          ticketId: ticket.id,
                          currentAssignee: ticket.assigned_to,
                          newAssignee: value
                        });
                        updateTicket(ticket.id, { 
                          assigned_to: value === "unassigned" ? null : value 
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-[200px]">
                        <SelectValue placeholder="Assign agent">
                          {ticket.assigned_to 
                            ? agents.find(a => a.id === ticket.assigned_to)?.email || 'Unknown Agent'
                            : 'Unassigned'
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {(() => {
                          console.log('Ticket organization:', {
                            ticketId: ticket.id,
                            organizationId: ticket.organization_id,
                            organizations: ticket.organizations
                          });
                          console.log('Available agents:', agents.map(a => ({
                            email: a.email,
                            role: a.role,
                            orgMembers: a.organization_members
                          })));
                          
                          const filteredAgents = agents.filter(agent => {
                            const isMember = agent.organization_members?.some(
                              (member: OrganizationMember) => member.organization_id === ticket.organization_id
                            );
                            console.log('Agent membership check:', {
                              email: agent.email,
                              role: agent.role,
                              isMember,
                              orgMembers: agent.organization_members,
                              ticketOrgId: ticket.organization_id
                            });
                            return isMember;
                          });

                          console.log('Filtered agents:', filteredAgents.map(a => ({
                            email: a.email,
                            role: a.role
                          })));

                          return filteredAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.email} ({agent.role})
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Select */}
                <div className="col-span-2">
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicket(ticket.id, { 
                      status: value as Ticket['status'] 
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Select */}
                <div className="col-span-2">
                  <Select
                    value={ticket.priority_level}
                    onValueChange={(value) => updateTicket(ticket.id, { 
                      priority_level: value as Ticket['priority_level'] 
                    })}
                  >
                    <SelectTrigger className={`h-9 ${
                      ticket.priority_level === "urgent" || ticket.priority_level === "high"
                        ? "text-destructive border-destructive"
                        : ""
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Info */}
                <div className="col-span-2">
                  <span className="text-sm truncate block">
                    {customers.find(c => c.id === ticket.customer_id)?.email || 'Unknown'}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicket(ticket);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {tickets.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            No tickets found
          </div>
        )}
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket and assign it to an agent.
            </DialogDescription>
          </DialogHeader>
          
          <form action={createTicket}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title">Title</label>
                <Input id="title" name="title" required />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description">Description</label>
                <Textarea id="description" name="description" required />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="customer">Customer</label>
                <Select name="customer_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="agent">Assign to Agent</label>
                <Select name="assigned_to">
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="status">Status</label>
                  <Select name="status" defaultValue="open">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="priority">Priority</label>
                  <Select name="priority" defaultValue="low">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the ticket. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTicket && deleteTicket(selectedTicket.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 