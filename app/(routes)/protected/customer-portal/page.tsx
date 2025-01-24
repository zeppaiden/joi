import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CustomerCreateTicket } from "@/components/customer/customer-create-ticket";
import { CustomerTicketList } from "@/components/customer/customer-ticket-list";

export default async function CustomerPortalPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Customer Portal - Auth Error:', userError);
    redirect("/sign-in");
  }

  console.log('Customer Portal - Server Auth User:', {
    userId: user.id,
    email: user.email
  });

  // Get organizations the customer has access to
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .is('deleted_at', null);

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
    return <div>Error loading organizations</div>;
  }

  // First get total count for comparison
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', user.id);

  console.log('Customer Portal - Total tickets count (no filters):', totalCount);

  // Get user's tickets with organization info
  console.log('Customer Portal - Fetching tickets for user:', user.id);
  const { data: tickets, error: ticketsError, count } = await supabase
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
    `, { count: 'exact' })
    .eq('customer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (ticketsError) {
    console.error('Customer Portal - Error fetching tickets:', ticketsError);
    return <div>Error loading tickets</div>;
  }

  // Log the raw query results with comparison
  console.log('Customer Portal - Query Diagnostics:', {
    totalTicketsNoFilter: totalCount,
    ticketsWithFilter: count,
    query: {
      table: 'tickets',
      filter: `customer_id=${user.id}`,
      deleted_at: null,
      order: 'created_at DESC'
    },
    results: tickets?.map(t => ({
      id: t.id,
      title: t.title,
      customer_id: t.customer_id,
      created_at: t.created_at,
      deleted_at: t.deleted_at,
      status: t.status
    }))
  });

  console.log('Customer Portal - Initial Tickets Load:', {
    ticketCount: tickets?.length || 0,
    tickets: tickets?.map(t => ({
      id: t.id,
      title: t.title,
      customer_id: t.customer_id,
      created_at: t.created_at
    }))
  });

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