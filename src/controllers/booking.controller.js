import Service from "../models/Service.js";
import ServiceDuration from "../models/ServiceDuration.js";
import Mocktail from "../models/Mocktail.js";
import Customer from "../models/Customer.js";
import Coupon from "../models/Coupon.js";
import Booking from "../models/Booking.js";
import TimeSlot from "../models/TimeSlot.js";
import { calculateTotals } from "../services/pricing.js";
import { generateBookingIdentifiers, getTodayRange } from "../utils/generateIds.js";
import AddonOrder from "../models/AddOnOrder.js";

import crypto from "crypto";
import { razorpay } from "../services/razorpay.js";

import Membership from "../models/Membership.js";
import { assignAvailableRoom } from "../utils/generateIds.js";

import { deductCredit, findMembershipByCustomerId, reverseMembershipDeduction } from "../services/membership.services.js";

const GST_RATE = Number(process.env.GST_RATE || 5);

// Shared: re-fetch authoritative prices from DB, never trust client-sent prices
const resolvePricing = async ({ services = [], mocktails = [], couponCode, customerId }) => {
  const durationIds = services.map((s) => s.durationId);
  const durations = await ServiceDuration.find({ _id: { $in: durationIds }, isActive: true });

  const resolvedServices = services.map((s) => {
    const d = durations.find((x) => x._id.toString() === s.durationId);
    if (!d) throw { statusCode: 400, message: "Invalid or inactive service duration" };
    return { serviceId: s.serviceId, durationId: s.durationId, price: d.price };
  });

  const mocktailIds = mocktails.map((m) => m.mocktailId);
  const mocktailDocs = await Mocktail.find({ _id: { $in: mocktailIds }, isAvailable: true });

  const resolvedMocktails = mocktails.map((m) => {
    const doc = mocktailDocs.find((x) => x._id.toString() === m.mocktailId);
    if (!doc) throw { statusCode: 400, message: "Invalid or unavailable mocktail" };
    return { mocktailId: m.mocktailId, qty: m.qty, price: doc.price * m.qty };
  });

  const servicesTotal = resolvedServices.reduce((sum, s) => sum + s.price, 0);
  const mocktailsTotal = resolvedMocktails.reduce((sum, m) => sum + m.price, 0);

   let discountPercent = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) throw { statusCode: 400, message: "Invalid coupon" };
    if (coupon.isUsed) throw { statusCode: 400, message: "Coupon already used" };
    if (coupon.expiryDate < new Date()) throw { statusCode: 400, message: "Coupon expired" };
    if (customerId && coupon.customerId.toString() !== customerId.toString()) {
      throw { statusCode: 400, message: "Coupon not valid for this customer" };
    }
    discountPercent = coupon.discountPercent;
  }
  const totals = calculateTotals({ servicesTotal, mocktailsTotal, discountPercent, gstRate: GST_RATE });
  return { resolvedServices, resolvedMocktails, coupon, totals };
};

export const calculateBooking = async (req, res, next) => {
  try {
    const { totals } = await resolvePricing(req.body);
    res.json({ success: true, data: totals });
  } catch (err) { next(err); }
};

// createBooking — resolve customer BEFORE pricing, then pass customerId in
export const createBooking = async (req, res, next) => {
  try {
    const { customer, services, mocktails, timeSlotId, couponCode, specialInstructions } = req.body;

    const slot = await TimeSlot.findOne({ _id: timeSlotId, isActive: true, isDisabledToday: false });
    if (!slot) throw { statusCode: 400, message: "Time slot unavailable" };

    const { start, end } = getTodayRange();
    const bookedCount = await Booking.countDocuments({
      timeSlot: slot._id, bookingDate: { $gte: start, $lte: end }, bookingStatus: { $ne: "cancelled" },
    });
    if (bookedCount >= slot.maxCapacity) throw { statusCode: 400, message: "Time slot full" };

    let customerDoc = await Customer.findOne({ mobileNumber: customer.mobileNumber });
    if (!customerDoc) customerDoc = await Customer.create(customer);

    const { resolvedServices, resolvedMocktails, coupon, totals } =
      await resolvePricing({ services, mocktails, couponCode, customerId: customerDoc._id });
    const { bookingNumber, queueNumber } = await generateBookingIdentifiers();

    const booking = await Booking.create({
      bookingNumber,
      customerId: customerDoc._id,
      services: resolvedServices,
      mocktails: resolvedMocktails,
      timeSlot: slot._id,
      subtotal: totals.subtotal,
      gst: totals.gst,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      couponUsed: coupon ? coupon._id : null,
      queueNumber,
      specialInstructions,
    });

    customerDoc.visitHistory.push(booking._id);
    await customerDoc.save();

     if (coupon) {
      coupon.isUsed = true;
      await coupon.save();
    }

   // Surface the initial order on the Live Orders board too — not just room add-ons.
   // Needs names, which resolvedServices/resolvedMocktails don't carry, so populate first.
   const populatedForOrder = await booking.populate([
     { path: "services.serviceId", select: "name" },
     { path: "mocktails.mocktailId", select: "name" },
   ]);

   const initialOrderItems = [
     ...populatedForOrder.services.map((s) => ({
       type: "service", refId: s.serviceId._id, name: s.serviceId.name, price: s.price, qty: 1,     })),
     ...populatedForOrder.mocktails.map((m) => ({
       type: "mocktail", refId: m.mocktailId._id, name: m.mocktailId.name, price: m.price, qty: m.qty,
     })),
   ];

   if (initialOrderItems.length > 0) {
     await AddonOrder.create({
       bookingId: booking._id,
       roomId: null, // no room yet — assigned later at check-in
       items: initialOrderItems,
       amount: totals.subtotal,
       source: "initial",
     });
   }

    res.status(201).json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// TODO (Stage 3): replace with real Razorpay order + signature verification
export const confirmPayment = async (req, res, next) => {
  try {
    const { amount, method, reference } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };

    let paymentEntry = { amount, method, reference };

    if (method === "membership_credit") {
      const membership = await Membership.findOne({ customerId: booking.customerId });
      if (!membership) throw { statusCode: 400, message: "This customer does not have a membership" };

      // deductCredit throws a clean {statusCode, message} on insufficient balance —
      // it propagates straight to the error handler, nothing gets written to the booking.
      const { transaction } = await deductCredit({
        membershipId: membership._id,
        amount,
        type: "service_deduction",
        bookingId: booking._id,
        performedBy: req.admin.id,
      });

      paymentEntry = {
        amount,
        method: "membership_credit",
        reference: membership.membershipId,
        membershipTxnId: transaction._id,
      };
    }

    booking.paymentHistory.push(paymentEntry);

    const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    booking.paymentStatus =
      totalPaid >= booking.grandTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";

    if (!booking.orderId) booking.orderId = `ORD-${Date.now()}`;

    await booking.save();
    const populated = await booking.populate([
      { path: "customerId roomId" },
      { path: "services.serviceId", select: "name category" },
      { path: "services.durationId", select: "durationMinutes" },
      { path: "mocktails.mocktailId", select: "name" },
    ]);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};
// getBookingById — add populate chain
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("timeSlot customerId roomId")
      .populate("services.serviceId", "name category")
      .populate("services.durationId", "durationMinutes")
      .populate("mocktails.mocktailId", "name");
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// getAdminBookings — same additions
export const getAdminBookings = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const filter = {};
    if (status) filter.bookingStatus = status;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.bookingDate = { $gte: start, $lte: end };
    }
    const bookings = await Booking.find(filter)
      .populate("timeSlot customerId roomId")
      .populate("services.serviceId", "name category")
      .populate("services.durationId", "durationMinutes")
      .populate("mocktails.mocktailId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};


export const updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus, roomId, roomType } = req.body; // roomType: "standard" | "vip", optional
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };

    if (bookingStatus === "completed") {
      const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = booking.grandTotal - totalPaid;
      if (outstanding > 0) {
        throw { statusCode: 400, message: `Cannot complete — ₹${outstanding} still unpaid. Collect payment first.` };
      }
    }

if (bookingStatus === "cancelled") {
      await AddonOrder.updateMany(
        { bookingId: booking._id, status: { $ne: "delivered" } }, // don't touch already-delivered items
        { status: "cancelled" }
      );

      // Auto-reverse membership credit ONLY if the booking never reached "completed" —
      // service was never delivered, so there's nothing to keep the deduction for.
      // A booking cancelled AFTER completion is a refund case, not a cancellation case,
      // and stays untouched here (refunds are out of scope per current business rules).
      // Idempotent: re-cancelling (or double-clicking) never double-reverses.
      if (booking.bookingStatus !== "completed" && booking.bookingStatus !== "cancelled") {
        const membershipPayments = booking.paymentHistory.filter(
          (p) => p.method === "membership_credit" && p.membershipTxnId
        );
        for (const payment of membershipPayments) {
          await reverseMembershipDeduction({
            originalTransactionId: payment.membershipTxnId,
            performedBy: req.admin?.id || null,
          });
        }
      }
    }
    booking.bookingStatus = bookingStatus;
    if (bookingStatus === "in-service" && !booking.roomId) {
      const assigned = roomId || (await assignAvailableRoom(roomType));
      if (!assigned) {
        throw { statusCode: 400, message: `No available ${roomType || ""} room right now.` };
      }
      booking.roomId = assigned;
     // Backfill the room onto this booking's initial Live-Orders card, which was
     // created without a room at checkout time (see createBooking).
     await AddonOrder.updateMany(
       { bookingId: booking._id, source: "initial", roomId: null },
       { $set: { roomId: assigned } }
     );
    }

    await booking.save();
    const populated = await booking.populate("timeSlot customerId roomId");
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};
// GET /api/bookings/active?mobileNumber=...
export const findActiveBooking = async (req, res, next) => {
  try {
    const { mobileNumber } = req.query;
    if (!mobileNumber) throw { statusCode: 400, message: "mobileNumber is required" };

    const customer = await Customer.findOne({ mobileNumber });
    if (!customer) throw { statusCode: 404, message: "No customer found with this mobile number" };

    const { start, end } = getTodayRange();
    const booking = await Booking.findOne({
      customerId: customer._id,
      bookingDate: { $gte: start, $lte: end },
      bookingStatus: { $in: ["waiting", "in-service"] }, // only ongoing sessions, not completed/cancelled
    })
      .populate("timeSlot roomId")
      .sort({ createdAt: -1 });

    if (!booking) throw { statusCode: 404, message: "No active booking found for today" };
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/add-items
export const addItemsToBooking = async (req, res, next) => {
  try {
    const { services = [], mocktails = [] } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (["completed", "cancelled"].includes(booking.bookingStatus)) {
      throw { statusCode: 400, message: "This booking is closed — cannot add more items" };
    }

    const { resolvedServices, resolvedMocktails } = await resolvePricing({
      services, mocktails, customerId: booking.customerId,
    });

    booking.services.push(...resolvedServices);
    booking.mocktails.push(...resolvedMocktails); // each add-on is its own line item, same as initial checkout — no merging, keeps ordering history clear

    let discountPercent = 0;
    if (booking.couponUsed) {
      const coupon = await Coupon.findById(booking.couponUsed);
      if (coupon) discountPercent = coupon.discountPercent;
    }

    const servicesTotal = booking.services.reduce((sum, s) => sum + s.price, 0);
const mocktailsTotal = booking.mocktails.reduce((sum, m) => sum + m.price, 0);
const totals = calculateTotals({ servicesTotal, mocktailsTotal, discountPercent, gstRate: GST_RATE });

booking.subtotal = totals.subtotal;
booking.gst = totals.gst;
booking.discount = totals.discount;
booking.grandTotal = totals.grandTotal;

// Recompute payment status AFTER grandTotal reflects the new items
const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
booking.paymentStatus = totalPaid >= booking.grandTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";
await booking.save();
const populated = await booking.populate([
  { path: "customerId roomId" },
  { path: "services.serviceId", select: "name category" },
  { path: "services.durationId", select: "durationMinutes" },
  { path: "mocktails.mocktailId", select: "name" },
]);
res.json({ success: true, data: populated });  } catch (err) { next(err); }
};

// GET /api/bookings/by-room/:roomId
export const findBookingByRoom = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      roomId: req.params.roomId,
      bookingStatus: "in-service",
    })
      .populate("customerId roomId")
      .populate("services.serviceId", "name category")
      .populate("services.durationId", "durationMinutes")
      .populate("mocktails.mocktailId", "name");

    if (!booking) throw { statusCode: 404, message: "No active session in this room right now" };
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/razorpay-order   { amount }
// amount = whatever is being charged RIGHT NOW (full total, a delta, or a partial) — never assume grandTotal
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (["completed", "cancelled"].includes(booking.bookingStatus)) {
      throw { statusCode: 400, message: "This booking is closed" };
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise, not rupees
      currency: "INR",
      receipt: `${booking.bookingNumber}-${Date.now()}`,
      notes: { bookingId: booking._id.toString(), bookingNumber: booking.bookingNumber },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // safe to expose — this is the public key
      },
    });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/verify-payment
// { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw { statusCode: 400, message: "Payment verification failed — signature mismatch" };
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };

    booking.paymentHistory.push({ amount, method: "razorpay", reference: razorpay_payment_id });
    const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    booking.paymentStatus = totalPaid >= booking.grandTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";
    if (!booking.orderId) booking.orderId = razorpay_order_id;

    await booking.save();
    const populated = await booking.populate([
      { path: "customerId roomId" },
      { path: "services.serviceId", select: "name category" },
      { path: "services.durationId", select: "durationMinutes" },
      { path: "mocktails.mocktailId", select: "name" },
    ]);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};


// Shared: figures out what the new grand total WOULD be if these items were added,
// without writing anything to the database yet.
const computeAddonDelta = async (booking, services, mocktails) => {
  const { resolvedServices, resolvedMocktails } = await resolvePricing({
    services, mocktails, customerId: booking.customerId,
  });

  let discountPercent = 0;
  if (booking.couponUsed) {
    const coupon = await Coupon.findById(booking.couponUsed);
    if (coupon) discountPercent = coupon.discountPercent;
  }

  const existingServicesTotal = booking.services.reduce((sum, s) => sum + s.price, 0);
  const existingMocktailsTotal = booking.mocktails.reduce((sum, m) => sum + m.price, 0);
  const newServicesTotal = existingServicesTotal + resolvedServices.reduce((sum, s) => sum + s.price, 0);
  const newMocktailsTotal = existingMocktailsTotal + resolvedMocktails.reduce((sum, m) => sum + m.price, 0);

  const newTotals = calculateTotals({
    servicesTotal: newServicesTotal, mocktailsTotal: newMocktailsTotal, discountPercent, gstRate: GST_RATE,
  });

  const delta = newTotals.grandTotal - booking.grandTotal;
  return { resolvedServices, resolvedMocktails, newTotals, delta };
};

// POST /api/bookings/:id/addon-order   { services, mocktails }
// Creates a Razorpay order for exactly the delta these items would cost — nothing saved yet.
export const createAddonOrder = async (req, res, next) => {
  try {
    const { services = [], mocktails = [] } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (["completed", "cancelled"].includes(booking.bookingStatus)) {
      throw { statusCode: 400, message: "This booking is closed" };
    }

    const { delta } = await computeAddonDelta(booking, services, mocktails);
    if (delta <= 0) throw { statusCode: 400, message: "Invalid add-on amount" };

    const order = await razorpay.orders.create({
      amount: Math.round(delta * 100),
      currency: "INR",
      receipt: `${booking.bookingNumber}-addon-${Date.now()}`,
      notes: { bookingId: booking._id.toString(), type: "addon" },
    });

    res.json({
      success: true,
      data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, delta },
    });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/addon-confirm
// { services, mocktails, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies payment FIRST — only writes the items to the booking if verification passes.

export const confirmAddonPayment = async (req, res, next) => {
  try {
    const { services = [], mocktails = [], razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      throw { statusCode: 400, message: "Payment verification failed — item not added." };
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (!booking.roomId) throw { statusCode: 400, message: "Booking has no room assigned." };

    const { resolvedServices, resolvedMocktails, newTotals, delta } = await computeAddonDelta(booking, services, mocktails);

    booking.services.push(...resolvedServices);
    booking.mocktails.push(...resolvedMocktails);
    booking.subtotal = newTotals.subtotal;
    booking.gst = newTotals.gst;
    booking.discount = newTotals.discount;
    booking.grandTotal = newTotals.grandTotal;
    booking.paymentHistory.push({ amount: delta, method: "razorpay", reference: razorpay_payment_id });

    const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    booking.paymentStatus = totalPaid >= booking.grandTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await booking.save();

    const populated = await booking.populate([
      { path: "customerId roomId" },
      { path: "services.serviceId", select: "name name_kn category" },
      { path: "services.durationId", select: "durationMinutes" },
      { path: "mocktails.mocktailId", select: "name name_kn category" },
    ]);

    // Build the fulfillment record from exactly the items just added — sliced from
    // the tail of each array since resolvedServices/resolvedMocktails were appended
    // above, in that order. This is what makes "just-added" items distinguishable
    // from the original checkout items, which the raw booking arrays alone can't do.
    const newServiceItems = resolvedServices.length > 0 ? populated.services.slice(-resolvedServices.length) : [];
    const newMocktailItems = resolvedMocktails.length > 0 ? populated.mocktails.slice(-resolvedMocktails.length) : [];

    const orderItems = [
      ...newServiceItems.map((s) => ({
        type: "service", refId: s.serviceId._id, name: s.serviceId.name, price: s.price, qty: 1,
      })),
      ...newMocktailItems.map((m) => ({
        type: "mocktail", refId: m.mocktailId._id, name: m.mocktailId.name, price: m.price, qty: m.qty,
      })),
    ];

    await AddonOrder.create({ bookingId: booking._id, roomId: booking.roomId, items: orderItems, amount: delta });

    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};
// PATCH /api/admin/bookings/:id/reassign-room   { roomId }
export const reassignRoom = async (req, res, next) => {
  try {
    const { roomId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (booking.bookingStatus !== "in-service") {
      throw { statusCode: 400, message: "Can only reassign a room for a booking currently in-service." };
    }

    // Same safety check as check-in: don't allow moving into a room someone else occupies
    const occupied = await Booking.findOne({
  _id: { $ne: booking._id },
  roomId,
  bookingStatus: "in-service",
  bookingDate: { $gte: start, $lte: end }, // add this, using getTodayRange() imported at top
});
    if (occupied) throw { statusCode: 400, message: "That room is already occupied by another customer." };

    booking.roomId = roomId;
    await booking.save();
      await AddonOrder.updateMany(
     { bookingId: booking._id, source: "initial" },
     { $set: { roomId } }
   );
    const populated = await booking.populate("timeSlot customerId roomId");
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};


// GET /api/bookings/room/:roomId/membership
// Public — used by the in-room QR add-on page to show balance before payment.
export const getRoomMembership = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      roomId: req.params.roomId,
      bookingStatus: "in-service",
    }).select("customerId");
    if (!booking) return res.json({ success: true, data: null });

    const membership = await findMembershipByCustomerId(booking.customerId);
    if (!membership) return res.json({ success: true, data: null });

    res.json({ success: true, data: { id: membership._id, tier: membership.tier, balance: membership.balance, status: membership.status } });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/addon-confirm-membership   { services, mocktails }
// Public, parallel to confirmAddonPayment — no Razorpay signature needed because
// the "verification" here is the membership balance check itself (server-side,
// atomic, can't go negative). The booking's customerId is fixed server-side —
// there's no field in the request body that lets a caller pick whose balance
// gets charged, so this can't be redirected to someone else's membership.
export const confirmAddonPaymentWithMembership = async (req, res, next) => {
  try {
    const { services = [], mocktails = [] } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    if (!booking.roomId) throw { statusCode: 400, message: "Booking has no room assigned." };
    if (["completed", "cancelled"].includes(booking.bookingStatus)) {
      throw { statusCode: 400, message: "This booking is closed" };
    }

    const membership = await findMembershipByCustomerId(booking.customerId);
    if (!membership) throw { statusCode: 400, message: "No membership found for this booking." };

    const { resolvedServices, resolvedMocktails, newTotals, delta } = await computeAddonDelta(booking, services, mocktails);
    if (delta <= 0) throw { statusCode: 400, message: "Invalid add-on amount" };

    // Throws a clean {statusCode:400, message:"Insufficient membership balance..."}
    // if balance is short — nothing below this line runs, booking stays untouched.
    const { transaction } = await deductCredit({
      membershipId: membership._id,
      amount: delta,
      type: "addon_deduction",
      // performedBy left null — this is a customer self-service transaction,
      // not staff-initiated. The ledger row still records everything else.
      performedBy: null,
    });

    booking.services.push(...resolvedServices);
    booking.mocktails.push(...resolvedMocktails);
    booking.subtotal = newTotals.subtotal;
    booking.gst = newTotals.gst;
    booking.discount = newTotals.discount;
    booking.grandTotal = newTotals.grandTotal;
    booking.paymentHistory.push({
      amount: delta, method: "membership_credit", reference: membership.membershipId, membershipTxnId: transaction._id,
    });

    const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    booking.paymentStatus = totalPaid >= booking.grandTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";
    await booking.save();

    const populated = await booking.populate([
      { path: "customerId roomId" },
      { path: "services.serviceId", select: "name name_kn category" },
      { path: "services.durationId", select: "durationMinutes" },
      { path: "mocktails.mocktailId", select: "name name_kn category" },
    ]);

    const newServiceItems = resolvedServices.length > 0 ? populated.services.slice(-resolvedServices.length) : [];
    const newMocktailItems = resolvedMocktails.length > 0 ? populated.mocktails.slice(-resolvedMocktails.length) : [];
    const orderItems = [
      ...newServiceItems.map((s) => ({ type: "service", refId: s.serviceId._id, name: s.serviceId.name, price: s.price, qty: 1 })),
      ...newMocktailItems.map((m) => ({ type: "mocktail", refId: m.mocktailId._id, name: m.mocktailId.name, price: m.price, qty: m.qty })),
    ];
    await AddonOrder.create({ bookingId: booking._id, roomId: booking.roomId, items: orderItems, amount: delta });

    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
};