import { createClient } from "@/utils/supabase/server";
import { TicketSearchParams, TicketCreationParams, ToolResult } from "@/types/agent";
import { Database } from "@/types/database";
import { v4 as uuidv4 } from 'uuid';

type Tables = Database["public"]["Tables"];
type TicketInsert = Tables["tickets"]["Insert"];

export const ticketTools = {
  searchTickets: async (params: TicketSearchParams): Promise<ToolResult> => {
    try {
      const supabase = await createClient();
      let query = supabase.from("tickets").select(`
        *,
        assigned_to_user:assigned_to(*),
        customer:customer_id(*),
        organization:organization_id(*)
      `);

      // Apply filters
      if (params.priority) {
        query = query.eq("priority_level", params.priority);
      }
      if (params.status) {
        query = query.eq("status", params.status);
      }
      if (params.assignedTo) {
        query = query.eq("assigned_to", params.assignedTo);
      }
      if (params.organizationId) {
        query = query.eq("organization_id", params.organizationId);
      }
      if (params.customerId) {
        query = query.eq("customer_id", params.customerId);
      }
      if (params.isUnassigned) {
        query = query.is("assigned_to", null);
      }
      
      // Apply date filters
      if (params.createdAt?.start) {
        query = query.gte("created_at", params.createdAt.start);
        if (params.createdAt.end) {
          query = query.lte("created_at", params.createdAt.end);
        }
      }
      if (params.updatedAt?.start) {
        query = query.gte("updated_at", params.updatedAt.start);
        if (params.updatedAt.end) {
          query = query.lte("updated_at", params.updatedAt.end);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error("Search tickets error:", error);
      return {
        success: false,
        error: error.message || "Failed to search tickets"
      };
    }
  },

  getTicketDetails: async (ticketId: string): Promise<ToolResult> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          assigned_to_user:assigned_to(*),
          customer:customer_id(*),
          organization:organization_id(*),
          messages(*)
        `)
        .eq("id", ticketId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error("Get ticket details error:", error);
      return {
        success: false,
        error: error.message || "Failed to get ticket details"
      };
    }
  },

  createTicket: async (params: TicketCreationParams): Promise<ToolResult> => {
    try {
      // Validate required fields with specific error messages
      const missingFields = [];
      if (!params.title) missingFields.push("title");
      if (!params.description) missingFields.push("description");
      if (!params.customerId) missingFields.push("customer ID");
      
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}. Please provide the actual information for each field.`
        };
      }

      // Verify the customer exists
      const supabase = await createClient();
      const { data: customerData, error: customerError } = await supabase
        .from("users")
        .select("id, role, email")
        .eq("id", params.customerId)
        .eq("role", "customer")
        .single();

      if (customerError || !customerData) {
        return {
          success: false,
          error: "Invalid customer ID. Please find the correct customer first using their email address."
        };
      }

      // Validate priority if provided
      if (params.priority && !["low", "medium", "high", "urgent"].includes(params.priority)) {
        return {
          success: false,
          error: "Invalid priority level. Must be one of: low, medium, high, urgent"
        };
      }

      // Validate status if provided
      if (params.status && !["open", "in_progress", "resolved", "closed"].includes(params.status)) {
        return {
          success: false,
          error: "Invalid status. Must be one of: open, in_progress, resolved, closed"
        };
      }

      // If assigneeId is provided, verify the agent exists
      if (params.assigneeId) {
        const { data: agentData, error: agentError } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", params.assigneeId)
          .eq("role", "agent")
          .single();

        if (agentError || !agentData) {
          return {
            success: false,
            error: "Invalid assignee ID. Please provide a valid agent ID."
          };
        }
      }

      // Create the ticket with required fields
      const ticketData: TicketInsert = {
        id: uuidv4(),
        customer_id: params.customerId,
        created_by: params.customerId,
        title: params.title.trim(),
        description: params.description.trim(),
        priority_level: params.priority || "medium",
        status: params.status || "open",
        assigned_to: params.assigneeId || null,
        organization_id: params.organizationId || null
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select(`
          *,
          customer:customer_id(*),
          assigned_to_user:assigned_to(*)
        `)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error("Create ticket error:", error);
      return {
        success: false,
        error: error.message || "Failed to create ticket"
      };
    }
  }
}; 