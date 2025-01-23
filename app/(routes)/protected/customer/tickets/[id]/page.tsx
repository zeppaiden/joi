import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerTicketChat } from "@/components/customer/customer-ticket-chat";

export default async function CustomerTicketPage({
  params,
}: {
  params: { id: string }
}) {
  // Properly await params before accessing properties
  const { id } = await params;
  const supabase = await createClient();

  // Get current user using the secure method
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return notFound();
  }

  // Get ticket with organization and agent details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      organizations (
        id,
        name
      ),
      agent:users!tickets_assigned_to_fkey (
        id,
        email,
        role
      )
    `)
    .eq('id', id)
    .single();

  if (ticketError || !ticket) {
    return notFound();
  }

  // Get messages for this ticket
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      user:users!messages_user_id_fkey (
        id,
        email,
        role
      )
    `)
    .eq('ticket_id', id)
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
                {ticket.status?.replace('_', ' ') || 'unknown'}
              </Badge>
              {ticket.agent && (
                <p className="text-sm text-muted-foreground">
                  Agent: {ticket.agent.email}
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