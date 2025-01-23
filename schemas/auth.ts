import { z } from 'zod';

export const registrationSchema = z.object({
  role: z.enum(['admin', 'agent', 'customer']),
  organizationName: z.string().min(1).optional(),
  inviteCode: z.string().optional(),
});

export type RegistrationPayload = z.infer<typeof registrationSchema>; 