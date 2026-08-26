import { Router } from "express";
import {
  calculateBooking,
  createBooking,
  confirmPayment,
  getBookingById,
  getAdminBookings,
  updateBookingStatus,
  findActiveBooking,
  addItemsToBooking,
  findBookingByRoom,
  verifyRazorpayPayment,
  createRazorpayOrder,
  confirmAddonPayment,
  createAddonOrder,
  reassignRoom,
  getRoomMembership,
  confirmAddonPaymentWithMembership,
} from "../controllers/booking.controller.js";
import { protectAdmin , attachAdminIfPresent} from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { addItemsSchema, addonConfirmSchema, addonOrderSchema, calculateSchema, confirmPaymentSchema, createBookingSchema, createOrderSchema, reassignRoomSchema, updateStatusSchema, verifyPaymentSchema } from "../schemas/booking.schemas.js";

const router = Router();

router.post("/bookings/calculate", attachAdminIfPresent,validate(calculateSchema), calculateBooking);
router.post("/bookings",attachAdminIfPresent, validate(createBookingSchema), createBooking);
router.patch("/admin/bookings/:id/status", protectAdmin, validate(updateStatusSchema), updateBookingStatus);
router.post("/bookings/:id/confirm-payment", protectAdmin, validate(confirmPaymentSchema), confirmPayment);
router.get("/bookings/:id", getBookingById);
router.get("/admin/bookings", protectAdmin, getAdminBookings);

router.get("/bookings/active", findActiveBooking);
router.post("/bookings/:id/add-items", validate(addItemsSchema), addItemsToBooking);
router.get("/bookings/by-room/:roomId", findBookingByRoom);

router.post("/bookings/:id/razorpay-order", validate(createOrderSchema), createRazorpayOrder);
router.post("/bookings/:id/verify-payment", validate(verifyPaymentSchema), verifyRazorpayPayment);

router.post("/bookings/:id/addon-order", validate(addonOrderSchema), createAddonOrder);
router.post("/bookings/:id/addon-confirm", validate(addonConfirmSchema), confirmAddonPayment);

// Admin route to reassign a room for a booking
router.patch("/admin/bookings/:id/reassign-room", protectAdmin, validate(reassignRoomSchema), reassignRoom);

router.get("/bookings/room/:roomId/membership", getRoomMembership);
router.post("/bookings/:id/addon-confirm-membership", confirmAddonPaymentWithMembership);


export default router;
