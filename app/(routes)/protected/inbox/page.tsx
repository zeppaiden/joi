import { Suspense } from "react";
import { TicketStats } from "@/components/tickets/TicketStats";
import { TicketDashboard } from "@/components/tickets/TicketDashboard";
import { unstable_cache } from "next/cache";

// Cache ticket data
const getTickets = unstable_cache(
  async () => {
    // Replace with actual data fetching
    return [
      {
        id: "1234",
        subject: "Cannot access my account",
        status: "High" as const,
        customer: "Sarah Johnson",
        time: "10 mins ago",
      },
      {
        id: "1235",
        subject: "Payment failed multiple times",
        status: "Medium" as const,
        customer: "Mike Peters",
        time: "25 mins ago",
      },
      {
        id: "1236",
        subject: "Need help with integration",
        status: "Low" as const,
        customer: "David Wilson",
        time: "1 hour ago",
      },
      {
        id: "1237",
        subject: "Security concern with login",
        status: "High" as const,
        customer: "Emma Thompson",
        time: "2 hours ago",
      },
    ];
  },
  ["tickets"],
  { revalidate: 60 } // Revalidate every minute
);

export default async function InboxPage() {
  const tickets = await getTickets();

  return (
    <>
      {/* Ticket Stats */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <TicketStats />
      </Suspense>

      {/* Ticket Dashboard */}
      <Suspense fallback={<div>Loading tickets...</div>}>
        <TicketDashboard tickets={tickets} />
      </Suspense>
    </>
  );
} 