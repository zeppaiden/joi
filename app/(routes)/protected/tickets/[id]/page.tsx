"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Plus, X, Paperclip, ListChecks } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

type Email = Database["public"]["Tables"]["emails"]["Row"] & {
  user: User;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  organizations?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    email: string;
  };
  phone?: string;
  tags?: Tag[];
};

type Params = {
  id: string;
};

const TAG_COLORS: Record<string, { bg: string, text: string, hover: string }> = {
  'Bug': { bg: 'bg-red-100', text: 'text-red-700', hover: 'hover:bg-red-200' },
  'Payment Processing': { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
  'Feature Request': { bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-200' },
  'Account Access': { bg: 'bg-yellow-100', text: 'text-yellow-700', hover: 'hover:bg-yellow-200' },
  'Technical Support': { bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:bg-purple-200' },
  'Billing': { bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:bg-orange-200' },
};

const MESSAGE_TEMPLATES = [
  {
    title: "Acknowledge Receipt",
    message: "Thank you for reaching out. I'm reviewing your request and will get back to you shortly."
  },
  {
    title: "Request More Information",
    message: "To better assist you, could you please provide more details about the issue you're experiencing?"
  },
  {
    title: "Resolution Confirmation",
    message: "I believe I've resolved the issue you reported. Could you please confirm if everything is working as expected now?"
  },
  {
    title: "Escalation Notice",
    message: "I'm escalating this to our specialized team who will be better equipped to handle your request. They will contact you shortly."
  },
  {
    title: "Follow Up",
    message: "I'm following up on your recent request. Have you had a chance to try the solution we discussed?"
  }
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
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: ""
  });
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

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
        const { data: ticketTagsData, error: ticketTagsError } = await supabase
          .from('ticket_tags')
          .select(`
            tags (
              id,
              name,
              created_at,
              created_by
            )
          `)
          .eq('ticket_id', id);

        if (ticketTagsError) throw ticketTagsError;

        // Extract the tags from the join query and filter out any null values
        const ticketTags = ticketTagsData
          ?.map(tt => tt.tags)
          .filter((tag): tag is Tag => tag !== null) || [];

        // Get internal notes
        const { data: notesData, error: notesError } = await supabase
          .from('internal_notes')
          .select(`
            *,
            user:users!internal_notes_created_by_fkey(id, email, role)
          `)
          .eq('ticket_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        // Get emails
        const { data: emailsData, error: emailsError } = await supabase
          .from('emails')
          .select(`
            *,
            user:users!emails_sent_by_fkey(id, email, role)
          `)
          .eq('ticket_id', id)
          .order('created_at', { ascending: false });

        if (emailsError) throw emailsError;

        setTicket(ticketData as unknown as Ticket);
        setMessages(messagesData as unknown as Message[]);
        setTags(tagsData || []);
        setTicketTags(ticketTags);
        setInternalNotes(notesData as unknown as InternalNote[] || []);
        setEmails(emailsData as unknown as Email[]);
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

  // Subscribe to internal notes updates
  useEffect(() => {
    const channel = supabase
      .channel(`internal_notes:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_notes',
          filter: `ticket_id=eq.${id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete note with user details
            const { data } = await supabase
              .from('internal_notes')
              .select(`
                *,
                user:users (id, email, role)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setInternalNotes(prev => [data as InternalNote, ...prev]);
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
  const createTag = async (name: string) => {
    try {
      // Check if this is a template tag and use its exact casing
      const templateTag = Object.keys(TAG_COLORS).find(
        tagName => tagName.toLowerCase() === name.toLowerCase()
      );
      const tagName = templateTag || name.trim();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First check if tag already exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('*')
        .eq('name', tagName)
        .is('deleted_at', null)
        .maybeSingle();

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
          name: tagName,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTags(prev => [...prev, tag]);
      setNewTagName("");
      
      // Add new tag to ticket
      await addTagToTicket(tag.id);
      
      toast({
        title: "Success",
        description: "Tag created and added to ticket",
      });
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

      const { error } = await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: id,
          tag_id: tagId,
          created_by: user.id,
        });

      if (error) throw error;

      // Get the tag details
      const { data: tag } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      if (tag) {
        setTicketTags(prev => [...prev, tag]);
        setIsTagDialogOpen(false);
        toast({
          title: "Success",
          description: "Tag added to ticket",
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
  const addInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isAddingNote) return;

    setIsAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('internal_notes')
        .insert({
          ticket_id: id,
          content: newNote.trim(),
          created_by: user.id,
        });

      if (error) throw error;

      setNewNote("");
      toast({
        title: "Success",
        description: "Internal note added",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add internal note",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Send email
  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('emails').insert({
        ticket_id: id,
        sent_by: user.id,
        to_email: emailForm.to,
        cc: emailForm.cc || null,
        bcc: emailForm.bcc || null,
        subject: emailForm.subject,
        body: emailForm.body,
        status: 'sent'
      });

      if (error) throw error;

      setIsEmailDialogOpen(false);
      setEmailForm({
        to: "",
        cc: "",
        bcc: "",
        subject: "",
        body: ""
      });

      toast({
        title: "Success",
        description: "Email sent successfully",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    }
  };

  // Escalate ticket
  const escalateTicket = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update ticket priority and add an internal note about escalation
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          priority_level: 'urgent',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (ticketError) throw ticketError;

      // Add internal note about escalation
      const { error: noteError } = await supabase
        .from('internal_notes')
        .insert({
          ticket_id: id,
          content: `Ticket escalated to urgent priority by ${user.email}`,
          created_by: user.id
        });

      if (noteError) throw noteError;

      // Update local state
      setTicket(prev => prev ? { ...prev, priority_level: 'urgent' } : null);

      toast({
        title: "Success",
        description: "Ticket has been escalated",
      });
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to escalate ticket",
        variant: "destructive",
      });
    }
  };

  // Resolve ticket
  const resolveTicket = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update ticket status to resolved
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (ticketError) throw ticketError;

      // Add internal note about resolution
      const { error: noteError } = await supabase
        .from('internal_notes')
        .insert({
          ticket_id: id,
          content: `Ticket resolved by ${user.email}`,
          created_by: user.id
        });

      if (noteError) throw noteError;

      // Update local state
      setTicket(prev => prev ? { ...prev, status: 'resolved' } : null);

      toast({
        title: "Success",
        description: "Ticket has been resolved",
      });

      // Redirect to inbox after short delay
      setTimeout(() => {
        router.push('/protected/inbox');
      }, 1500);
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({
        title: "Error",
        description: "Failed to resolve ticket",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-[200px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </div>

        {/* Top Section - Customer and Ticket Info Skeletons */}
        <div className="grid grid-cols-2 gap-6">
          {/* Customer Information Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-5 w-[200px]" />
                </div>
                <div>
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-5 w-[250px]" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-5 w-[180px]" />
                </div>
                <div>
                  <Skeleton className="h-4 w-14 mb-1" />
                  <Skeleton className="h-5 w-[150px]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-[90%] mt-1" />
                  <Skeleton className="h-5 w-[80%] mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-14 mb-1" />
                    <Skeleton className="h-5 w-[150px]" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-5 w-[150px]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message History Skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-10" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bottom Section - Internal Notes and Tags Skeletons */}
        <div className="grid grid-cols-2 gap-6">
          {/* Internal Notes Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-10" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags Skeleton */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Tags</CardTitle>
              <Skeleton className="h-8 w-8" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/protected/inbox')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Ticket {ticket.id}</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={escalateTicket}
              disabled={!ticket || ticket.priority_level === 'urgent'}
            >
              Escalate Ticket
            </Button>
            <Button 
              variant="default"
              onClick={resolveTicket}
              disabled={!ticket || ticket.status === 'resolved'}
            >
              Resolve Ticket
            </Button>
          </div>
        </div>

        {/* Top Section - Customer and Ticket Info */}
        <div className="grid grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd>{ticket.customer?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd>{ticket.customer?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Company</dt>
                  <dd>{ticket.organizations?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd>{ticket.phone || 'Not provided'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant={
                    ticket.status === "open" ? "default" :
                    ticket.status === "in_progress" ? "secondary" :
                    ticket.status === "resolved" ? "secondary" :
                    "outline"
                  }>
                    {ticket.status?.replace('_', ' ')}
                  </Badge>
                  <Badge variant={
                    ticket.priority_level === "urgent" ? "destructive" :
                    ticket.priority_level === "high" ? "destructive" :
                    ticket.priority_level === "medium" ? "secondary" :
                    "default"
                  }>
                    {ticket.priority_level} priority
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Subject</h3>
                  <p>{ticket.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="whitespace-pre-wrap">{ticket.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                    <p>{new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                    <p>{new Date(ticket.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message History */}
        <Card>
          <CardHeader className="pb-3">
            <Tabs defaultValue="messages">
              <TabsList>
                <TabsTrigger value="messages">Message History</TabsTrigger>
                <TabsTrigger value="email">Email History</TabsTrigger>
              </TabsList>
              
              {/* Messages Tab Content */}
              <TabsContent value="messages">
                {!ticket.assigned_to && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4 text-sm">
                    Please assign an agent to this ticket before sending messages.
                    This ensures proper ticket handling and customer support.
                  </div>
                )}
                <ScrollArea className="h-[400px] border rounded-lg mb-4 p-4">
                  <div className="flex flex-col space-y-4">
                    {messages?.map((msg) => (
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
                          <div className="text-xs opacity-70 mb-1">
                            {msg.user.email} • {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="space-y-6">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!message.trim() || isSending) return;
                    await sendMessage();
                  }} className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        disabled={!ticket?.assigned_to || isSending}
                        onClick={() => setIsTemplateDialogOpen(true)}
                      >
                        <ListChecks className="w-4 h-4" />
                      </Button>
                      <Textarea
                        placeholder={ticket?.assigned_to 
                          ? "Type your message..." 
                          : "Assign an agent before sending messages..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[80px]"
                        disabled={!ticket?.assigned_to || isSending}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!message.trim() || isSending) return;
                            sendMessage();
                          }
                        }}
                      />
                      <Button 
                        type="submit"
                        className="flex-shrink-0"
                        disabled={!ticket?.assigned_to || isSending || !message.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>

              {/* Email Tab Content */}
              <TabsContent value="email" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Email History</h3>
                  <Button onClick={() => {
                    setEmailForm(prev => ({
                      ...prev,
                      to: ticket.customer?.email || "",
                      subject: `Re: ${ticket.title}`
                    }));
                    setIsEmailDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Email
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {emails.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No emails sent yet
                      </div>
                    ) : (
                      emails.map((email) => (
                        <Card key={email.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <CardTitle>{email.subject}</CardTitle>
                                <div className="text-sm text-muted-foreground">
                                  From: {email.user.email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  To: {email.to_email}
                                </div>
                                {email.cc && (
                                  <div className="text-sm text-muted-foreground">
                                    CC: {email.cc}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(email.created_at).toLocaleString()}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap">{email.body}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Bottom Section - Internal Notes and Tags */}
        <div className="grid grid-cols-2 gap-6">
          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form onSubmit={addInternalNote} className="flex gap-2">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addInternalNote(e);
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    className="flex-shrink-0"
                    disabled={isAddingNote || !newNote.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </form>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {internalNotes.map((note) => (
                      <div key={note.id} className="bg-muted rounded-lg p-3">
                        <div className="text-sm font-medium">{note.user.email}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {new Date(note.created_at).toLocaleString()}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
                      className={cn(
                        "flex items-center gap-1 group relative pr-6",
                        // Find matching template tag (case-insensitive)
                        Object.entries(TAG_COLORS).find(
                          ([name]) => name.toLowerCase() === tag.name.toLowerCase()
                        )
                          ? cn(
                              Object.entries(TAG_COLORS).find(
                                ([name]) => name.toLowerCase() === tag.name.toLowerCase()
                              )![1].bg,
                              Object.entries(TAG_COLORS).find(
                                ([name]) => name.toLowerCase() === tag.name.toLowerCase()
                              )![1].text,
                              Object.entries(TAG_COLORS).find(
                                ([name]) => name.toLowerCase() === tag.name.toLowerCase()
                              )![1].hover
                            )
                          : "bg-secondary hover:bg-secondary/80" // Default style for custom tags
                      )}
                    >
                      {tag.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 absolute right-1 opacity-70 hover:opacity-100"
                        onClick={() => removeTagFromTicket(tag.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tag Selection Dialog */}
      <CommandDialog modal open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <Command shouldFilter={false} className="rounded-lg border shadow-md">
          <div className="border-b px-3 py-2">
            <h2 className="text-sm font-medium">Add Tag</h2>
          </div>
          <div className="p-2">
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Type to create a custom tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent the Command component from handling the Enter key
                  e.stopPropagation();
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={!newTagName.trim()}
                onClick={() => {
                  if (newTagName.trim()) {
                    createTag(newTagName);
                    setIsTagDialogOpen(false);
                  }
                }}
              >
                Create
              </Button>
            </div>
          </div>
          <div className="px-2 pb-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or choose from template tags
                </span>
              </div>
            </div>
          </div>
          <CommandList>
            <CommandGroup>
              {Object.entries(TAG_COLORS)
                .filter(([name]) => !ticketTags.some(t => t.name.toLowerCase() === name.toLowerCase()))
                .map(([name, { bg, text }]) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      createTag(name);
                      setIsTagDialogOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2",
                      text
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      bg
                    )} />
                    {name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      {/* Email Composition Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Send an email to the customer regarding this ticket
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendEmail} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cc">CC</Label>
                  <Input
                    id="cc"
                    value={emailForm.cc}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, cc: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bcc">BCC</Label>
                  <Input
                    id="bcc"
                    value={emailForm.bcc}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, bcc: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={emailForm.body}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
                  className="min-h-[200px]"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Email</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message Template Dialog */}
      <CommandDialog modal open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <Command shouldFilter={false} className="rounded-lg border shadow-md">
          <div className="border-b px-3 py-2">
            <h2 className="text-sm font-medium">Select Message Template</h2>
          </div>
          <CommandList>
            <CommandGroup>
              {MESSAGE_TEMPLATES.map((template) => (
                <CommandItem
                  key={template.title}
                  value={template.title}
                  onSelect={() => {
                    setMessage(template.message);
                    setIsTemplateDialogOpen(false);
                  }}
                  className="flex flex-col items-start gap-1"
                >
                  <div className="font-medium">{template.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {template.message}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </RoleGate>
  );
} 