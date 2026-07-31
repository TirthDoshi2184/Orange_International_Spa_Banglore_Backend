import Customer from "../models/Customer.js";
import Booking from "../models/Booking.js";
import Coupon from "../models/Coupon.js";

// GET /api/admin/customers?search=...
export const getAllCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { mobileNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const customers = await Customer.find(filter).sort({ createdAt: -1 });

    // Attach quick summary stats per customer (visit count + lifetime spend)
    // without requiring a separate request per row on the list screen.
    const customerIds = customers.map((c) => c._id);
    const bookingAgg = await Booking.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          visitCount: { $sum: 1 },
          totalSpent: { $sum: { $sum: "$paymentHistory.amount" } },
        },
      },
    ]);
    const statsMap = Object.fromEntries(bookingAgg.map((b) => [b._id.toString(), b]));

    const withStats = customers.map((c) => ({
      ...c.toObject(),
      visitCount: statsMap[c._id.toString()]?.visitCount || 0,
      totalSpent: statsMap[c._id.toString()]?.totalSpent || 0,
    }));

    res.json({ success: true, data: withStats });
  } catch (err) { next(err); }
};

// GET /api/admin/customers/:id
export const getCustomerProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw { statusCode: 404, message: "Customer not found" };

    const bookings = await Booking.find({ customerId: customer._id })
      .populate("timeSlot roomId")
      .populate("services.serviceId", "name category")
      .populate("services.durationId", "durationMinutes")
      .populate("mocktails.mocktailId", "name")
      .sort({ createdAt: -1 });

    const coupons = await Coupon.find({ customerId: customer._id }).sort({ createdAt: -1 });

    const totalSpent = bookings.reduce(
      (sum, b) => sum + b.paymentHistory.reduce((s, p) => s + p.amount, 0),
      0
    );

    res.json({
      success: true,
      data: {
        customer,
        bookings,
        coupons,
        stats: {
          visitCount: bookings.length,
          totalSpent,
        },
      },
    });
  } catch (err) { next(err); }
};