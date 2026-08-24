import mongoose from "mongoose";

// Immutable ledger row. One row per credit-affecting event, ever.
// This is what answers "where did I spend, and how much" — never reconstruct
// that answer from the Membership.balance field alone.
const membershipTransactionSchema = new mongoose.Schema(
  {
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", required: true, index: true },
     type: {
      type: String,
      enum: ["purchase", "recharge", "service_deduction", "addon_deduction", "manual_adjustment", "cancellation_reversal"],
      required: true,
    },
    amount: { type: Number, required: true }, // ALWAYS signed: positive = credit added, negative = credit spent
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipPackage", default: null }, // purchase/recharge
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },            // service_deduction
    addonOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "AddonOrder", default: null },      // addon_deduction

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = customer self-service (in-room QR flow)
    reason: { type: String, default: "" }, // required (enforced in service layer) for manual_adjustment

    amountPaid: { type: Number, default: null }, // for purchase/recharge — actual ₹ the customer handed over
reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipTransaction", default: null }, // set only on cancellation_reversal rows  
},
  { timestamps: { createdAt: true, updatedAt: false } }
);

membershipTransactionSchema.index({ membershipId: 1, createdAt: -1 });

export default mongoose.model("MembershipTransaction", membershipTransactionSchema);