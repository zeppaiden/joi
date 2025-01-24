"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

interface Organization {
  id: string;
  name: string;
}

interface CustomerCreateTicketProps {
  userId: string;
  organizations: Organization[];
}

export function CustomerCreateTicket({ userId, organizations }: CustomerCreateTicketProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createTicket = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const organizationId = formData.get('organization_id') as string;
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          id: crypto.randomUUID(),
          customer_id: userId,
          created_by: userId,
          organization_id: organizationId,
          title: title,
          description: description,
          status: 'open',
          priority_level: 'low'
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        toast({
          title: 'Error',
          description: 'There was an error creating the ticket. Please try again later.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Ticket Created',
          description: 'Your ticket has been created successfully!'
        });
        setIsCreateDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'There was an error creating the ticket. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Create Ticket
      </Button>

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
    </>
  );
} 