import mongoose from "mongoose";

const whatsAppLogSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    templateType: {
      type: String,
      enum: [
        "booking_confirmation",
        "payment_confirmation",
        "booking_reminder",
        "review_request",
        "coupon_delivery",
        "booking_cancellation",
        "booking_update",
      ],
      required: true,
    },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    sentAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("WhatsAppLog", whatsAppLogSchema);
