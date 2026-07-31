import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    discountPercent: { type: Number, required: true, default: 10 },
    isUsed: { type: Boolean, default: false },
    linkedReviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Coupon", couponSchema);
