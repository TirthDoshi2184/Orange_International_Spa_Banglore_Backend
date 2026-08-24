import Booking from "../models/Booking.js";
import Membership from "../models/Membership.js";
import MembershipTransaction from "../models/MembershipTransaction.js";


// GET /api/admin/reports/revenue-trend?days=7
export const getRevenueTrend = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await Booking.aggregate([
      { $match: { bookingDate: { $gte: start } } },
      { $unwind: { path: "$paymentHistory", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentHistory.paidAt" } },
          revenue: { $sum: "$paymentHistory.amount" },
          bookingsCount: { $addToSet: "$_id" },
        },
      },
      { $project: { date: "$_id", revenue: 1, bookingsCount: { $size: "$bookingsCount" }, _id: 0 } },
      { $sort: { date: 1 } },
    ]);

    // Fill in missing days as zero, so the chart doesn't have gaps for quiet days
    const filled = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = result.find((r) => r.date === dateStr);
      filled.push({ date: dateStr, revenue: found?.revenue || 0, bookingsCount: found?.bookingsCount || 0 });
    }

    res.json({ success: true, data: filled });
  } catch (err) { next(err); }
};

// GET /api/admin/reports/popular-services?days=30
export const getPopularServicesReport = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await Booking.aggregate([
      { $match: { bookingDate: { $gte: start } } },
      { $unwind: "$services" },
      { $group: { _id: "$services.serviceId", count: { $sum: 1 }, revenue: { $sum: "$services.price" } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: "$service" },
      { $project: { name: "$service.name", count: 1, revenue: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/admin/reports/peak-hours?days=30
export const getPeakHoursReport = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await Booking.aggregate([
      { $match: { bookingDate: { $gte: start } } },
      { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
      { $lookup: { from: "timeslots", localField: "_id", foreignField: "_id", as: "slot" } },
      { $unwind: "$slot" },
      { $project: { time: "$slot.time", count: 1, _id: 0 } },
      { $sort: { time: 1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};


// GET /api/admin/reports/membership-overview
export const getMembershipReport = async (req, res, next) => {
  try {
    const [byTier, totals, recharges, deductions, statusCounts] = await Promise.all([
      Membership.aggregate([
        { $group: { _id: "$tier", count: { $sum: 1 }, totalCredit: { $sum: "$totalCreditEver" } } },
      ]),
      Membership.aggregate([
        { $group: { _id: null, totalCreditSold: { $sum: "$totalCreditEver" }, totalUsed: { $sum: "$totalUsedEver" }, outstandingLiability: { $sum: "$balance" } } },
      ]),
      MembershipTransaction.aggregate([
        { $match: { type: "recharge" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      MembershipTransaction.aggregate([
        { $match: { type: { $in: ["service_deduction", "addon_deduction"] } } },
        { $group: { _id: "$type", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      ]),
      Membership.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      data: {
        byTier,
        totals: totals[0] || { totalCreditSold: 0, totalUsed: 0, outstandingLiability: 0 },
        rechargeTotal: recharges[0]?.total || 0,
        rechargeCount: recharges[0]?.count || 0,
        deductionsByType: deductions,
        statusCounts,
      },
    });
  } catch (err) { next(err); }
};