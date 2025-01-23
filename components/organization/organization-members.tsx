"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy } from "lucide-react";

interface OrganizationMember {
  id: string;
  user_id: string;
  created_at: string;
  users: {
    email: string;
    role: string;
  };
}

interface OrganizationMembersProps {
  organization: {
    id: string;
    name: string;
    admin_id: string;
    organization_members: OrganizationMember[];
  };
  isAdmin: boolean;
}

export function OrganizationMembers({ organization, isAdmin }: OrganizationMembersProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const generateInviteCode = async () => {
    if (!isAdmin) return;
    
    try {
      setIsLoading(true);
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          code,
          created_by: organization.admin_id
        });

      if (error) throw error;

      setInviteCode(code);
      toast({
        title: "Invite code generated",
        description: "Share this code with your team members.",
      });
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate invite code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Copied to clipboard",
        description: "The invite code has been copied to your clipboard.",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isAdmin) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The team member has been removed from the organization.",
      });
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove member. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your organization&apos;s team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-[70px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.organization_members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.users?.email}</TableCell>
                  <TableCell>{member.users?.role || 'Member'}</TableCell>
                  <TableCell>
                    {member.user_id === organization.admin_id ? 'Admin' : 'Member'}
                  </TableCell>
                  {isAdmin && member.user_id !== organization.admin_id && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => removeMember(member.id)}
                            className="text-destructive"
                          >
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Members</CardTitle>
            <CardDescription>
              Generate an invite code to add new team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteCode ? (
              <div className="flex items-center space-x-2">
                <Input value={inviteCode} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={generateInviteCode}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Invite Code
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 