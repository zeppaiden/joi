"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  role: 'admin' | 'agent' | 'customer';
};

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  user: User;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  organizations?: {
    id: string;
    name: string;
  };
  assigned_to?: {
    id: string;
    email: string;
  };
};

interface CustomerTicketChatProps {
  ticket: Ticket;
  initialMessages: Message[];
}

export function CustomerTicketChat({ ticket, initialMessages }: CustomerTicketChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete message with user details
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                user:users (
                  id,
                  email,
                  role
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages(prev => [...prev, data as Message]);
              scrollToBottom();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id, supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: message.trim(),
      });

      if (error) throw error;

      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {!ticket.assigned_to && (
        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          This ticket has not been assigned to a support agent yet. 
          Once an agent is assigned, they will be able to assist you.
        </div>
      )}

      <ScrollArea className="h-[400px] border rounded-lg p-4">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full",
                msg.user.role === "customer" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3 overflow-hidden",
                  msg.user.role === "customer"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="text-xs opacity-70 mb-1 truncate">
                  {msg.user.email} • {new Date(msg.created_at).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap break-all">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2"
      >
        <Textarea
          placeholder={ticket.assigned_to 
            ? "Type your message..." 
            : "Waiting for an agent to be assigned..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          type="submit"
          className="flex-shrink-0"
          disabled={isSending || !message.trim() || !ticket.assigned_to}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
} 