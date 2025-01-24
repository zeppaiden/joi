import { Analytics } from '@/components/analytics/analytics';
import { RoleGate } from '@/components/auth/role-gate';

export default function AnalyticsPage() {
  return (
    <RoleGate allowedRoles={['admin', 'agent']}>
      <Analytics />
    </RoleGate>
  );
} 