"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { RoleGate } from "@/components/auth/role-gate";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminTicketManagement } from "@/components/tickets/admin-ticket-management";
import { AgentTicketManagement } from "@/components/tickets/agent-ticket-management";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Error: {error.message}
      </AlertDescription>
    </Alert>
  );
}

export default function InboxPage() {
  return (
    <div className="space-y-8">
      {/* Admin View */}
      <div>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingState message="Loading interface..." />}>
            <RoleGate allowedRoles={['admin']}>
              <AdminTicketManagement />
            </RoleGate>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Agent View */}
      <div>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingState message="Loading tickets..." />}>
            <RoleGate allowedRoles={['agent']}>
              <AgentTicketManagement />
            </RoleGate>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
