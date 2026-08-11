import Booking from "../models/Booking.js";
import Room from "../models/Rooms.js";

export const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
};

export const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (err) { next(err); }
};

export const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) throw { statusCode: 404, message: "Room not found" };
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
};

// GET /api/admin/rooms/availability
import { getTodayRange } from "../utils/generateIds.js";

export const getRoomAvailability = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isActive: true });
    const { start, end } = getTodayRange();

    const occupied = await Booking.find({
      bookingStatus: "in-service",
      bookingDate: { $gte: start, $lte: end }, // ← same fix here
    }).select("roomId");

    const occupiedIds = new Set(occupied.map((b) => b.roomId.toString()));
    const withStatus = rooms.map((r) => ({
      _id: r._id, name: r.name, type: r.type, isOccupied: occupiedIds.has(r._id.toString()),
    }));

    res.json({ success: true, data: withStatus });
  } catch (err) { next(err); }
};

export const deleteRoom = async (req, res, next) => {
  try {
    // Guard: don't allow deleting a room that's currently in use —
    // would leave an in-service booking pointing at a room that no longer exists
    const activeBooking = await Booking.findOne({ roomId: req.params.id, bookingStatus: "in-service" });
    if (activeBooking) {
      throw { statusCode: 400, message: "Cannot delete — this room is currently occupied." };
    }

    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) throw { statusCode: 404, message: "Room not found" };
    res.json({ success: true, message: "Room deleted" });
  } catch (err) { next(err); }
};