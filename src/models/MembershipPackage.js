import mongoose from "mongoose";

const membershipPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // "Silver" | "Gold" | "Platinum" | custom
    price: { type: Number, required: true, min: 1 },           // what the customer pays
    creditAmount: { type: Number, required: true, min: 1 },    // what balance they receive (bonus baked in)
    validityDays: { type: Number, default: null, min: 1 },     // null = never expires
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("MembershipPackage", membershipPackageSchema);