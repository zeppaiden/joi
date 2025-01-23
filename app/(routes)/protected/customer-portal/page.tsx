import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CustomerCreateTicket } from "@/components/customer/customer-create-ticket";

export default async function CustomerPortalPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/sign-in");
  }

  // Get organizations the customer has access to
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .is('deleted_at', null);

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
    return <div>Error loading organizations</div>;
  }

  // Get user's tickets with organization info
  const { data: tickets, error: ticketsError } = await supabase
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
    .eq('customer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError);
    return <div>Error loading tickets</div>;
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Support Tickets</h1>
        <CustomerCreateTicket userId={user.id} organizations={organizations || []} />
      </div>
      
      <div className="space-y-4">
        {tickets?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tickets found. Create a new ticket to get help.
            </CardContent>
          </Card>
        ) : (
          tickets?.map((ticket) => (
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
    </div>
  );
} 