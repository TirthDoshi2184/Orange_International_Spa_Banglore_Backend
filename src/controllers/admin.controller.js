import Booking from "../models/Booking.js";
import Coupon from "../models/Coupon.js";
import { getTodayRange } from "../utils/generateIds.js";

export const getDashboardStats = async (req, res, next) => {
  try {
 const { start, end } = getTodayRange();
    const todayFilter = { bookingDate: { $gte: start, $lte: end } };
    const activeTodayFilter = { ...todayFilter, bookingStatus: { $ne: "cancelled" } }; // excludes cancelled from "what actually happened today" stats
    const [
  todaysBookings,
  pendingCount,
  completedCount,
  cancelledCount,
  inServiceCount,
  revenueAgg,
  distinctCustomersToday,
  couponsIssued,
  couponsRedeemed,
  popularServices,
  popularMocktails,
  peakHours,
] = await Promise.all([
  Booking.countDocuments(todayFilter),
  Booking.countDocuments({ ...todayFilter, bookingStatus: "waiting" }),
  Booking.countDocuments({ ...todayFilter, bookingStatus: "completed" }),
  Booking.countDocuments({ ...todayFilter, bookingStatus: "cancelled" }),
  Booking.countDocuments({ ...todayFilter, bookingStatus: "in-service" }),
    Booking.aggregate([
    { $match: activeTodayFilter },
    { $unwind: { path: "$paymentHistory", preserveNullAndEmptyArrays: false } },
    { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } },
  ]),
  Booking.distinct("customerId", todayFilter),
  Coupon.countDocuments({}),
  Coupon.countDocuments({ isUsed: true }),
            Booking.aggregate([
        { $match: activeTodayFilter },
        { $unwind: "$services" },
        { $group: { _id: "$services.serviceId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
        { $unwind: "$service" },
        { $project: { name: "$service.name", count: 1 } },
      ]),
      Booking.aggregate([
        { $match: activeTodayFilter },
        { $unwind: "$mocktails" },
        { $group: { _id: "$mocktails.mocktailId", count: { $sum: "$mocktails.qty" } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "mocktails", localField: "_id", foreignField: "_id", as: "mocktail" } },
        { $unwind: "$mocktail" },
        { $project: { name: "$mocktail.name", count: 1 } },
      ]),
      Booking.aggregate([
        { $match: activeTodayFilter },
        { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $lookup: { from: "timeslots", localField: "_id", foreignField: "_id", as: "slot" } },
        { $unwind: "$slot" },
        { $project: { time: "$slot.time", count: 1 } },
      ]),
        ]);

    res.json({
      success: true,
      data: {
        todaysBookings,
        todaysRevenue: revenueAgg[0]?.total || 0,
        uniqueCustomersToday: distinctCustomersToday.length,   // renamed from activeCustomers
        pendingBookings: pendingCount,
        inServiceBookings: inServiceCount,
        completedBookings: completedCount,
        cancelledBookings: cancelledCount,
        couponsIssued,
        couponsRedeemed,
        popularServices,
        popularMocktails,
        peakHours,
      },
    });
  } catch (err) { next(err); }
};

import { runDayEndCleanup } from "../jobs/dayEndCleanup.js";

export const triggerDayEndCleanup = async (req, res, next) => {
  try {
    const result = await runDayEndCleanup();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};