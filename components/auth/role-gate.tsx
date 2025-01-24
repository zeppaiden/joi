"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Role = 'admin' | 'agent' | 'customer';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
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

        setCanAccess(allowedRoles.includes(userData.role as Role));
      } catch (error) {
        setCanAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, [allowedRoles]);

  if (isLoading) return null;
  if (!canAccess) return null;

  return <>{children}</>;
} 