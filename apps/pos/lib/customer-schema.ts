import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(3).max(30).regex(/^\d+$/),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  taxId: z.string().trim().max(40).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});
