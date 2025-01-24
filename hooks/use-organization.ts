"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface Organization {
  id: string;
  name: string;
  admin_id: string;
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadOrganization() {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('User not found');
        }

        // First try to find organization where user is admin
        let { data: adminOrg, error: adminError } = await supabase
          .from('organizations')
          .select('*')
          .eq('admin_id', user.id)
          .single();

        if (!adminError && adminOrg) {
          setOrganization(adminOrg);
          return;
        }

        // If not admin, try to find organization where user is a member
        const { data: memberOrg, error: memberError } = await supabase
          .from('organization_members')
          .select('organization:organizations(*)')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberOrg) {
          throw new Error('No organization found');
        }

        setOrganization(memberOrg.organization);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load organization'));
      } finally {
        setIsLoading(false);
      }
    }

    loadOrganization();
  }, []);

  return { organization, isLoading, error };
} 