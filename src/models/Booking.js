import mongoose from "mongoose";

const bookingServiceItemSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    durationId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceDuration", required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const bookingMocktailItemSchema = new mongoose.Schema(
  {
    mocktailId: { type: mongoose.Schema.Types.ObjectId, ref: "Mocktail", required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

// ← moved above bookingSchema
const paymentEntrySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    method: { type: String, enum: ["cash", "card", "razorpay", "upi", "other", "membership_credit"], required: true },
    reference: { type: String },
    paidAt: { type: Date, default: Date.now },
    membershipTxnId: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipTransaction", default: null },
  },
  { _id: false }
);
const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    orderId: { type: String },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    services: [bookingServiceItemSchema],
    mocktails: [bookingMocktailItemSchema],
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
    bookingDate: { type: Date, required: true, default: Date.now },
    subtotal: { type: Number, required: true },
    gst: { type: Number, required: true, default: 0 },
        discount: { type: Number, required: true, default: 0 },
    manualDiscountPercent: { type: Number, default: 0 }, // % entered by reception at checkout, for receipt/audit display
  grandTotal: { type: Number, required: true },
    couponUsed: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    paymentStatus: { type: String, enum: ["pending", "partial", "paid", "failed"], default: "pending" },
    paymentRef: { type: String }, // legacy, superseded by paymentHistory — can remove if unused elsewhere
    bookingStatus: {
      type: String,
      enum: ["waiting", "in-service", "completed", "cancelled"],
      default: "waiting",
    },
    queueNumber: { type: Number, required: true },
    specialInstructions: { type: String },
    paymentHistory: [paymentEntrySchema],
     checkInTime: { type: Date, default: null }, // stamped when bookingStatus moves to "in-service" — used for the session countdown timer
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);  