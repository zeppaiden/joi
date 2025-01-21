"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRole: 'admin' | 'agent' | 'customer';
}

export function RoleGate({ children, allowedRole }: RoleGateProps) {
  const [canAccess, setCanAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setCanAccess(false);
          return;
        }

        // Get user's role from the users table
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError || !userData) {
          setCanAccess(false);
          return;
        }

        setCanAccess(userData.role === allowedRole);
      } catch (error) {
        setCanAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, [allowedRole]);

  if (isLoading) return null;
  if (!canAccess) return null;

  return <>{children}</>;
} 