import React from 'react';
import { unstable_cache } from 'next/cache';

// Cache ticket stats
const getTicketStats = unstable_cache(
  async () => {
    // Replace with actual data fetching
    return [
      { title: "Open Tickets", count: 12, change: "+5%" },
      { title: "Pending", count: 24, change: "-3%" },
      { title: "Resolved", count: 36, change: "+5%" },
      { title: "Total Tickets", count: 48, change: "-3%" },
    ];
  },
  ['ticket-stats'],
  { revalidate: 60 } // Revalidate every minute
);

export async function TicketStats() {
  const stats = await getTicketStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <h3 className="text-sm font-medium text-gray-500">
            {stat.title}
          </h3>
          <p className="text-2xl font-semibold mt-2">
            {stat.count}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {stat.change} from last week
          </p>
        </div>
      ))}
    </div>
  );
} 