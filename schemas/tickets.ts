import { z } from "zod";

// Enum schemas
export const ticketStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

// Base ticket schema for creation/editing
export const ticketFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().optional(),
  status: ticketStatusSchema,
  priority_level: ticketPrioritySchema,
  assigned_to: z.string().uuid().optional().nullable(),
});

// Schema for ticket search/filter params
export const ticketFilterSchema = z.object({
  status: z.array(ticketStatusSchema).optional(),
  priority: z.array(ticketPrioritySchema).optional(),
  assignedTo: z.string().uuid().optional(),
  searchQuery: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["created_at", "updated_at", "priority_level"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// Types derived from schemas
export type TicketFormData = z.infer<typeof ticketFormSchema>;
export type TicketFilterParams = z.infer<typeof ticketFilterSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>; 