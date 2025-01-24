"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { userSettingsSchema } from "@/schemas/user";
import type { UserSettings as UserSettingsType } from "@/types/user";

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (UTC-5) - New York, Miami" },
  { value: "America/Chicago", label: "Central Time (UTC-6) - Chicago, Houston" },
  { value: "America/Denver", label: "Mountain Time (UTC-7) - Denver, Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific Time (UTC-8) - Los Angeles, Seattle" },
  { value: "America/Anchorage", label: "Alaska Time (UTC-9) - Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (UTC-10) - Honolulu" },
] as const;

const DEFAULT_TIMEZONE = "America/New_York";

export function UserSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<UserSettingsType>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user data. Please try again.",
        });
        return {
          email: "",
          firstName: "",
          lastName: "",
          phoneNumber: "",
          timezone: DEFAULT_TIMEZONE
        };
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("first_name, last_name, phone_number, timezone")
        .eq("id", user.id)
        .single();

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data. Please try again.",
        });
        return {
          email: user.email || "",
          firstName: "",
          lastName: "",
          phoneNumber: "",
          timezone: DEFAULT_TIMEZONE
        };
      }

      return {
        email: user.email || "",
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        phoneNumber: profile?.phone_number || "",
        timezone: profile?.timezone || DEFAULT_TIMEZONE,
      };
    },
  });

  const onSubmit = async (data: UserSettingsType) => {
    console.log('Starting settings update with data:', data);
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Failed to get user:', userError);
        throw new Error("Failed to get user");
      }
      if (!user) {
        console.error('No user found in session');
        throw new Error("No user found");
      }
      
      // Create update payload with only non-empty values
      const updateData: Record<string, string> = {};
      if (data.firstName) updateData.first_name = data.firstName;
      if (data.lastName) updateData.last_name = data.lastName;
      if (data.phoneNumber) updateData.phone_number = data.phoneNumber;
      if (data.timezone) updateData.timezone = data.timezone;

      console.log('Updating user profile for ID:', user.id);
      console.log('Update payload:', updateData);

      const { error: updateError, data: updateResult } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) {
        console.error('Update failed with error:', updateError);
        throw updateError;
      }

      console.log('Update successful:', updateResult);
      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully.",
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error in settings update:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled value={field.value || ""} />
                  </FormControl>
                  <FormDescription>
                    Your email address is managed through your authentication provider.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="tel" 
                      placeholder="1234567890"
                      maxLength={10}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your 10-digit US phone number (e.g., 1234567890)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    value={field.value || DEFAULT_TIMEZONE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {US_TIMEZONES.find(tz => tz.value === (field.value || DEFAULT_TIMEZONE))?.label || "Select your timezone"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your preferred timezone for displaying dates and times
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 