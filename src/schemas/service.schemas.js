import { z } from "zod";

const durationItem = z.object({
  durationMinutes: z.number().positive(),
  price: z.number().nonnegative(),
  isActive: z.boolean().optional(),
});

// service.schema.js
export const createServiceSchema = z.object({
  name: z.string().min(1),
  name_kn: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  description_kn: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  benefits_kn: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  instructions_kn: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  durations: z.array(durationItem).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const durationSchema = z.object({
  durationMinutes: z.number().positive(),
  price: z.number().nonnegative(),
  isActive: z.boolean().optional(),
});