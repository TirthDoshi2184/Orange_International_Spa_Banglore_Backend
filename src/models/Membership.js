import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    membershipId: { type: String, required: true, unique: true, index: true }, // CV-MEM-000001
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipPackage", required: true },
    tier: { type: String, required: true }, // snapshot of package name at last purchase/upgrade

    // balance is the ONLY authoritative source of truth for "how much can be spent right now".
    // It is never set directly outside membership.service.js — always via atomic $inc.
    balance: { type: Number, required: true, default: 0, min: 0 },
amountDue: { type: Number, required: true, default: 0, min: 0 }, // unpaid portion of package price(s)
    totalCreditEver: { type: Number, required: true, default: 0 }, // lifetime credit ever added (purchase+recharge+positive adjustments)
    totalUsedEver: { type: Number, required: true, default: 0 },   // lifetime credit ever spent (service+addon deductions, positive adjustments-out)

    status: { type: String, enum: ["active", "inactive", "expired"], default: "active" },
    expiresAt: { type: Date, default: null }, // null = never expires

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export default mongoose.model("Membership", membershipSchema);