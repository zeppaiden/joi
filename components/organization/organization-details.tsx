"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface OrganizationDetailsProps {
  organization: {
    id: string;
    name: string;
    admin_id: string;
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

  const handleSave = async () => {
    if (!isAdmin) return;
    
    try {
      setIsLoading(true);
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
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>
          View and manage your organization&apos;s information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          {isEditing ? (
            <div className="flex space-x-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
              />
              <Button 
                onClick={handleSave} 
                disabled={isLoading || name === organization.name}
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setName(organization.name);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg">{organization.name}</p>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 