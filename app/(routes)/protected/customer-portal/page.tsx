import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";

export default async function CustomerPortalPage() {
  const supabase = await createClient();

  // Get current user and verify they are a customer
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get user details including role
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!userData || userData.role !== 'customer') {
    redirect("/protected/inbox");
  }

  // Get all organizations that the customer can create tickets for
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .is('deleted_at', null);

  // Get customer's tickets with organization info
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('customer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Portal</h1>
        <p className="text-muted-foreground">
          View your tickets and create new support requests
        </p>
      </div>

      <CustomerDashboard 
        tickets={tickets || []}
        organizations={organizations || []}
        userId={user.id}
      />
    </div>
  );
} 