"use client";

import React from "react";
import { Inbox, Users, BarChart2, Settings, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/protected/inbox", icon: Inbox, label: "Inbox" },
  { href: "/protected/customers", icon: Users, label: "Customers" },
  { href: "/protected/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/protected/settings", icon: Settings, label: "Settings" },
  { href: "/protected/help", icon: HelpCircle, label: "Help Center" },
] as const;

export function Navigation() {
  const pathname = usePathname();

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
