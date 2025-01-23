"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/supabase";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  organizations?: Organization | null;
};

interface CustomerDashboardProps {
  tickets: Ticket[];
  organizations: Organization[];
  userId: string;
}

export function CustomerDashboard({ tickets, organizations, userId }: CustomerDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create ticket
  const createTicket = async (formData: FormData) => {
    setIsLoading(true);
    try {
      console.log('Starting ticket creation process');
      const supabase = createClient();
      
      const organizationId = formData.get('organization_id');
      const title = formData.get('title');
      const description = formData.get('description');
      
      console.log('Collected form data:', {
        organizationId,
        title,
        description,
        userId
      });

      if (!organizationId) throw new Error("Organization is required");
      if (!title) throw new Error("Title is required");

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          id: crypto.randomUUID(),
          title: title as string,
          description: description as string,
          priority_level: 'low',
          status: 'open',
          customer_id: userId,
          created_by: userId,
          organization_id: organizationId as string
        })
        .select()
        .single();

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
      router.refresh();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Tickets</h2>
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
            <div className="col-span-4 text-sm font-medium text-muted-foreground">Ticket Details</div>
            <div className="col-span-3 text-sm font-medium text-muted-foreground">Organization</div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">Status</div>
            <div className="col-span-3 text-sm font-medium text-muted-foreground">Priority</div>
          </div>
        </div>

        <div className="divide-y">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/protected/tickets/${ticket.id}`)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Ticket Title and Description */}
                <div className="col-span-4 space-y-1">
                  <h3 className="font-medium truncate">{ticket.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.description}
                  </p>
                </div>

                {/* Organization */}
                <div className="col-span-3">
                  <span className="text-sm">
                    {ticket.organizations?.name || 'Unknown Organization'}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Badge variant={
                    ticket.status === "open" ? "default" :
                    ticket.status === "in_progress" ? "secondary" :
                    ticket.status === "resolved" ? "secondary" :
                    "outline"
                  }>
                    {ticket.status?.replace('_', ' ') || 'unknown'}
                  </Badge>
                </div>

                {/* Priority */}
                <div className="col-span-3">
                  <Badge variant={
                    ticket.priority_level === "urgent" || ticket.priority_level === "high"
                      ? "destructive"
                      : ticket.priority_level === "medium"
                      ? "secondary"
                      : "default"
                  }>
                    {ticket.priority_level || 'none'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {tickets.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              No tickets found
            </div>
          )}
        </div>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Submit a new support request to an organization
            </DialogDescription>
          </DialogHeader>
          
          <form action={createTicket}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="organization">Organization</label>
                <Select name="organization_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="title">Title</label>
                <Input id="title" name="title" required />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description">Description</label>
                <Textarea id="description" name="description" required />
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
    </div>
  );
} 