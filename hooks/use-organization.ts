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
        if (userError) {
          console.error('User fetch error:', userError);
          throw new Error('Failed to get current user');
        }
        
        if (!user) {
          console.log('No user found');
          setOrganization(null);
          return;
        }

        // First try to find organization where user is admin
        let { data: adminOrg, error: adminError } = await supabase
          .from('organizations')
          .select('*')
          .eq('admin_id', user.id)
          .maybeSingle();

        // If there's a 406 error, it means the response format wasn't acceptable
        // This is likely due to the response not matching the expected schema
        if (adminError && adminError.code !== '406') {
          console.error('Admin org fetch error:', adminError);
        }

        if (!adminError && adminOrg) {
          console.log('Found admin organization:', adminOrg);
          setOrganization(adminOrg);
          return;
        }

        // If not admin, try to find organization where user is a member
        const { data: memberOrg, error: memberError } = await supabase
          .from('organization_members')
          .select('organization:organizations(*)')
          .eq('user_id', user.id)
          .maybeSingle();

        // Similarly handle 406 errors for member org fetch
        if (memberError && memberError.code !== '406') {
          console.error('Member org fetch error:', memberError);
        }

        if (!memberError && memberOrg?.organization) {
          console.log('Found member organization:', memberOrg.organization);
          setOrganization(memberOrg.organization);
          return;
        }

        // If we get here, no organization was found
        console.log('No organization found for user');
        setOrganization(null);
      } catch (err) {
        console.error('Organization load error:', err);
        setError(err instanceof Error ? err : new Error('Failed to load organization'));
      } finally {
        setIsLoading(false);
      }
    }

    loadOrganization();
  }, []);

  return { organization, isLoading, error };
} 