import { createClient } from "@/utils/supabase/server";
import { ToolResult, UserRole, ROLE_PERMISSIONS } from "@/types/agent";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type UserInsert = Tables["users"]["Insert"];
type UserUpdate = Tables["users"]["Update"];

// Permission checking utility
const hasPermission = (userRole: UserRole, action: string, resource: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.some(permission => 
    (permission.action === action || permission.action === "manage") && 
    permission.resource === resource
  );
};

export const adminTools = {
  updateOrganization: async (
    input: { 
      organizationId: string; 
      updates: Record<string, any>;
      userRole: UserRole;
    }
  ): Promise<ToolResult> => {
    try {
      if (!hasPermission(input.userRole, "manage", "organization")) {
        return {
          success: false,
          error: "You don't have permission to manage organization settings"
        };
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("organizations")
        .update(input.updates)
        .eq("id", input.organizationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error("Update organization error:", error);
      return {
        success: false,
        error: error.message || "Failed to update organization"
      };
    }
  },

  manageUsers: async (
    input: {
      action: "create" | "update" | "delete";
      userId: string;
      userData: Partial<UserInsert>;
      userRole: UserRole;
    }
  ): Promise<ToolResult> => {
    try {
      if (!hasPermission(input.userRole, "manage", "users")) {
        return {
          success: false,
          error: "You don't have permission to manage users"
        };
      }

      if (!input.userId && (input.action === "update" || input.action === "delete")) {
        return {
          success: false,
          error: "User ID is required for update and delete operations"
        };
      }

      const supabase = await createClient();
      let result;

      switch (input.action) {
        case "create":
          result = await supabase
            .from("users")
            .insert(input.userData as UserInsert)
            .select()
            .single();
          break;

        case "update":
          result = await supabase
            .from("users")
            .update(input.userData as UserUpdate)
            .eq("id", input.userId)
            .select()
            .single();
          break;

        case "delete":
          result = await supabase
            .from("users")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", input.userId)
            .select()
            .single();
          break;
      }

      if (result.error) throw result.error;

      return {
        success: true,
        data: result.data
      };
    } catch (error: any) {
      console.error("Manage users error:", error);
      return {
        success: false,
        error: error.message || "Failed to manage users"
      };
    }
  },

  updateTicket: async (
    input: {
      ticketId: string;
      updates: Record<string, any>;
      userRole: UserRole;
      userId: string;
    }
  ): Promise<ToolResult> => {
    try {
      const supabase = await createClient();

      // First get the ticket to check permissions
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", input.ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Check permissions based on role and ownership
      const canUpdate = 
        input.userRole === "admin" ||
        (input.userRole === "agent" && hasPermission(input.userRole, "update", "tickets")) ||
        (input.userRole === "customer" && 
         hasPermission(input.userRole, "update", "own_tickets") && 
         ticket.customer_id === input.userId);

      if (!canUpdate) {
        return {
          success: false,
          error: "You don't have permission to update this ticket"
        };
      }

      // Perform the update
      const { data, error } = await supabase
        .from("tickets")
        .update(input.updates)
        .eq("id", input.ticketId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error("Update ticket error:", error);
      return {
        success: false,
        error: error.message || "Failed to update ticket"
      };
    }
  }
};