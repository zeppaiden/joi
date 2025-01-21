"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
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

type User = Database["public"]["Tables"]["users"]["Row"] & {
  role: 'admin' | 'agent' | 'customer';
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
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
    
    // Get agents
    const { data: agentsData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'agent')
      .is('deleted_at', null);
    
    // Get active customers
    const { data: customersData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .is('deleted_at', null);

    // Get tickets with search
    let ticketsQuery = supabase
      .from('tickets')
      .select('*')
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
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ticketId = crypto.randomUUID();
      const customerId = formData.get('customer_id');
      const assignedTo = formData.get('assigned_to');
      const status = formData.get('status') || 'open';
      const priority = formData.get('priority') || 'low';

      if (!customerId) throw new Error("Customer is required");

      const { error } = await supabase.from('tickets').insert({
        id: ticketId,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        status: status as Ticket['status'],
        priority_level: priority as Ticket['priority_level'],
        created_by: user.id,
        assigned_to: assignedTo ? (assignedTo as string) : null,
        customer_id: customerId as string,
      });

      if (error) throw error;

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
      const supabase = createClient();
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
      
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
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
        <div className="divide-y">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 space-y-1 cursor-pointer"
                  onClick={() => router.push(`/protected/tickets/${ticket.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{ticket.title}</h3>
                    <Badge variant={
                      ticket.priority_level === "urgent" ? "destructive" :
                      ticket.priority_level === "high" ? "destructive" :
                      ticket.priority_level === "medium" ? "secondary" :
                      "default"
                    }>
                      {ticket.priority_level}
                    </Badge>
                    <Badge variant={
                      ticket.status === "open" ? "default" :
                      ticket.status === "in_progress" ? "secondary" :
                      ticket.status === "resolved" ? "secondary" :
                      "outline"
                    }>
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Select
                    value={ticket.assigned_to || "unassigned"}
                    onValueChange={(value) => updateTicket(ticket.id, { assigned_to: value === "unassigned" ? null : value })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assign to agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicket(ticket.id, { status: value as Ticket['status'] })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={ticket.priority_level}
                    onValueChange={(value) => updateTicket(ticket.id, { priority_level: value as Ticket['priority_level'] })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[250px]" />
                    <Skeleton className="h-4 w-[350px]" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[150px]" />
                    <Skeleton className="h-10 w-[120px]" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[150px]" />
                    <Skeleton className="h-10 w-[120px]" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
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