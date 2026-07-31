import crypto from "crypto";
import Coupon from "../models/Coupon.js";
import Customer from "../models/Customer.js";

const generateCouponCode = () => {
  // e.g. "SPA-7F3K9Q" — short, readable, easy for a customer to type at checkout
  const random = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `SPA-${random}`;
};

// GET /api/admin/coupons
export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .populate("customerId", "name mobileNumber")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
};

// POST /api/admin/coupons   { customerId, discountPercent, expiryDays }
export const createCouponManual = async (req, res, next) => {
  try {
    const { customerId, discountPercent, expiryDays } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) throw { statusCode: 404, message: "Customer not found" };

    // Retry on the rare chance of a code collision (codes are short, so not impossible)
    let code, attempts = 0;
    do {
      code = generateCouponCode();
      attempts++;
      const exists = await Coupon.findOne({ code });
      if (!exists) break;
    } while (attempts < 5);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiryDays || Number(process.env.COUPON_EXPIRY_DAYS) || 30));

    const coupon = await Coupon.create({
      code,
      customerId,
      discountPercent,
      expiryDate,
    });

    const populated = await coupon.populate("customerId", "name mobileNumber");
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};