"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registrationSchema, type RegistrationPayload } from "@/schemas/auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function RegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegistrationPayload>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: undefined,
      organizationName: undefined,
      inviteCode: undefined,
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(data: RegistrationPayload) {
    console.log("onSubmit function called with data:", data);
    try {
      setIsLoading(true);
      console.log("Making registration request...");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Registration response:", {
        ok: response.ok,
        status: response.status,
        result
      });

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      toast({
        title: "Registration successful",
        description: "Your account has been set up",
      });
      
      // Handle redirect from API response
      if (result.redirectTo) {
        // Force a router refresh before redirect to ensure fresh state
        await router.refresh();
        router.push(result.redirectTo);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to register",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Form submission started");
    e.preventDefault();
    
    const values = form.getValues();
    
    // Convert empty strings to undefined
    const cleanedValues = {
      ...values,
      organizationName: values.organizationName?.trim() || undefined,
      inviteCode: values.inviteCode?.trim() || undefined,
    };
    
    console.log("Submitting with values:", cleanedValues);
    
    // Validate the data manually
    try {
      const validatedData = registrationSchema.parse(cleanedValues);
      console.log("Data validated successfully:", validatedData);
      await onSubmit(validatedData);
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.message,
        });
      }
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={(value) => {
                      console.log("Role selected:", value);
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "admin" && (
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={value ?? ""}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        disabled={isLoading}
                        placeholder="Enter your organization name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedRole === "agent" && (
              <FormField
                control={form.control}
                name="inviteCode"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Invite Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={value ?? ""}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        disabled={isLoading}
                        placeholder="Enter your invite code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Complete Registration"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 