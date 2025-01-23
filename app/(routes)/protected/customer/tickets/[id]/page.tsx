import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerTicketChat } from "@/components/customer/customer-ticket-chat";

interface Props {
  params: {
    id: string;
  };
}

export default async function CustomerTicketPage({ params }: Props) {
  const supabase = await createClient();

  // Get ticket with organization and agent details
  const { data: ticket, error } = await supabase
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
    .eq('id', params.id)
    .single();

  if (error || !ticket) {
    notFound();
  }

  // Get initial messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      user:users (
        id,
        email,
        role
      )
    `)
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
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
                ticket.status === "open" ? "default" :
                ticket.status === "in_progress" ? "secondary" :
                ticket.status === "resolved" ? "secondary" :
                "outline"
              }>
                {ticket.status.replace('_', ' ')}
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
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
          
          <CustomerTicketChat 
            ticket={ticket} 
            initialMessages={messages || []} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 