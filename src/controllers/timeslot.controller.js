import TimeSlot from "../models/TimeSlot.js";
import Booking from "../models/Booking.js";
import { getTodayRange } from "../utils/generateIds.js";

export const getAvailableToday = async (req, res, next) => {
  try {
    const slots = await TimeSlot.find({ isActive: true, isDisabledToday: false }).sort({ time: 1 });
    const { start, end } = getTodayRange();

    const counts = await Booking.aggregate([
      { $match: { bookingDate: { $gte: start, $lte: end }, bookingStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    const available = slots
      .filter((s) => (countMap[s._id.toString()] || 0) < s.maxCapacity)
      .map((s) => ({ ...s.toObject(), booked: countMap[s._id.toString()] || 0 }));

    res.json({ success: true, data: available });
  } catch (err) { next(err); }
};

export const updateTimeSlot = async (req, res, next) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slot) throw { statusCode: 404, message: "Time slot not found" };
    res.json({ success: true, data: slot });
  } catch (err) { next(err); }
};

export const createTimeSlot = async (req, res, next) => {
  try {
    const slot = await TimeSlot.create(req.body);
    res.status(201).json({ success: true, data: slot });
  } catch (err) { next(err); }
};

export const getAllTimeSlotsAdmin = async (req, res, next) => {
  try {
    const slots = await TimeSlot.find().sort({ time: 1 }); // no isActive/isDisabledToday filter
    res.json({ success: true, data: slots });
  } catch (err) { next(err); }
};