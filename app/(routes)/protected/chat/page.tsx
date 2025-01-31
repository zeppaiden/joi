import { AgentChat } from "@/components/agent/agent-chat";

export default function ChatPage() {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about tickets and get instant answers
        </p>
      </div>
      <AgentChat />
    </div>
  );
} 