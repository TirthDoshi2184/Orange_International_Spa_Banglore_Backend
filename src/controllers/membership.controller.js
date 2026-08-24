import Membership from "../models/Membership.js";
import MembershipPackage from "../models/MembershipPackage.js";
import MembershipTransaction from "../models/MembershipTransaction.js";
import Customer from "../models/Customer.js";
import {
  enrollMembership,
  rechargeMembership,
  manualAdjustment,
} from "../services/membership.services.js";

// ---- Packages ----

export const getPackages = async (req, res, next) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const packages = await MembershipPackage.find(filter).sort({ sortOrder: 1, price: 1 });
    res.json({ success: true, data: packages });
  } catch (err) { next(err); }
};

export const createPackage = async (req, res, next) => {
  try {
    const pkg = await MembershipPackage.create(req.body);
    res.status(201).json({ success: true, data: pkg });
  } catch (err) { next(err); }
};

export const updatePackage = async (req, res, next) => {
  try {
    const pkg = await MembershipPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pkg) throw { statusCode: 404, message: "Package not found" };
    res.json({ success: true, data: pkg });
  } catch (err) { next(err); }
};

// ---- Memberships ----

export const createMembership = async (req, res, next) => {
  try {
    const { customer, packageId, amountPaid, paymentMethod, reference } = req.body;
    const result = await enrollMembership({
      customer, packageId, amountPaid, paymentMethod, reference,
      performedBy: req.admin.id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const rechargeMembershipHandler = async (req, res, next) => {
  try {
    const { packageId, amountPaid, paymentMethod, reference } = req.body;
    const result = await rechargeMembership({
      membershipId: req.params.id, packageId, amountPaid, paymentMethod, reference,
      performedBy: req.admin.id,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const adjustMembershipHandler = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const result = await manualAdjustment({
      membershipId: req.params.id, amount, reason, performedBy: req.admin.id,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/admin/memberships/search?phone=...&name=...&membershipId=...
export const searchMembership = async (req, res, next) => {
  try {
    const { phone, name, membershipId } = req.query;

    let customerFilter = null;
    if (phone || name) {
      customerFilter = {};
      if (phone) customerFilter.mobileNumber = { $regex: phone, $options: "i" };
      if (name) customerFilter.name = { $regex: name, $options: "i" };
    }

    let membershipFilter = {};
    if (membershipId) membershipFilter.membershipId = { $regex: membershipId, $options: "i" };

    if (customerFilter) {
      const customers = await Customer.find(customerFilter).select("_id");
      membershipFilter.customerId = { $in: customers.map((c) => c._id) };
    }

    const memberships = await Membership.find(membershipFilter)
      .populate("customerId", "name mobileNumber email")
      .populate("packageId", "name price creditAmount")
      .sort({ updatedAt: -1 })
      .limit(25);

    res.json({ success: true, data: memberships });
  } catch (err) { next(err); }
};

// GET /api/admin/memberships/:id  — full detail + transaction history
export const getMembershipDetail = async (req, res, next) => {
  try {
    const membership = await Membership.findById(req.params.id)
      .populate("customerId", "name mobileNumber email")
      .populate("packageId", "name price creditAmount validityDays");
    if (!membership) throw { statusCode: 404, message: "Membership not found" };

    const transactions = await MembershipTransaction.find({ membershipId: membership._id })
      .populate("performedBy", "name email")
      .populate("packageId", "name")
      .populate("bookingId", "bookingNumber")
      .populate("addonOrderId", "_id")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { membership, transactions } });
  } catch (err) { next(err); }
};

// GET /api/admin/customers/:customerId/membership — used by CustomerProfile & ReceptionCheckout
export const getMembershipByCustomer = async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ customerId: req.params.customerId })
      .populate("packageId", "name price creditAmount");
    res.json({ success: true, data: membership || null });
  } catch (err) { next(err); }
};