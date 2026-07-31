import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true }, // e.g. "10:00 AM"
    maxCapacity: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
    isDisabledToday: { type: Boolean, default: false }, // reset daily via cron
  },
  { timestamps: true }
);

export default mongoose.model("TimeSlot", timeSlotSchema);
