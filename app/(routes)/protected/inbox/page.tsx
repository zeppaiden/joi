"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TicketStats } from "@/components/tickets/ticket-stats";
import { TicketDashboard } from "@/components/tickets/ticket-dashboard";
import { AdminTicketManagement } from "@/components/tickets/admin-ticket-management";
import { RoleGate } from "@/components/auth/role-gate";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertDescription>
        Something went wrong: {error.message}
      </AlertDescription>
    </Alert>
  );
}

export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Admin View */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingState message="Loading interface..." />}>
          <RoleGate allowedRole="admin">
            <AdminTicketManagement />
          </RoleGate>
        </Suspense>
      </ErrorBoundary>

      {/* Agent/Customer View */}
      <RoleGate allowedRole="agent">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingState message="Loading statistics..." />}>
            <TicketStats />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingState message="Loading tickets..." />}>
            <TicketDashboard />
          </Suspense>
        </ErrorBoundary>
      </RoleGate>
    </div>
  );
}
