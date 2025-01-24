"use client";

import React, { useEffect, useState } from "react";
import { Search, LogOut } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function getUserRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserRole(data.role);
        }
      }
    }

    getUserRole();
  }, []);

  // Update URL with debounced search query
  const debouncedUpdateUrl = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  // Keep local state in sync with URL params
  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      router.push('/sign-in');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const showSearch = userRole === 'admin' || userRole === 'agent';

  return (
    <header className="border-b">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between">
          {showSearch ? (
            <div className="flex items-center flex-1 max-w-xl">
              <div className="w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedUpdateUrl(e.target.value);
                  }}
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 text-foreground hover:text-destructive transition-colors" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
