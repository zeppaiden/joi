"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Plus, X } from "lucide-react";
import { Database } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  role: 'admin' | 'agent' | 'customer';
};

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  user: User;
};

type Tag = Database["public"]["Tables"]["tags"]["Row"];

type InternalNote = Database["public"]["Tables"]["internal_notes"]["Row"] & {
  user: User;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  customer?: User;
  agent?: User;
  tags?: Tag[];
};

type Params = {
  id: string;
};

const DEFAULT_TAGS = [
  { id: 'default-bug', name: 'bug' },
  { id: 'default-payment', name: 'payment processing' },
  { id: 'default-feature', name: 'feature request' },
  { id: 'default-account', name: 'account access' },
  { id: 'default-technical', name: 'technical support' },
  { id: 'default-billing', name: 'billing' },
];

export default function TicketDetailsPage() {
  const router = useRouter();
  const { id } = useParams() as Params;
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [tags, setTags] = useState<Tag[]>([]);
  const [ticketTags, setTicketTags] = useState<Tag[]>([]);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState("");

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load ticket, messages, tags, and notes
  useEffect(() => {
    async function loadData() {
      try {
        // Get ticket with customer and agent details
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            customer:users!tickets_customer_id_fkey(id, email, role),
            agent:users!tickets_assigned_to_fkey(id, email, role)
          `)
          .eq('id', id)
          .single();

        if (ticketError) throw ticketError;

        // Get messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            *,
            user:users!messages_user_id_fkey(id, email, role)
          `)
          .eq('ticket_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        // Get all available tags
        const { data: tagsData } = await supabase
          .from('tags')
          .select('*')
          .is('deleted_at', null)
          .order('name');

        // Get ticket's tags
        const { data: ticketTagsData } = await supabase
          .from('ticket_tags')
          .select(`
            tag:tags(*)
          `)
          .eq('ticket_id', id);

        // Extract the tags from the join query
        const ticketTags = ticketTagsData?.map(tt => tt.tag) || [];

        // Get internal notes
        const { data: notesData } = await supabase
          .from('internal_notes')
          .select(`
            *,
            user:users!internal_notes_created_by_fkey(id, email, role)
          `)
          .eq('ticket_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        setTicket(ticketData as unknown as Ticket);
        setMessages(messagesData as unknown as Message[]);
        setTags(tagsData || []);
        setTicketTags(ticketTags);
        setInternalNotes(notesData as unknown as InternalNote[] || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load ticket data",
          variant: "destructive",
        });
      }
    }

    loadData();
  }, [id, supabase, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete message with user details
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                user:users!messages_user_id_fkey(id, email, role)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages(prev => [...prev, data as unknown as Message]);
              scrollToBottom();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !ticket) return;

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

  // Create new tag
  const createTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First check if tag already exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('*')
        .eq('name', newTagName.trim())
        .is('deleted_at', null)
        .maybeSingle();  // Use maybeSingle instead of single to avoid error if no match

      if (existingTag) {
        // Check if this existing tag is already on the ticket
        const isTagOnTicket = ticketTags.some(t => t.id === existingTag.id);
        
        if (isTagOnTicket) {
          toast({
            title: "Tag already added",
            description: "This tag is already on the ticket",
            variant: "default",
          });
          return;
        }
        
        // If tag exists but not on ticket, add it
        await addTagToTicket(existingTag.id);
        setNewTagName("");
        return;
      }

      // Create new tag if it doesn't exist
      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tag:', error);
        throw error;
      }

      // Update local state
      setTags(prev => [...prev, tag]);
      setNewTagName("");
      
      // Add new tag to ticket
      await addTagToTicket(tag.id);
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  // Delete tag
  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tagId);

      if (error) throw error;

      // Remove from local state
      setTags(prev => prev.filter(t => t.id !== tagId));
      setTicketTags(prev => prev.filter(t => t.id !== tagId));

      toast({
        title: "Success",
        description: "Tag deleted successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  // Add tag to ticket
  const addTagToTicket = async (tagId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First check if the tag is already added to the ticket
      const { data: existingTicketTag } = await supabase
        .from('ticket_tags')
        .select('*')
        .eq('ticket_id', id)
        .eq('tag_id', tagId)
        .single();

      if (existingTicketTag) {
        toast({
          title: "Tag already added",
          description: "This tag is already on the ticket",
          variant: "default",
        });
        return;
      }

      const { data: _data, error } = await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: id,
          tag_id: tagId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newTag = tags.find(t => t.id === tagId);
      if (newTag) {
        setTicketTags(prev => [...prev, newTag]);
        toast({
          title: "Success",
          description: "Tag added successfully",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    }
  };

  // Remove tag from ticket
  const removeTagFromTicket = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_tags')
        .delete()
        .eq('ticket_id', id)
        .eq('tag_id', tagId);

      if (error) throw error;

      setTicketTags(prev => prev.filter(t => t.id !== tagId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
    }
  };

  // Add internal note
  const addInternalNote = async () => {
    if (!newNote.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: note, error } = await supabase
        .from('internal_notes')
        .insert({
          ticket_id: id,
          content: newNote.trim(),
          created_by: user.id,
        })
        .select(`
          *,
          user:users!internal_notes_created_by_fkey(id, email, role)
        `)
        .single();

      if (error) throw error;

      setInternalNotes(prev => [note as unknown as InternalNote, ...prev]);
      setNewNote("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Description Skeleton */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </CardContent>
            </Card>

            {/* Chat Skeleton */}
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] border rounded-lg mb-4 p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-start">
                      <div className="max-w-[80%] space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-16 w-[300px]" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[80%] space-y-2">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-12 w-[250px]" />
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[80%] space-y-2">
                        <Skeleton className="h-4 w-[220px]" />
                        <Skeleton className="h-20 w-[350px]" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Skeleton className="h-[80px] flex-1" />
                  <Skeleton className="h-[80px] w-10" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeletons */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-[200px]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-[180px]" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-5 w-[160px]" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-[140px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <RoleGate allowedRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <Badge variant={
            ticket.priority_level === "urgent" ? "destructive" :
            ticket.priority_level === "high" ? "destructive" :
            ticket.priority_level === "medium" ? "secondary" :
            "default"
          }>
            {ticket.priority_level}
          </Badge>
          <Badge variant={
            ticket.status === "open" ? "default" :
            ticket.status === "in_progress" ? "secondary" :
            ticket.status === "resolved" ? "secondary" :
            "outline"
          }>
            {ticket.status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Ticket Details */}
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Chat Section */}
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                {!ticket.agent && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4 text-sm">
                    Please assign an agent to this ticket before sending messages.
                    This ensures proper ticket handling and customer support.
                  </div>
                )}
                <ScrollArea className="h-[400px] border rounded-lg mb-4 p-4">
                  <div className="flex flex-col space-y-4 w-full">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex w-full",
                          msg.user.role === "customer" ? "justify-start" : "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3 overflow-hidden",
                            msg.user.role === "customer"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
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
                    placeholder={ticket.agent 
                      ? "Type your message..." 
                      : "Assign an agent before sending messages..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[80px]"
                    disabled={!ticket.agent}
                  />
                  <Button
                    type="submit"
                    className="flex-shrink-0"
                    disabled={isSending || !message.trim() || !ticket.agent}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Customer Information */}
          <div className="space-y-6">
            {/* Tags Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Tags</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTagDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ticketTags.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No tags yet. Click + to add tags.
                    </div>
                  ) : (
                    ticketTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="flex items-center gap-1 group relative pr-6"
                      >
                        {tag.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 absolute right-1 opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            const shouldDelete = window.confirm('Do you want to delete this tag completely? Click Cancel to just remove it from this ticket.');
                            if (shouldDelete) {
                              deleteTag(tag.id);
                            } else {
                              removeTagFromTicket(tag.id);
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <Button
                    className="flex-shrink-0"
                    onClick={addInternalNote}
                    disabled={!newNote.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-4">
                    {internalNotes.map((note) => (
                      <div key={note.id} className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          {note.user.email} • {new Date(note.created_at).toLocaleString()}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Existing Customer Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Email</dt>
                    <dd>{ticket.customer?.email}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Existing Ticket Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Created</dt>
                    <dd>{new Date(ticket.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Last Updated</dt>
                    <dd>{new Date(ticket.updated_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Assigned To</dt>
                    <dd>{ticket.agent?.email || 'Unassigned'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tag Selection Dialog */}
      <CommandDialog modal open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <Command shouldFilter={false} className="rounded-lg border shadow-md">
          <CommandInput 
            autoFocus
            placeholder="Search tags or create new..." 
            value={newTagName} 
            onValueChange={setNewTagName} 
          />
          <CommandList>
            {newTagName.trim() && (
              <CommandEmpty>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={createTag}
                >
                  Create tag "{newTagName}"
                </Button>
              </CommandEmpty>
            )}
            <CommandGroup heading="Common Tags">
              {DEFAULT_TAGS
                .filter(tag => !ticketTags.some(t => t.name.toLowerCase() === tag.name.toLowerCase()))
                .map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={async () => {
                      // Create the tag if it doesn't exist
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      const { data: existingTag } = await supabase
                        .from('tags')
                        .select('*')
                        .eq('name', tag.name)
                        .is('deleted_at', null)
                        .maybeSingle();

                      if (existingTag) {
                        await addTagToTicket(existingTag.id);
                      } else {
                        const { data: newTag, error } = await supabase
                          .from('tags')
                          .insert({
                            name: tag.name,
                            created_by: user.id,
                          })
                          .select()
                          .single();

                        if (!error && newTag) {
                          setTags(prev => [...prev, newTag]);
                          await addTagToTicket(newTag.id);
                        }
                      }
                      setIsTagDialogOpen(false);
                    }}
                  >
                    {tag.name}
                  </CommandItem>
                ))}
            </CommandGroup>
            {tags.length > 0 && (
              <CommandGroup heading="Custom Tags">
                {tags
                  .filter(tag => !ticketTags.some(t => t.id === tag.id))
                  .filter(tag => !DEFAULT_TAGS.some(d => d.name.toLowerCase() === tag.name.toLowerCase()))
                  .map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => {
                        addTagToTicket(tag.id);
                        setIsTagDialogOpen(false);
                      }}
                    >
                      {tag.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </RoleGate>
  );
} 