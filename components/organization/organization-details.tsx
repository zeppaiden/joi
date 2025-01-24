"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Clock, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface OrganizationDetailsProps {
  organization: {
    id: string;
    name: string;
    admin_id: string;
    created_at: string;
    updated_at: string;
    organization_members: Array<{
      id: string;
      created_at: string;
      users: {
        email: string;
        role: string;
      };
    }>;
  };
  isAdmin: boolean;
}

export function OrganizationDetails({ organization, isAdmin }: OrganizationDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(organization.name);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const memberCount = organization.organization_members.length;
  const createdAt = new Date(organization.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const updatedAt = new Date(organization.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Sort members by join date
  const sortedMembers = [...organization.organization_members].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const oldestMember = sortedMembers[0];
  const newestMember = sortedMembers[sortedMembers.length - 1];

  const handleSave = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Organization updated",
        description: "Your organization details have been updated successfully.",
      });
      setIsEditing(false);
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update organization details. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Details about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Name Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Organization Name</h3>
            </div>
            {isAdmin ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="max-w-sm"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={name === organization.name || name.trim() === '' || isLoading}
                      >
                        {isLoading ? "Updating..." : "Update Name"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Update Organization Name</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to change the organization name from "{organization.name}" to "{name}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleSave}
                          disabled={isLoading}
                        >
                          Update Name
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {name !== organization.name && name.trim() !== '' && (
                  <p className="text-sm text-muted-foreground">
                    Click update to save the new organization name
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{organization.name}</p>
            )}
          </div>

          <Separator />

          {/* Organization Stats */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Members Stats */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Member Statistics</h3>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Total Members</dt>
                  <dd className="font-medium">{memberCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Newest Member</dt>
                  <dd className="font-medium">{newestMember.users.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">First Member</dt>
                  <dd className="font-medium">{oldestMember.users.email}</dd>
                </div>
              </dl>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Important Dates</h3>
              </div>
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Created On</dt>
                  <dd className="font-medium">{createdAt}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd className="font-medium">{updatedAt}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Separator />

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Recent Member Activity</h3>
            </div>
            <div className="space-y-4">
              {sortedMembers.slice(-3).reverse().map(member => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{member.users.email}</span>
                  <span className="font-medium">
                    Joined {new Date(member.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 