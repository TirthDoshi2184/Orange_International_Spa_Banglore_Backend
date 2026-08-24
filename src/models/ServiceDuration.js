import mongoose from "mongoose";

const serviceDurationSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    durationMinutes: { type: Number, required: true, enum: [30,45,60, 90,120] },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceDuration", serviceDurationSchema);
