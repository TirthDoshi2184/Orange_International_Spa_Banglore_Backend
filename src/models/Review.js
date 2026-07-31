import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    whatsappRepliedDone: { type: Boolean, default: false },
    adminVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    couponIssued: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
