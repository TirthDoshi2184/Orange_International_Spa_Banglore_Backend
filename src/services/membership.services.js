import mongoose from "mongoose";
import Membership from "../models/Membership.js";
import MembershipTransaction from "../models/MembershipTransaction.js";
import MembershipPackage from "../models/MembershipPackage.js";
import Customer from "../models/Customer.js";
import { generateMembershipId } from "../utils/generateIds.js";

const err = (statusCode, message) => ({ statusCode, message });

const expiryDateFor = (pkg) =>
  pkg.validityDays ? new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000) : null;

const isExpired = (membership) =>
  membership.expiresAt ? membership.expiresAt.getTime() < Date.now() : false;

// Runs `work(session)` inside a Mongo transaction. Requires a replica-set /
// Atlas deployment (standard for production Mongo). If your deployment is a
// single standalone mongod, transactions aren't supported — tell me and I'll
// swap this for the non-transactional fallback (the $inc balance guard below
// still prevents negative/double-spent balances either way; only the "ledger
// row + balance update happen-together" guarantee needs a transaction).
const runInTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    session.endSession();
  }
};

/**
 * Create a new membership for a customer (Q9-A: exactly one membership per customer).
 * If the customer already has one, this throws — use rechargeMembership/upgrade instead.
 */
export const enrollMembership = async ({ customer, packageId, amountPaid, paymentMethod, reference, performedBy }) => {
  return runInTransaction(async (session) => {
    const pkg = await MembershipPackage.findOne({ _id: packageId, isActive: true }).session(session);
    if (!pkg) throw err(400, "Selected package is not available");

    let customerDoc = await Customer.findOne({ mobileNumber: customer.mobileNumber }).session(session);
    if (!customerDoc) {
      customerDoc = (await Customer.create([{ ...customer }], { session }))[0];
    }
    if (customerDoc.membershipId) {
      throw err(400, "This customer already has a membership. Use recharge instead.");
    }

    const membershipId = await generateMembershipId();
    const balanceAfter = pkg.creditAmount;

    const created = await Membership.create(
      [
        {
          membershipId,
          customerId: customerDoc._id,
          packageId: pkg._id,
          tier: pkg.name,
          balance: balanceAfter,
          totalCreditEver: balanceAfter,
          totalUsedEver: 0,
          status: "active",
          expiresAt: expiryDateFor(pkg),
        },
      ],
      { session }
    );
    const membership = created[0];

    const txn = await MembershipTransaction.create(
      [
        {
          membershipId: membership._id,
          type: "purchase",
          amount: balanceAfter,
          balanceBefore: 0,
          balanceAfter,
          packageId: pkg._id,
          performedBy,
          amountPaid,
        },
      ],
      { session }
    );

    customerDoc.membershipId = membership._id;
    await customerDoc.save({ session });

    return { membership, transaction: txn[0], customer: customerDoc, package: pkg };
  });
};

/**
 * Recharge/top-up an existing membership. Uses the SAME package price->credit
 * table as enrollment (Q7-A/Q8: predefined amounts only, same bonus ratio).
 * Also upgrades tier if a higher package is chosen (Q10-A).
 */
export const rechargeMembership = async ({ membershipId, packageId, amountPaid, paymentMethod, reference, performedBy }) => {
  return runInTransaction(async (session) => {
    const pkg = await MembershipPackage.findOne({ _id: packageId, isActive: true }).session(session);
    if (!pkg) throw err(400, "Selected package is not available");

    const membership = await Membership.findById(membershipId).session(session);
    if (!membership) throw err(404, "Membership not found");

    const balanceBefore = membership.balance;
    const balanceAfter = balanceBefore + pkg.creditAmount;

    membership.balance = balanceAfter;
    membership.totalCreditEver += pkg.creditAmount;
    membership.tier = pkg.name;         // tier reflects most recent package purchased
    membership.packageId = pkg._id;
    membership.status = "active";
    membership.expiresAt = expiryDateFor(pkg); // recharge resets validity window to the new package's term
    await membership.save({ session });

    const txn = await MembershipTransaction.create(
      [
        {
          membershipId: membership._id,
          type: "recharge",
          amount: pkg.creditAmount,
          balanceBefore,
          balanceAfter,
          packageId: pkg._id,
          performedBy,
          amountPaid,
        },
      ],
      { session }
    );

    return { membership, transaction: txn[0] };
  });
};

/**
 * Deduct credit for a service bill or an add-on. Atomic + guarded so two
 * concurrent deductions can never push balance below zero (§22/§23).
 * type must be "service_deduction" or "addon_deduction".
 */
export const deductCredit = async ({ membershipId, amount, type, bookingId = null, addonOrderId = null, performedBy }) => {
  if (!["service_deduction", "addon_deduction"].includes(type)) {
    throw err(500, "Invalid deduction type");
  }
  if (!amount || amount <= 0) throw err(400, "Invalid deduction amount");

  return runInTransaction(async (session) => {
    const membership = await Membership.findById(membershipId).session(session);
    if (!membership) throw err(404, "Membership not found");
    if (membership.status !== "active") throw err(400, `Membership is ${membership.status}`);
    if (isExpired(membership)) {
      membership.status = "expired";
      await membership.save({ session });
      throw err(400, "Membership credit has expired");
    }

    if (membership.balance < amount) {
      // Hard reject per Q3-A — no partial deduction, no negative balance, ever.
      const shortfall = amount - membership.balance;
      throw err(400, `Insufficient membership balance. Available: ₹${membership.balance}, Required: ₹${amount}, Shortfall: ₹${shortfall}`);
    }

    // Atomic guarded decrement — belt-and-braces alongside the transaction:
    // even outside a transaction this line alone prevents a race from ever
    // taking balance negative, because Mongo evaluates the $gte filter and
    // the $inc in one atomic document operation.
    const updated = await Membership.findOneAndUpdate(
      { _id: membershipId, balance: { $gte: amount } },
      { $inc: { balance: -amount, totalUsedEver: amount } },
      { new: true, session }
    );
    if (!updated) {
      throw err(400, "Insufficient membership balance (concurrent transaction detected)");
    }

    const balanceBefore = updated.balance + amount;
    const txn = await MembershipTransaction.create(
      [
        {
          membershipId: updated._id,
          type,
          amount: -amount,
          balanceBefore,
          balanceAfter: updated.balance,
          bookingId,
          addonOrderId,
          performedBy,
        },
      ],
      { session }
    );

    return { membership: updated, transaction: txn[0] };
  });
};

/**
 * Manual balance correction by admin. Requires a reason. Signed amount:
 * positive = add credit, negative = remove credit. Never allowed to push
 * balance below zero.
 */
export const manualAdjustment = async ({ membershipId, amount, reason, performedBy }) => {
  if (!amount || amount === 0) throw err(400, "Adjustment amount cannot be zero");
  if (!reason || !reason.trim()) throw err(400, "A reason is required for manual adjustments");

  return runInTransaction(async (session) => {
    const membership = await Membership.findById(membershipId).session(session);
    if (!membership) throw err(404, "Membership not found");

    if (amount < 0 && membership.balance + amount < 0) {
      throw err(400, `Cannot deduct ₹${Math.abs(amount)} — balance is only ₹${membership.balance}`);
    }

    const balanceBefore = membership.balance;
    const balanceAfter = balanceBefore + amount;

    membership.balance = balanceAfter;
    if (amount > 0) membership.totalCreditEver += amount;
    else membership.totalUsedEver += Math.abs(amount);
    await membership.save({ session });

    const txn = await MembershipTransaction.create(
      [
        {
          membershipId: membership._id,
          type: "manual_adjustment",
          amount,
          balanceBefore,
          balanceAfter,
          performedBy,
          reason: reason.trim(),
        },
      ],
      { session }
    );

    return { membership, transaction: txn[0] };
  });
};

export const findMembershipByCustomerId = (customerId) => Membership.findOne({ customerId });

/**
 * Reverses a single service/add-on deduction — used when a booking is cancelled
 * BEFORE it reached "completed" (i.e. service was never delivered). Idempotent:
 * calling this twice for the same original transaction is a no-op the second time,
 * so accidental double-cancellation clicks can't double-refund the balance.
 */
export const reverseMembershipDeduction = async ({ originalTransactionId, performedBy }) => {
  return runInTransaction(async (session) => {
    const original = await MembershipTransaction.findById(originalTransactionId).session(session);
    if (!original) throw err(404, "Original membership transaction not found");
    if (!["service_deduction", "addon_deduction"].includes(original.type)) {
      throw err(400, "Only service/add-on deductions can be reversed via cancellation");
    }

    const alreadyReversed = await MembershipTransaction.findOne({
      type: "cancellation_reversal",
      reversalOf: original._id,
    }).session(session);
    if (alreadyReversed) return { alreadyReversed: true, transaction: alreadyReversed };

    const membership = await Membership.findById(original.membershipId).session(session);
    if (!membership) throw err(404, "Membership not found");

    const amount = Math.abs(original.amount); // original.amount is stored negative for deductions
    const balanceBefore = membership.balance;
    const balanceAfter = balanceBefore + amount;

    membership.balance = balanceAfter;
    membership.totalUsedEver = Math.max(0, membership.totalUsedEver - amount);
    await membership.save({ session });

    const txn = await MembershipTransaction.create(
      [
        {
          membershipId: membership._id,
          type: "cancellation_reversal",
          amount,
          balanceBefore,
          balanceAfter,
          bookingId: original.bookingId,
          addonOrderId: original.addonOrderId,
          performedBy,
          reason: "Booking cancelled before service — credit reversed",
          reversalOf: original._id,
        },
      ],
      { session }
    );

    return { membership, transaction: txn[0] };
  });
};