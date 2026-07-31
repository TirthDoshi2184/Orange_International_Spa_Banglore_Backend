import { z } from "zod";

export const createTimeSlotSchema = z.object({
  time: z.string().min(1),
  maxCapacity: z.number().positive(),
  isActive: z.boolean().optional(),
});

export const updateTimeSlotSchema = createTimeSlotSchema.partial();