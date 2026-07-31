import { z } from "zod";

export const createCouponSchema = z.object({
  customerId: z.string().min(1),
  discountPercent: z.number().min(1).max(100),
  expiryDays: z.number().positive().optional(),
});