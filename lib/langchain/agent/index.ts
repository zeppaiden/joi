/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { 
  AgentState, 
  AgentAction, 
  AGENT_TOOLS, 
  AgentToolName, 
  AgentIntents, 
  IntentAnalysis, 
  Message,
} from "@/types/agent";
import { tools } from "../tools";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Helper function to clean LLM output before parsing
const cleanLLMOutput = (output: string): string => {
  // Remove markdown code blocks if present
  output = output.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '');
  // Trim whitespace
  output = output.trim();
  return output;
};

const model = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0
});

const INTENT_ANALYSIS_TEMPLATE = `Analyze the user's query and extract relevant information.

Chat History:
{conversationHistory}

Current Query: {query}

Context: When analyzing queries, follow these strict guidelines:

1. NEVER make assumptions about missing information
2. NEVER try to use placeholder or example data
3. NEVER attempt to guess or infer IDs, references, or any other critical information
4. ALWAYS ask for clarification when information is missing or unclear

Pay special attention to:
1. Administrative actions (updates, changes, modifications to system entities)
2. Information requests (questions about system, capabilities, status)
3. Ticket operations (searches, updates, management)

Required Information by Action Type:
- Creating tickets requires:
  * Title (specific to the issue)
  * Description (detailed explanation)
  * Customer identification (email or ID)
  * Priority (optional)
  * Assignee (optional)

- Updating tickets requires:
  * Ticket ID
  * Specific fields to update
  * New values for those fields

- Finding users requires:
  * At least ONE of: email, name, or ID
  * Role (if searching for specific type of user)

For any action that requires specific fields or information:
- DO NOT try to resolve or look up IDs or references yourself
- DO NOT make assumptions about missing values
- DO NOT use placeholder values
- If a user provides information that needs to be looked up first (like an email that needs to be converted to an ID):
  * Set needsClarification to true
  * Explain that we need to find/verify the referenced information first
  * Ask for alternative information if possible
- If ANY required information is missing:
  * List ALL missing information in missingFields
  * Create a clear, specific clarificationQuestion
- Only proceed with the action if ALL required information is available

Return a JSON object with:
{{
  "intent": "SEARCH" | "DETAILS" | "SIMILAR" | "SYSTEM" | "GREETING" | "USER_QUERY" | "ADMIN_ACTION",
  "explanation": "One-line technical reason for classification",
  "parameters": {{
    "timeRanges": {{
      "created": {{ "start": "ISO date", "end": "ISO date" }},
      "updated": {{ "start": "ISO date", "end": "ISO date" }}
    }},
    "filters": {{
      "priority": "low" | "medium" | "high" | "urgent",
      "status": "open" | "in_progress" | "resolved" | "closed",
      "assignee": {{ "id": "UUID", "name": "name" }},
      "customer": {{ "id": "UUID", "name": "name" }}
    }},
    "ticketId": "UUID if specific ticket",
    "searchTerms": ["key", "search", "terms"],
    "messageContext": {{
      "type": "chat" | "ticket" | "unclear",
      "referenceIndex": null,
      "needsClarification": boolean,
      "clarificationQuestion": string | null
    }},
    "action": {{
      "type": "update" | "create" | "delete" | "manage",
      "resource": "organization" | "user" | "ticket" | "settings",
      "parameters": {{
        "updates": {{ [key: string]: any }}
      }},
      "missingFields": string[],
      "needsClarification": boolean,
      "clarificationQuestion": string | null
    }}
  }}
}}

Example classifications:
1. "Create a ticket" (missing information)
   - Intent: ADMIN_ACTION
   - Action: {{
       "type": "create",
       "resource": "ticket",
       "parameters": {{}},
       "missingFields": ["title", "description", "customerId"],
       "needsClarification": true,
       "clarificationQuestion": "I'll help you create a ticket. Please provide:\n1. A title for the ticket\n2. A description of the issue or request\n3. The customer ID the ticket should be created for\n4. Priority level (optional: low, medium, high, urgent)\n5. Who should this ticket be assigned to? (optional)"
     }}

2. "Create a ticket with title 'Login Issue' and customer email 'user@example.com'"
   - Intent: ADMIN_ACTION
   - Action: {{
       "type": "create",
       "resource": "ticket",
       "parameters": {{
         "title": "Login Issue"
       }},
       "missingFields": ["description", "customerId"],
       "needsClarification": true,
       "clarificationQuestion": "I see you want to create a ticket. Before I can do that:\n1. I need to find the customer ID associated with user@example.com\n2. Please provide a description of the issue"
     }}

3. "What can you do?"
   - Intent: SYSTEM
   - No action parameters needed

4. "Show me all tickets"
   - Intent: SEARCH
   - No action parameters needed`;

const TOOL_PLANNING_TEMPLATE = `Plan the necessary steps to handle this request.

Chat History:
{conversationHistory}

Current Query: {query}
Intent Analysis: {intentAnalysis}

Critical Guidelines:
1. NEVER proceed with incomplete information
2. NEVER use placeholder or example data
3. NEVER try to guess IDs or references
4. ALWAYS verify required information is available before planning tool usage

Tool Usage Requirements:

createTicket:
- MUST have customer ID (found via findUsers if only email provided)
- MUST have actual title and description
- MUST NOT use placeholder data
- MUST verify customer exists before creating ticket

findUsers:
- MUST have at least one search criterion (email, name, or ID)
- Use BEFORE createTicket if only email is provided
- MUST NOT assume or generate fake data

updateTicket:
- MUST have ticket ID
- MUST have specific fields to update
- MUST verify permissions first

Tools Available:
- searchTickets: Search and filter tickets
- getTicketDetails: Get detailed ticket information
- findSimilarMessages: Find similar content
- findUsers: Search users
- getCurrentUser: Get user context
- getSystemInfo: Get assistant information
- updateOrganization: Modify organization details (Admin only)
- manageUsers: User management operations (Admin only)
- updateTicket: Modify ticket details (Role-based)
- createTicket: Create new tickets

Guidelines:
1. For ADMIN_ACTION intents:
   - First get current user context to check permissions
   - Then use appropriate admin tool based on the action:
     * updateOrganization requires: {{ "updates": {{ "field": "value" }} }}
     * manageUsers for user operations
     * updateTicket for ticket modifications
     * createTicket requires: {{ 
         "title": "string",
         "description": "string",
         "priority": "low|medium|high|urgent",
         "assigneeId": "optional user ID",
         "customerId": "required user ID",
         "organizationId": "optional org ID"
       }}

2. For SYSTEM or GREETING intents:
   - Use getSystemInfo only
   - Do not use admin tools

3. For ticket operations:
   - Start with searchTickets
   - Use findUsers only if searching by name or email
   - Use findSimilarMessages only for content matching

4. For user lookups:
   - Use findUsers directly
   - Get organization context if needed

If ANY required information is missing, return an empty array and let the response generator handle asking for the missing information.

Return steps as JSON array:
[
  {{
    "tool": "toolName",
    "input": {{ "param": "value" }},
    "reasoning": "Technical justification"
  }}
]

Example tool plans:
1. Update organization name:
   [
     {{
       "tool": "getCurrentUser",
       "input": {{}},
       "reasoning": "Check admin permissions"
     }},
     {{
       "tool": "updateOrganization",
       "input": {{
         "updates": {{ "name": "NewName" }}
       }},
       "reasoning": "Update the organization name"
     }}
   ]

2. Create a ticket with email:
   [
     {{
       "tool": "getCurrentUser",
       "input": {{}},
       "reasoning": "Get user context for organization ID and permissions"
     }},
     {{
       "tool": "findUsers",
       "input": {{ "email": "user@example.com" }},
       "reasoning": "Find the customer ID by email address"
     }},
     {{
       "tool": "createTicket",
       "input": {{
         "title": "Ticket Title",
         "description": "Detailed description",
         "priority": "high",
         "customerId": "resolved-user-id",
         "organizationId": "from-user-context"
       }},
       "reasoning": "Create the ticket with all provided details"
     }}
   ]`;

const RESPONSE_TEMPLATE = `Generate a direct and helpful response.

Chat History:
{conversationHistory}

Current Query: {query}
Intent: {intent}
Results: {results}

Guidelines for different types of queries:

1. For administrative actions:
- If information needs to be looked up first:
  * Clearly state that we need to find/verify the referenced information
  * Explain what format we need the information in
  * Provide alternative ways to identify the resource
  * Example: "I see you provided an email, but I need the customer ID. You can provide either:
    1. The customer ID directly
    2. The customer's full name and organization
    3. A different way to identify the customer"
- If clarification needed:
  * Start with "I'll help you with that"
  * List the specific information needed
  * Explain why each piece of information is important
  * Use a clear, numbered list format
- If successful:
  * Confirm the action was completed
  * Specify what was changed
  * Mention any important effects
- If permission denied:
  * Explain the permission requirement clearly
  * Specify which role is needed
  * Suggest proper channels if applicable
- If error occurred:
  * Explain what went wrong
  * Suggest alternative approaches

2. For "Who are you" type questions:
- Use the system info to introduce yourself in first person
- Be warm but professional
- Mention your core purpose

3. For capability questions:
- Start with "I can help you with..."
- List your capabilities in first person
- Be specific about what you can do

4. For ticket/user queries:
- Be direct and action-oriented
- Present information clearly
- Use markdown for formatting
- Suggest next steps when relevant

5. For errors:
- Clearly state what went wrong
- Suggest alternatives if possible

Always maintain a first-person perspective and be direct in your responses.

Example responses for missing information:
1. Create ticket (all info missing):
   "I'll help you create a ticket. To proceed, I need:
   1. A title for the ticket
   2. A description of the issue or request
   3. The customer ID the ticket should be created for
   4. Priority level (optional: low, medium, high, urgent)
   5. Who should this ticket be assigned to? (optional)
   
   Please provide these details and I'll create the ticket right away."

2. Create ticket (needs customer lookup):
   "I see you want to create a ticket and provided an email address. However, I need the customer ID to create the ticket. You can provide this in one of these ways:
   1. The customer ID directly (if you have it)
   2. The customer's full name and organization
   3. A different way to identify the customer

   Once I have the customer ID, I'll create the ticket with the title and description you provided."

Response:`;

export class TicketAgent {
  private intentAnalyzer: RunnableSequence;
  private toolPlanner: RunnableSequence;
  private responseGenerator: RunnableSequence;

  constructor() {
    // Setup intent analyzer chain
    this.intentAnalyzer = RunnableSequence.from([
      PromptTemplate.fromTemplate(INTENT_ANALYSIS_TEMPLATE),
      model,
      new StringOutputParser(),
      (output: string) => {
        try {
          console.log("Raw intent analysis:", output);
          const cleaned = cleanLLMOutput(output);
          console.log("Cleaned intent analysis:", cleaned);
          return JSON.parse(cleaned) as IntentAnalysis;
        } catch (e) {
          console.error("Failed to parse intent analysis:", e);
          console.error("Cleaned output was:", cleanLLMOutput(output));
          throw new Error("Failed to analyze intent");
        }
      }
    ]);

    // Setup tool planner chain
    this.toolPlanner = RunnableSequence.from([
      PromptTemplate.fromTemplate(TOOL_PLANNING_TEMPLATE),
      model,
      new StringOutputParser(),
      (output: string) => {
        try {
          console.log("Raw tool plan:", output);
          const cleaned = cleanLLMOutput(output);
          console.log("Cleaned tool plan:", cleaned);
          return JSON.parse(cleaned) as AgentAction[];
        } catch (e) {
          console.error("Failed to parse tool plan:", e);
          console.error("Cleaned output was:", cleanLLMOutput(output));
          throw new Error("Failed to plan tools");
        }
      }
    ]);

    // Setup response generator chain
    this.responseGenerator = RunnableSequence.from([
      PromptTemplate.fromTemplate(RESPONSE_TEMPLATE),
      model,
      new StringOutputParser()
    ]);
  }

  async process(query: string, history: Message[] = []): Promise<{ response: string; state: AgentState }> {
    const state: AgentState = {
      query,
      context: {
        conversationHistory: history
      }
    };

    try {
      const formattedHistory = history.map((msg, index) => 
        `[${index + 1}] ${msg.role}: ${msg.content}`
      ).join('\n');

      // Step 1: Analyze intent
      const intentAnalysis = await this.intentAnalyzer.invoke({
        query,
        conversationHistory: formattedHistory
      });
      console.log("Intent analysis:", intentAnalysis);
      state.context.parameters = intentAnalysis.parameters;

      // Check if we need clarification about message context
      if (intentAnalysis.parameters.messageContext?.needsClarification) {
        return {
          response: intentAnalysis.parameters.messageContext.clarificationQuestion || 
                   "Could you clarify if you're referring to our current chat conversation or messages within a specific support ticket?",
          state
        };
      }

      // Handle chat message references without tool calls
      if (intentAnalysis.parameters.messageContext?.type === "chat") {
        return {
          response: await this.responseGenerator.invoke({
            query,
            conversationHistory: formattedHistory,
            intent: intentAnalysis.intent,
            results: JSON.stringify({ conversationHistory: history })
          }),
          state
        };
      }

      // Step 2: Get system info for SYSTEM or GREETING intents
      if (intentAnalysis.intent === AgentIntents.SYSTEM || 
          intentAnalysis.intent === AgentIntents.GREETING) {
        const systemInfo = await tools[AGENT_TOOLS.GET_SYSTEM_INFO]();
        if (systemInfo.success) {
          state.context.systemInfo = systemInfo.data;
        }
      }
      
      // Step 3: Get current user context if needed
      if (intentAnalysis.intent !== AgentIntents.SYSTEM && 
          intentAnalysis.intent !== AgentIntents.GREETING) {
        const userContext = await tools[AGENT_TOOLS.GET_CURRENT_USER]();
        if (userContext.success) {
          state.context.currentUser = userContext.data;
          state.context.organization = userContext.data.organization_members[0]?.organization;
        }
      }

      // Step 4: Plan and execute tools
      const toolPlan = await this.toolPlanner.invoke({
        query,
        conversationHistory: formattedHistory,
        intentAnalysis: JSON.stringify(intentAnalysis)
      });
      console.log("Tool plan:", toolPlan);

      // Execute each step in the plan
      const results = [];
      for (const step of toolPlan) {
        if (!Object.values(AGENT_TOOLS).includes(step.tool as AgentToolName)) {
          throw new Error(`Unknown tool: ${step.tool}`);
        }

        const tool = tools[step.tool as AgentToolName];
        // Add user role and organization context for admin tools
        const input = {
          ...step.input,
          userRole: state.context.currentUser?.role,
          organizationId: state.context.organization?.id
        };
        const result = await tool(input);
        results.push({ step, result });
      }

      // Step 5: Generate final response
      const response = await this.responseGenerator.invoke({
        query,
        conversationHistory: formattedHistory,
        intent: intentAnalysis.intent,
        results: JSON.stringify({
          ...results,
          systemInfo: state.context.systemInfo,
          currentUser: state.context.currentUser,
          organization: state.context.organization
        })
      });

      state.result = results;

      return {
        response,
        state
      };
    } catch (error: any) {
      console.error("Agent process error:", error);
      return {
        response: `I apologize, but I encountered an error: ${error.message}`,
        state
      };
    }
  }
}
