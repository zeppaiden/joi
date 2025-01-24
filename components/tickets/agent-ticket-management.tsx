"use client";

import { useState, useCallback, useEffect } from "react";
import { Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
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
import { Card } from "@/components/ui/card";
import { Database } from "@/types/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type User = Database["public"]["Tables"]["users"]["Row"];
type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  customer: User;
  agent: User | null;
  organization: {
    id: string;
    name: string;
  } | null;
};

type SortConfig = {
  key: keyof Ticket;
  direction: "asc" | "desc";
};

type FilterConfig = {
  status: string | null;
  priority: string | null;
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

export function AgentTicketManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "created_at", direction: "desc" });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: null,
    priority: null,
    dateRange: {
      from: undefined,
      to: undefined,
    },
    assignedToFilter: "all",
    customerFilter: "all"
  });
  const supabase = createClient();

  // Load tickets and customers
  const loadData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Load tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:users!tickets_customer_id_fkey (
            id,
            email,
            role
          ),
          agent:users!tickets_assigned_to_fkey (
            id,
            email,
            role
          ),
          organization:organizations (
            id,
            name
          )
        `)
        .eq('assigned_to', currentUser.id)
        .is('deleted_at', null);

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData as any);

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer');

      if (customersError) throw customersError;
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient();

    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Helper function to fetch complete ticket data
      const handleTicketChange = async (payload: any) => {
        const { data: newTicket } = await supabase
          .from('tickets')
          .select(`
            *,
            customer:users!tickets_customer_id_fkey (
              id,
              email,
              role
            ),
            agent:users!tickets_assigned_to_fkey (
              id,
              email,
              role
            ),
            organization:organizations (
              id,
              name
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (newTicket) {
          console.log('Agent Dashboard - Adding new ticket:', newTicket);
          setTickets(current => [newTicket as Ticket, ...current]);
          toast({
            title: "New Ticket Assigned",
            description: `Ticket "${newTicket.title}" has been assigned to you`,
          });
        }
      };

      // Subscribe to both ticket changes and organization membership changes
      const subscriptions = supabase
        .channel('agent-realtime')
        // Organization membership changes
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'organization_members',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('Agent Dashboard - Organization membership removed:', payload);
            
            // Fetch organization details
            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', payload.old.organization_id)
              .single();

            // Remove tickets from this organization
            setTickets(current => {
              const filteredTickets = current.filter(ticket => 
                ticket.organization?.id !== payload.old.organization_id
              );
              console.log('Agent Dashboard - Removing tickets after org removal:', {
                organizationId: payload.old.organization_id,
                removedTickets: current.length - filteredTickets.length
              });
              return filteredTickets;
            });

            // Notify the agent
            toast({
              title: "Organization Access Removed",
              description: `You have been removed from ${org?.name || 'an organization'}`,
              variant: "destructive"
            });
          }
        )
        // Ticket changes (existing subscription)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tickets',
            filter: `assigned_to=eq.${user.id}`
          },
          async (payload) => {
            console.log('Agent Dashboard - New ticket received:', payload);
            await handleTicketChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets'
          },
          async (payload) => {
            console.log('Agent Dashboard - Ticket update received:', {
              old: payload.old,
              new: payload.new,
              wasAssignedToMe: payload.old.assigned_to !== user.id && payload.new.assigned_to === user.id,
              wasUnassignedFromMe: payload.old.assigned_to === user.id && payload.new.assigned_to !== user.id
            });

            // Handle newly assigned tickets
            if (payload.old.assigned_to !== user.id && payload.new.assigned_to === user.id) {
              const { data: newTicket } = await supabase
                .from('tickets')
                .select(`
                  *,
                  customer:users!tickets_customer_id_fkey (
                    id,
                    email,
                    role
                  ),
                  agent:users!tickets_assigned_to_fkey (
                    id,
                    email,
                    role
                  ),
                  organization:organizations (
                    id,
                    name
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (newTicket) {
                console.log('Agent Dashboard - Adding newly assigned ticket:', newTicket);
                setTickets(current => [newTicket as Ticket, ...current]);
                toast({
                  title: "New Ticket Assigned",
                  description: `Ticket "${newTicket.title}" has been assigned to you`,
                });
              }
              return;
            }

            // Handle unassigned tickets
            if (payload.old.assigned_to === user.id && payload.new.assigned_to !== user.id) {
              console.log('Agent Dashboard - Removing unassigned ticket:', payload.new.id);
              setTickets(current => current.filter(ticket => ticket.id !== payload.new.id));
              toast({
                title: "Ticket Unassigned",
                description: "A ticket has been unassigned from you",
              });
              return;
            }

            // Handle regular updates to assigned tickets
            if (payload.new.assigned_to === user.id) {
              const { data: updatedTicket } = await supabase
                .from('tickets')
                .select(`
                  *,
                  customer:users!tickets_customer_id_fkey (
                    id,
                    email,
                    role
                  ),
                  agent:users!tickets_assigned_to_fkey (
                    id,
                    email,
                    role
                  ),
                  organization:organizations (
                    id,
                    name
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (updatedTicket) {
                console.log('Agent Dashboard - Updating existing ticket:', updatedTicket);
                setTickets(current =>
                  current.map(ticket =>
                    ticket.id === updatedTicket.id ? updatedTicket as Ticket : ticket
                  )
                );
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tickets',
            filter: `assigned_to=eq.${user.id}`
          },
          (payload) => {
            console.log('Agent Dashboard - Ticket deletion received:', payload);
            setTickets(current =>
              current.filter(ticket => ticket.id !== payload.old.id)
            );
            toast({
              title: "Ticket Removed",
              description: "A ticket has been deleted",
            });
          }
        )
        .subscribe((status) => {
          console.log('Agent Dashboard - Subscription status:', status);
        });

      return subscriptions;
    };

    // Set up subscription
    let subscription: any;
    getCurrentUser().then(sub => {
      subscription = sub;
    });

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [toast]);

  // Apply filters and sorting to tickets
  const filteredAndSortedTickets = useCallback(() => {
    let filtered = [...tickets];

    // Apply status filter
    if (filterConfig.status) {
      filtered = filtered.filter(ticket => ticket.status === filterConfig.status);
    }

    // Apply priority filter
    if (filterConfig.priority) {
      filtered = filtered.filter(ticket => ticket.priority_level === filterConfig.priority);
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

    // Apply customer filter
    if (filterConfig.customerFilter && filterConfig.customerFilter !== "all") {
      const customerEmail = customers.find(c => c.id === filterConfig.customerFilter)?.email?.toLowerCase();
      filtered = filtered.filter(ticket => 
        customers.find(c => c.id === ticket.customer_id)?.email?.toLowerCase().includes(customerEmail || "")
      );
    }

    // Apply sorting if a column is selected
    if (sortConfig.key !== "created_at") {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Ticket] ?? "";
        let bValue = b[sortConfig.key as keyof Ticket] ?? "";
        
        // Special handling for customer_id (sort by email)
        if (sortConfig.key === "customer_id") {
          const aEmail = customers.find(c => c.id === aValue)?.email?.toLowerCase() ?? "";
          const bEmail = customers.find(c => c.id === bValue)?.email?.toLowerCase() ?? "";
          return aEmail.localeCompare(bEmail) * (sortConfig.direction === "asc" ? 1 : -1);
        }

        // Special handling for priority_level
        if (sortConfig.key === "priority_level") {
          return (PRIORITY_ORDER[aValue as keyof typeof PRIORITY_ORDER] - 
                 PRIORITY_ORDER[bValue as keyof typeof PRIORITY_ORDER]) * (sortConfig.direction === "asc" ? 1 : -1);
        }

        // Special handling for status
        if (sortConfig.key === "status") {
          return (STATUS_ORDER[aValue as keyof typeof STATUS_ORDER] - 
                 STATUS_ORDER[bValue as keyof typeof STATUS_ORDER]) * (sortConfig.direction === "asc" ? 1 : -1);
        }

        // Default string comparison
        return String(aValue).localeCompare(String(bValue)) * (sortConfig.direction === "asc" ? 1 : -1);
      });
    }

    return filtered;
  }, [tickets, filterConfig, sortConfig, customers]);

  // Toggle sort for a column
  const toggleSort = (key: keyof Ticket) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilterConfig({
      status: null,
      priority: null,
      dateRange: {
        from: undefined,
        to: undefined,
      },
      assignedToFilter: "all",
      customerFilter: "all"
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Assigned Tickets</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFilterDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterConfig.status || 
              filterConfig.priority || 
              filterConfig.dateRange.from || 
              filterConfig.dateRange.to ||
              filterConfig.customerFilter) && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
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
                    variant={filterConfig.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterConfig(prev => ({
                      ...prev,
                      status: prev.status === status ? null : status
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
                    variant={filterConfig.priority === priority ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterConfig(prev => ({
                      ...prev,
                      priority: prev.priority === priority ? null : priority
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
                    {sortConfig.key === "title" ? (
                      sortConfig.direction === "asc" ? (
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
            <div className="col-span-3 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Status
                    {sortConfig.key === "status" ? (
                      sortConfig.direction === "asc" ? (
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
                    {sortConfig.key === "priority_level" ? (
                      sortConfig.direction === "asc" ? (
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
                    {sortConfig.key === "customer_id" ? (
                      sortConfig.direction === "asc" ? (
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
                </div>

                {/* Status Display */}
                <div className="col-span-3">
                  <Badge variant={
                    ticket.status === "open" ? "default" :
                    ticket.status === "in_progress" ? "secondary" :
                    ticket.status === "resolved" ? "secondary" :
                    "outline"
                  }>
                    {ticket.status?.replace('_', ' ') || 'unknown'}
                  </Badge>
                </div>

                {/* Priority Display */}
                <div className="col-span-2">
                  <Badge variant={
                    ticket.priority_level === "urgent" ? "destructive" :
                    ticket.priority_level === "high" ? "destructive" :
                    ticket.priority_level === "medium" ? "default" :
                    "secondary"
                  }>
                    {ticket.priority_level}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div className="col-span-2">
                  <span className="text-sm truncate block">
                    {customers.find(c => c.id === ticket.customer_id)?.email || 'Unknown'}
                  </span>
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
    </div>
  );
} 