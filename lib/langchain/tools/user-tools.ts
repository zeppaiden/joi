import { createClient } from "@/utils/supabase/server";
import { ToolResult } from "@/types/agent";
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

const findUsersSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(["admin", "agent", "customer"]).optional(),
  organizationId: z.string().optional()
});

type FindUsersInput = z.infer<typeof findUsersSchema>;

class FindUsersTool extends Tool {
  name = "findUsers";
  description = "Find users by email, name, role, or organization ID. Returns a list of matching users. Most commonly used to find customers by their email address.";

  async _call(rawInput: string | FindUsersInput): Promise<string> {
    try {
      console.log("FindUsersTool received input:", rawInput);
      
      // Parse and validate input
      let params: FindUsersInput;
      if (typeof rawInput === 'string') {
        // If string input, assume it's an email search
        params = { email: rawInput, role: 'customer' };
        console.log("Converted string input to params:", params);
      } else {
        const result = findUsersSchema.safeParse(rawInput);
        if (!result.success) {
          console.error("Input validation failed:", result.error);
          throw new Error(`Invalid input: ${result.error.message}`);
        }
        params = result.data;
        console.log("Validated object input:", params);
      }

      const supabase = await createClient();
      
      // Build the query
      const selectQuery = `
        *,
        organization_members (
          organization_id,
          organization:organizations (
            id,
            name
          )
        )
      `;
      console.log("Using select query:", selectQuery);

      let query = supabase
        .from("users")
        .select(selectQuery)
        .is("deleted_at", null);

      // Role filter - only apply if explicitly provided
      if (params.role) {
        console.log("Applying role filter:", params.role);
        query = query.eq("role", params.role);
      }

      // Organization filter
      if (params.organizationId) {
        console.log("Applying organization filter:", params.organizationId);
        query = query.eq("organization_members.organization_id", params.organizationId);
      }

      // Email exact match
      if (params.email) {
        const normalizedEmail = params.email.toLowerCase();
        console.log("Applying email filter:", normalizedEmail);
        query = query.eq("email", normalizedEmail);
      }

      console.log("Executing query...");
      const { data, error } = await query;
      console.log("Query result:", { data, error });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      let filteredData = data || [];

      // Name-based filtering (post-query)
      if (params.name && filteredData.length > 0) {
        const searchName = params.name.toLowerCase();
        console.log("Applying name filter:", searchName);
        filteredData = filteredData.filter(user => {
          const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
          return fullName.includes(searchName);
        });
        console.log("After name filtering:", filteredData);
      }

      // Format response based on search results
      const response: ToolResult = {
        success: filteredData.length > 0,
        data: filteredData,
        error: filteredData.length === 0 
          ? params.email 
            ? `No user found with email: ${params.email}`
            : "No users found matching the search criteria"
          : undefined
      };
      
      console.log("Final response:", response);
      return JSON.stringify(response);
    } catch (error: any) {
      console.error("Find users error:", error);
      return JSON.stringify({
        success: false,
        error: error.message || "Failed to find users"
      });
    }
  }
}

export const findUsers = new FindUsersTool();

export const userTools = {
  getCurrentUserContext: async (): Promise<ToolResult> => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("No authenticated user");
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          *,
          organization_members!inner (
            organization:organizations (
              id,
              name,
              admin_id
            )
          )
        `)
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      return {
        success: true,
        data: userData
      };
    } catch (error: any) {
      console.error("Get user context error:", error);
      return {
        success: false,
        error: error.message || "Failed to get user context"
      };
    }
  }
}; 