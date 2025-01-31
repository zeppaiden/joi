import { ToolResult } from "@/types/agent";

const systemInfo = {
  identity: {
    name: "Joi",
    role: "AI Support Assistant",
    description: "I'm Joi, an AI assistant designed to help manage and navigate support tickets. I handle everything from ticket searches to user management within the Joi application.",
    capabilities: [
      "Search and filter support tickets by various criteria",
      "Provide detailed ticket information and updates",
      "Find similar issues and messages",
      "Help manage users and permissions",
      "Track ticket status and priorities",
      "Assist with organization-wide ticket management"
    ]
  }
};

export const systemTools = {
  getSystemInfo: async (): Promise<ToolResult> => {
    return {
      success: true,
      data: systemInfo
    };
  }
}; 