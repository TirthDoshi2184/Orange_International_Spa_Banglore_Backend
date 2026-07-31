import Booking from "../models/Booking.js";
import Room from "../models/Rooms.js";

import Counter from "../models/Counter.js";
export const getTodayRange = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
};


export const generateBookingIdentifiers = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const counterId = `booking-${dateStr}`;

  // findOneAndUpdate with $inc is atomic at the MongoDB level — two simultaneous
  // requests can NEVER receive the same seq value, unlike countDocuments + 1.
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = counter.seq;
  const bookingNumber = `OS-${dateStr}-${String(seq).padStart(4, "0")}`;
  return { bookingNumber, queueNumber: seq };
};


export const assignAvailableRoom = async (type = null) => {
  const filter = { isActive: true };
  if (type) filter.type = type;

  const rooms = await Room.find(filter);
  if (rooms.length === 0) return null;

  const occupied = await Booking.find({ bookingStatus: "in-service", roomId: { $ne: null } }).select("roomId");
  const occupiedIds = new Set(occupied.map((b) => b.roomId.toString()));
  const freeRoom = rooms.find((r) => !occupiedIds.has(r._id.toString()));
  return freeRoom ? freeRoom._id : null;
};