"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Filter, ArrowUpDown, X, ArrowUp, ArrowDown, ListChecks, Paperclip } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

type SortConfig = {
  column: keyof Ticket | "";
  direction: number;  // 1 for ascending, -1 for descending
};

type FilterConfig = {
  status: string[];
  priority: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  assignedToFilter: "all" | "assigned" | "unassigned";
  customerFilter: string;
};

// Priority order map for sorting
const PRIORITY_ORDER = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3
};

// Status order map for sorting
const STATUS_ORDER = {
  closed: 0,
  resolved: 1,
  in_progress: 2,
  open: 3
};

export function AdminTicketManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "",
    direction: 1
  });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: [],
    priority: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
    assignedToFilter: "all",
    customerFilter: "all",
  });

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

  // Apply filters and sorting to tickets
  const filteredAndSortedTickets = useCallback(() => {
    let filtered = [...tickets];

    // Apply status filter
    if (filterConfig.status.length > 0) {
      filtered = filtered.filter(ticket => filterConfig.status.includes(ticket.status));
    }

    // Apply priority filter
    if (filterConfig.priority.length > 0) {
      filtered = filtered.filter(ticket => filterConfig.priority.includes(ticket.priority_level));
    }

    // Apply date range filter
    if (filterConfig.dateRange.from || filterConfig.dateRange.to) {
      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.created_at);
        const isAfterFrom = !filterConfig.dateRange.from || ticketDate >= filterConfig.dateRange.from;
        const isBeforeTo = !filterConfig.dateRange.to || ticketDate <= filterConfig.dateRange.to;
        return isAfterFrom && isBeforeTo;
      });
    }

    // Apply assignment filter
    if (filterConfig.assignedToFilter !== "all") {
      filtered = filtered.filter(ticket => 
        filterConfig.assignedToFilter === "assigned" ? ticket.assigned_to : !ticket.assigned_to
      );
    }

    // Apply customer filter
    if (filterConfig.customerFilter && filterConfig.customerFilter !== "all") {
      const customerEmail = customers.find(c => c.id === filterConfig.customerFilter)?.email?.toLowerCase();
      filtered = filtered.filter(ticket => 
        customers.find(c => c.id === ticket.customer_id)?.email?.toLowerCase().includes(customerEmail || "")
      );
    }

    // Apply sorting if a column is selected
    if (sortConfig.column !== "") {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.column as keyof Ticket] ?? "";
        let bValue = b[sortConfig.column as keyof Ticket] ?? "";
        
        // Special handling for customer_id (sort by email)
        if (sortConfig.column === "customer_id") {
          const aEmail = customers.find(c => c.id === aValue)?.email?.toLowerCase() ?? "";
          const bEmail = customers.find(c => c.id === bValue)?.email?.toLowerCase() ?? "";
          return aEmail.localeCompare(bEmail) * sortConfig.direction;
        }

        // Special handling for priority_level
        if (sortConfig.column === "priority_level") {
          return (PRIORITY_ORDER[aValue as keyof typeof PRIORITY_ORDER] - 
                 PRIORITY_ORDER[bValue as keyof typeof PRIORITY_ORDER]) * sortConfig.direction;
        }

        // Special handling for status
        if (sortConfig.column === "status") {
          return (STATUS_ORDER[aValue as keyof typeof STATUS_ORDER] - 
                 STATUS_ORDER[bValue as keyof typeof STATUS_ORDER]) * sortConfig.direction;
        }

        // Default string comparison
        return String(aValue).localeCompare(String(bValue)) * sortConfig.direction;
      });
    }

    return filtered;
  }, [tickets, filterConfig, sortConfig, customers]);

  // Toggle sort for a column
  const toggleSort = (column: keyof Ticket) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 1 ? -1 : 1
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilterConfig({
      status: [],
      priority: [],
      dateRange: {
        from: undefined,
        to: undefined,
      },
      assignedToFilter: "all",
      customerFilter: "all"
    });
  };

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFilterDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterConfig.status.length > 0 || 
              filterConfig.priority.length > 0 || 
              filterConfig.dateRange.from || 
              filterConfig.dateRange.to ||
              filterConfig.assignedToFilter !== "all" ||
              filterConfig.customerFilter) && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filter Tickets</DialogTitle>
            <DialogDescription>
              Set filters to narrow down the ticket list
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-2">
                {["open", "in_progress", "resolved", "closed"].map(status => (
                  <Button
                    key={status}
                    variant={filterConfig.status.includes(status) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterConfig(prev => ({
                      ...prev,
                      status: prev.status.includes(status)
                        ? prev.status.filter(s => s !== status)
                        : [...prev.status, status]
                    }))}
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex flex-wrap gap-2">
                {["low", "medium", "high", "urgent"].map(priority => (
                  <Button
                    key={priority}
                    variant={filterConfig.priority.includes(priority) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterConfig(prev => ({
                      ...prev,
                      priority: prev.priority.includes(priority)
                        ? prev.priority.filter(p => p !== priority)
                        : [...prev.priority, priority]
                    }))}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filterConfig.dateRange.from && "text-muted-foreground"
                      )}
                    >
                      {filterConfig.dateRange.from ? (
                        format(filterConfig.dateRange.from, "PPP")
                      ) : (
                        "From date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterConfig.dateRange.from}
                      onSelect={(date) =>
                        setFilterConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, from: date }
                        }))
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filterConfig.dateRange.to && "text-muted-foreground"
                      )}
                    >
                      {filterConfig.dateRange.to ? (
                        format(filterConfig.dateRange.to, "PPP")
                      ) : (
                        "To date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterConfig.dateRange.to}
                      onSelect={(date) =>
                        setFilterConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, to: date }
                        }))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Assignment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Status</label>
              <Select
                value={filterConfig.assignedToFilter}
                onValueChange={(value: "all" | "assigned" | "unassigned") =>
                  setFilterConfig(prev => ({ ...prev, assignedToFilter: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tickets</SelectItem>
                  <SelectItem value="assigned">Assigned tickets</SelectItem>
                  <SelectItem value="unassigned">Unassigned tickets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select
                value={filterConfig.customerFilter}
                onValueChange={(value) =>
                  setFilterConfig(prev => ({ ...prev, customerFilter: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tickets List */}
      <Card>
        {/* Table Headers */}
        <div className="px-6 py-3 border-b bg-muted/50">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort("title")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Title
                    {sortConfig.column === "title" ? (
                      sortConfig.direction === 1 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Status
                    {sortConfig.column === "status" ? (
                      sortConfig.direction === 1 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort("priority_level")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Priority
                    {sortConfig.column === "priority_level" ? (
                      sortConfig.direction === 1 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort("customer_id")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Customer
                    {sortConfig.column === "customer_id" ? (
                      sortConfig.direction === 1 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="col-span-1 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-end p-4 border-b">
                Actions
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y">
          {filteredAndSortedTickets().map((ticket) => (
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
        {filteredAndSortedTickets().length === 0 && (
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