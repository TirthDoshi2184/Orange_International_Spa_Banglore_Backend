import { z } from "zod";

export const createPackageSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  creditAmount: z.number().positive(),
  validityDays: z.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const updatePackageSchema = createPackageSchema.partial();

export const enrollMembershipSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    mobileNumber: z.string().min(10),
    email: z.string().email().optional(),
    gender: z.string().optional(),
  }),
  packageId: z.string().min(1),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "upi", "razorpay", "other"]),
  reference: z.string().optional(),
});

export const rechargeSchema = z.object({
  packageId: z.string().min(1),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "upi", "razorpay", "other"]),
  reference: z.string().optional(),
});

export const adjustSchema = z.object({
  amount: z.number().refine((v) => v !== 0, "Amount cannot be zero"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});

// membership.schemas.js
export const collectDueSchema = z.object({
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "upi", "razorpay", "other"]),
  reference: z.string().optional(),
});