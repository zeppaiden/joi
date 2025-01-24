"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, Download, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];
type DBMessage = Database["public"]["Tables"]["messages"]["Row"];
type DBAttachment = Database["public"]["Tables"]["attachments"]["Row"];

type MessageAttachment = DBAttachment & {
  url: string;
};

type Message = DBMessage & {
  user: User;
  attachments?: MessageAttachment[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial messages with attachments
  useEffect(() => {
    const loadMessages = async () => {
      // First get all messages with their users
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          user:users (
            *
          )
        `)
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        return;
      }

      // Then get all attachments for these messages
      const messageIds = messagesData.map(msg => msg.id);
      const { data: attachments, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .in('message_id', messageIds);

      if (attachmentsError) {
        console.error('Error loading attachments:', attachmentsError);
        return;
      }

      // Get signed URLs for all attachments
      const attachmentsWithUrls = await Promise.all(
        (attachments || []).map(async (attachment) => {
          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(attachment.storage_path);
          
          return {
            ...attachment,
            url: publicUrl
          };
        })
      );

      // Group attachments by message_id
      const attachmentsByMessage = attachmentsWithUrls.reduce((acc, attachment) => {
        if (!acc[attachment.message_id]) {
          acc[attachment.message_id] = [];
        }
        acc[attachment.message_id].push(attachment);
        return acc;
      }, {} as Record<string, MessageAttachment[]>);

      // Combine messages with their attachments
      const fullMessages = messagesData.map(msg => ({
        ...msg,
        attachments: attachmentsByMessage[msg.id] || []
      }));

      setMessages(fullMessages);
    };

    loadMessages();
  }, [ticket.id, supabase]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First insert the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: message.trim() || "Attached files", // Use default text if only files
        })
        .select('*, user:users(*)')
        .single();

      if (messageError) throw messageError;

      // Then upload files and create attachment records
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          // Generate a unique file path
          const fileExt = file.name.split('.').pop();
          const filePath = `${ticket.id}/${messageData.id}/${crypto.randomUUID()}.${fileExt}`;

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from('attachments')
            .insert({
              message_id: messageData.id,
              filename: file.name,
              storage_path: filePath,
              content_type: file.type,
              size: file.size
            })
            .select()
            .single();

          if (attachmentError) throw attachmentError;
        }
      }

      // Clear the form
      setMessage("");
      setSelectedFiles([]);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const MessageContent = ({ message }: { message: Message }) => {
    return (
      <div className="space-y-2">
        <div className="whitespace-pre-wrap break-all">
          {message.content}
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 mt-2 border-t pt-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-background/50 rounded p-2 text-sm"
              >
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">
                  {attachment.filename}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  asChild
                >
                  <a
                    href={attachment.url}
                    download={attachment.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
            // Wait a bit for attachments to be created
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch the complete message with user details
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                *,
                user:users (
                  *
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (messageError) {
              console.error('Error fetching message:', messageError);
              return;
            }

            // Fetch attachments
            const { data: attachments, error: attachmentsError } = await supabase
              .from('attachments')
              .select('*')
              .eq('message_id', payload.new.id);

            if (attachmentsError) {
              console.error('Error fetching attachments:', attachmentsError);
              return;
            }

            if (messageData) {
              // Get signed URLs for attachments
              const attachmentsWithUrls = await Promise.all(
                (attachments || []).map(async (attachment) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(attachment.storage_path);
                  
                  return {
                    ...attachment,
                    url: publicUrl
                  };
                })
              );

              const fullMessage: Message = {
                ...messageData,
                attachments: attachmentsWithUrls
              };

              setMessages(prev => [...prev, fullMessage]);
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

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {!ticket.assigned_to && (
        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground mb-4">
          This ticket has not been assigned to a support agent yet. 
          Once an agent is assigned, they will be able to assist you.
        </div>
      )}

      <ScrollArea className="flex-1 border rounded-lg p-4 min-h-0">
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
                <MessageContent message={msg} />
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
        className="space-y-2 mt-4"
      >
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              placeholder={ticket.assigned_to 
                ? "Type your message..." 
                : "Waiting for an agent to be assigned..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!ticket.assigned_to}
              className="flex-shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="submit"
              className="flex-shrink-0"
              disabled={isSending || (!message.trim() && selectedFiles.length === 0) || !ticket.assigned_to}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
          multiple
        />
      </form>
    </div>
  );
} 