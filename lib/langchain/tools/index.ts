import { AGENT_TOOLS, ToolResult, AgentToolName } from "@/types/agent";
import { ticketTools } from "./ticket-tools";
import { userTools, findUsers } from "./user-tools";
import { adminTools } from "./admin-tools";
import { systemTools } from "./system-tools";
import { generateEmbedding } from "@/lib/openai";
import { createClient } from "@/utils/supabase/server";

export const tools: Record<AgentToolName, Function> = {
  [AGENT_TOOLS.SEARCH_TICKETS]: ticketTools.searchTickets,
  [AGENT_TOOLS.GET_TICKET_DETAILS]: ticketTools.getTicketDetails,
  [AGENT_TOOLS.CREATE_TICKET]: ticketTools.createTicket,
  [AGENT_TOOLS.FIND_USERS]: (input: any) => findUsers._call(input),
  [AGENT_TOOLS.GET_CURRENT_USER]: userTools.getCurrentUserContext,
  [AGENT_TOOLS.FIND_SIMILAR_MESSAGES]: async (input: string | { message: string }): Promise<ToolResult> => {
    try {
      const supabase = await createClient();
      const queryText = typeof input === 'string' ? input : input.message;
      const embedding = await generateEmbedding(queryText);
      const embeddingString = `[${embedding.join(',')}]`;

      const { data, error } = await supabase
        .rpc("match_messages_by_embedding", {
          query_embedding: embeddingString,
          match_threshold: 0.5,
          match_count: 5
        });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error("Find similar messages error:", error);
      return {
        success: false,
        error: error.message || "Failed to find similar messages"
      };
    }
  },
  [AGENT_TOOLS.GET_SYSTEM_INFO]: systemTools.getSystemInfo,
  [AGENT_TOOLS.UPDATE_ORGANIZATION]: adminTools.updateOrganization,
  [AGENT_TOOLS.MANAGE_USERS]: adminTools.manageUsers,
  [AGENT_TOOLS.UPDATE_TICKET]: adminTools.updateTicket
};

export { ticketTools, userTools, adminTools }; 
