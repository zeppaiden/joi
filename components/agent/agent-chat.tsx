"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query: userMessage,
          history: messages 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${error.message || "Something went wrong"}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[800px] max-w-4xl mx-auto p-4">
      <Card className="flex-1 mb-4 p-6 overflow-auto">
        <div className="space-y-6">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted prose prose-sm dark:prose-invert"
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                // Allow new line when Shift+Enter is pressed
                return;
              } else {
                // Submit form when only Enter is pressed
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  handleSubmit(e);
                }
              }
            }
          }}
          placeholder="Ask about tickets..."
          disabled={isLoading}
          className="resize-none py-2 min-h-[60px]"
          rows={1}
        />
        <Button type="submit" disabled={isLoading} size="lg">
          Send
        </Button>
      </form>
    </div>
  );
} 