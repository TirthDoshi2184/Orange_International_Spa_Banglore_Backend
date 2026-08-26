import { z } from "zod";

const serviceItem = z.object({
  serviceId: z.string().min(1),
  durationId: z.string().min(1),
});
const mocktailItem = z.object({
  mocktailId: z.string().min(1),
  qty: z.number().positive(),
});

export const calculateSchema = z.object({
  services: z.array(serviceItem).optional().default([]),
  mocktails: z.array(mocktailItem).optional().default([]),
  couponCode: z.string().optional(),
  manualDiscountPercent: z.number().min(0).max(100).optional(),
});
export const createBookingSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    mobileNumber: z.string().min(10),
    email: z.string().email().optional(),
    gender: z.string().optional(),
  }),
  services: z.array(serviceItem).optional().default([]),
  mocktails: z.array(mocktailItem).optional().default([]),
  timeSlotId: z.string().min(1),
  couponCode: z.string().optional(),
  manualDiscountPercent: z.number().min(0).max(100).optional(),
  specialInstructions: z.string().optional(),
});
export const updateStatusSchema = z.object({
  bookingStatus: z.enum(["waiting", "in-service", "completed", "cancelled"]),
  roomId: z.string().optional(),
  roomType: z.enum(["standard", "vip"]).optional(),
});

export const addItemsSchema = z.object({
  services: z.array(serviceItem).optional().default([]),
  mocktails: z.array(mocktailItem).optional().default([]),
}).refine((d) => d.services.length > 0 || d.mocktails.length > 0, {
  message: "At least one service or mocktail must be added",
});

export const confirmPaymentSchema = z.object({
     amount: z.number().positive(),
     method: z.enum(["cash", "card", "razorpay", "upi", "other", "membership_credit"]),
     reference: z.string().optional(),
   });

   export const createOrderSchema = z.object({
  amount: z.number().positive(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  amount: z.number().positive(),
});

export const addonOrderSchema = z.object({
  services: z.array(serviceItem).optional().default([]),
  mocktails: z.array(mocktailItem).optional().default([]),
}).refine((d) => d.services.length > 0 || d.mocktails.length > 0, {
  message: "At least one service or mocktail must be selected",
});

export const addonConfirmSchema = z.object({
  services: z.array(serviceItem).optional().default([]),
  mocktails: z.array(mocktailItem).optional().default([]),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const reassignRoomSchema = z.object({
  roomId: z.string().min(1),
});

