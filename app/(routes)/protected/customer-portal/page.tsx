import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CustomerCreateTicket } from "@/components/customer/customer-create-ticket";
import { CustomerTicketList } from "@/components/customer/customer-ticket-list";

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
      
      <CustomerTicketList initialTickets={tickets || []} />
    </div>
  );
} 