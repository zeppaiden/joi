import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { Message } from "@/types/chat";

// Initialize the chat model
export const chatModel = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0.7,
});

// Create role-specific prompt templates
const customerPrompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant focused on helping customers with their tickets.
You can provide information about ticket status, history, and general support.
Be friendly, professional, and concise.

Previous messages for context:
{chatHistory}

User's message: {userInput}

Remember:
- Only provide information about tickets the user has access to
- Don't modify any ticket data directly
- If unsure about something, ask for clarification
- Keep responses focused on ticket-related queries
`);

const adminPrompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping administrators manage tickets.
You can help with updating ticket priorities, assigning tickets, and managing ticket workflows.
Be efficient and precise in your responses.

Previous messages for context:
{chatHistory}

User's message: {userInput}

Remember:
- You can suggest ticket priority changes
- You can help with ticket assignments
- Verify any critical changes before executing
- Keep audit trail in mind for important changes
`);

// Create role-specific chat chains
export const createCustomerChatChain = () => {
  return RunnableSequence.from([
    {
      chatHistory: (input: { chatHistory: Message[]; userInput: string }) => 
        formatChatHistory(input.chatHistory),
      userInput: (input: { chatHistory: Message[]; userInput: string }) => 
        input.userInput,
    },
    customerPrompt,
    chatModel,
    new StringOutputParser(),
  ]);
};

export const createAdminChatChain = () => {
  return RunnableSequence.from([
    {
      chatHistory: (input: { chatHistory: Message[]; userInput: string }) => 
        formatChatHistory(input.chatHistory),
      userInput: (input: { chatHistory: Message[]; userInput: string }) => 
        input.userInput,
    },
    adminPrompt,
    chatModel,
    new StringOutputParser(),
  ]);
};

// Helper function to format chat history
const formatChatHistory = (messages: Message[]): string => {
  return messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");
}; 
