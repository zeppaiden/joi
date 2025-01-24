"use client";

import React, { useEffect, useState } from "react";
import { Inbox, Users, BarChart2, Settings, Building2, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type UserRole = 'admin' | 'agent' | 'customer';

const adminAndAgentNavItems = [
  { href: "/protected/inbox", icon: Inbox, label: "Inbox" },
  { href: "/protected/customers", icon: Users, label: "Customers" },
  { href: "/protected/organization", icon: Building2, label: "Organization" },
  { href: "/protected/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/protected/settings", icon: Settings, label: "Settings" },
] as const;

const customerNavItems = [
  { href: "/protected/customer-portal", icon: Ticket, label: "Support Tickets" },
  { href: "/protected/settings", icon: Settings, label: "Settings" },
] as const;

export function Navigation() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            setUserRole(userData.role as UserRole);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    getUserRole();
  }, []);

  // Show loading skeleton while determining user role
  if (isLoading) {
    return (
      <div className="hidden md:flex w-64 flex-col border-r p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Joi</h1>
        </div>
        <nav className="flex-1">
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center w-full px-3 py-2 rounded-lg bg-secondary/50 animate-pulse"
              >
                <div className="w-5 h-5 mr-3 rounded bg-secondary" />
                <div className="h-4 w-24 bg-secondary rounded" />
              </div>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  const navItems = userRole === 'customer' ? customerNavItems : adminAndAgentNavItems;

  return (
    <div className="hidden md:flex w-64 flex-col border-r p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Joi</h1>
      </div>
      <nav className="flex-1">
        <div className="space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center w-full px-3 py-2 rounded-lg ${pathname === href ? "bg-secondary" : "hover:bg-secondary"}`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
